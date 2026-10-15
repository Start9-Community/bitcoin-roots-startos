import { bitcoinCliArgs, ChainTip, GetBlockchainInfo } from './utils'

/**
 * Chain-split recovery for the shared `bitcoind` datadir.
 *
 * Derived from the implementation in the Bitcoin Knots pre-RDTS StartOS
 * package (MIT), where the same file is shared across the Knots flavors. Keep
 * the behavior in step with those copies; what differs here is that Roots is a
 * flavor that can NEVER enforce RDTS, so only one of the two directions below
 * is live and isRdtsEnforcing is not used.
 *
 * All bitcoind flavors (Bitcoin Core, Bitcoin Knots, Bitcoin Roots) share one
 * package id and one data volume, so a flavor switch carries the source
 * flavor's persisted per-block validity verdicts (CBlockIndex::nStatus,
 * serialized in blocks/index/) into the destination binary. Those verdicts are
 * trusted verbatim on startup — bitcoind never re-validates buried blocks
 * under the new binary's rules, and the persisted validity level does not
 * record which consensus rules produced it. Around a contentious BIP-110
 * (RDTS) chain split that inheritance would make the node follow the wrong
 * chain. The two directions are fixed in different places:
 *
 * - Leaving enforcement (switching to Roots, as here): RDTS-driven
 *   BLOCK_FAILED_VALID marks persist, so Roots refuses the most-work chain it
 *   would otherwise follow. The Roots binary knows nothing about RDTS and
 *   cannot recognize those verdicts as foreign, so the package clears them:
 *   `reconsiderblock` on each invalid chain tip (reconsiderInvalidTips), run by
 *   the flavor being switched *to*.
 * - Entering enforcement (switching away, to an RDTS Knots build): blocks
 *   connected while enforcement was off are cache-valid and never re-checked
 *   against RDTS. Knots ≥ 29.4 re-validates the RDTS-applicable range itself
 *   at startup, so the package does nothing there — and that is why
 *   current.ts's `^#knots:29.3` edge has an `up` but no `down`.
 *
 * Enforcement model: whether a node enforces RDTS is a property of the running
 * *binary*, not of configuration. Roots defines no `consensusrules` option at
 * all and never enforces, so this flavor hardcodes enforcement to false rather
 * than probing for it; it still records the `rdtsEnforcedLastRun` store marker
 * on every start, because that marker is what lets a non-enforcing flavor
 * recognize, on a later start, that the verdicts it inherited came from an
 * enforcing one.
 *
 * The remedy is a safe no-op when there is nothing to fix, and self-heals: a
 * reconsidered block that is still invalid under the running rules is simply
 * re-marked invalid when its reconnection is attempted, and the node settles
 * on the best remaining valid chain.
 */

/** A container that can run bitcoin-cli against the live bitcoind. */
export type CliRunner = {
  exec(
    cmd: string[],
    options?: undefined,
    timeoutMs?: number | null,
    abort?: AbortController,
  ): Promise<{
    exitCode: number | null
    exitSignal: NodeJS.Signals | null
    stdout: string | Buffer
    stderr: string | Buffer
  }>
}

export type CliOpts = { prune: boolean; abort?: AbortController }

const cli = async (
  subc: CliRunner,
  opts: CliOpts,
  ...cmd: string[]
): Promise<string> => {
  // exec SIGKILLs at 30 s by default, contradicting the flags below: every
  // call blocks through RPC warmup, and reconsiderblock reorgs synchronously.
  // opts.abort, raised when the service stops, is the bound instead.
  const res = await subc.exec(
    [
      ...bitcoinCliArgs({ prune: opts.prune }),
      '-rpcconnect=127.0.0.1',
      '-rpcwait',
      '-rpcclienttimeout=0',
      ...cmd,
    ],
    undefined,
    null,
    opts.abort,
  )
  if (res.exitCode !== 0) {
    throw new Error(
      res.exitSignal
        ? `bitcoin-cli ${cmd[0]} killed by ${res.exitSignal}`
        : `bitcoin-cli ${cmd[0]} failed (${res.exitCode}): ${String(res.stderr)}`,
    )
  }
  return String(res.stdout)
}

const cliJson = async <T>(
  subc: CliRunner,
  opts: CliOpts,
  ...cmd: string[]
): Promise<T> => JSON.parse(await cli(subc, opts, ...cmd)) as T

export type ReconsiderResult = {
  /** Tips whose failure flags were cleared. */
  reconsidered: ChainTip[]
  /** Invalid tips left alone: reorganizing onto them would disconnect
   *  active-chain blocks below the prune horizon, which bitcoind treats as
   *  a fatal error mid-reorg (node shutdown). */
  skippedPruned: ChainTip[]
}

/**
 * Clear persisted invalid-block verdicts on every invalid chain tip
 * (`reconsiderblock`), so the node re-evaluates those branches under the
 * *running* binary's rules and follows the best chain valid under them.
 * `reconsiderblock` clears BLOCK_FAILED_* on the block, its ancestors, and its
 * descendants (persisted), then ActivateBestChain re-connects through full
 * ConnectBlock validation — genuinely-invalid branches are re-marked on
 * reconnection. Clean no-op when there are no invalid tips.
 *
 * Pruning guard: reorganizing onto a reconsidered branch means disconnecting
 * the active chain down to the fork point (tip.height − branchlen). A pruned
 * node that no longer stores blocks down to that height would hit a fatal
 * disconnect failure during the reorg, so such tips are reported in
 * `skippedPruned` instead of reconsidered — recovery for them is a full
 * reindex (a re-download on pruned nodes). Residual hazard the guard cannot
 * close: when the reconsidered branch's data must still be fetched from peers,
 * the reorg happens later, and pruning may advance past the fork point in the
 * interim — an upstream reconsiderblock hazard no pre-check can eliminate;
 * instructions.md routes a stuck pruned node to Reindex Blockchain.
 */
export async function reconsiderInvalidTips(
  subc: CliRunner,
  opts: CliOpts,
): Promise<ReconsiderResult> {
  const result: ReconsiderResult = { reconsidered: [], skippedPruned: [] }
  // Re-fetch tips and chain info every iteration: each reconsiderblock can
  // reorg the active chain synchronously, which changes every other tip's
  // branchlen/fork-point math (and a genuinely-invalid tip re-flags itself
  // after its failed reconnection — the attempted-set stops us retrying it).
  const attempted = new Set<string>()
  while (true) {
    const tips = await cliJson<ChainTip[]>(subc, opts, 'getchaintips')
    const tip = tips.find(
      (t) => t.status === 'invalid' && !attempted.has(t.hash),
    )
    if (!tip) return result
    attempted.add(tip.hash)

    const info = await cliJson<GetBlockchainInfo>(
      subc,
      opts,
      'getblockchaininfo',
    )
    const forkHeight = tip.height - tip.branchlen
    // Skip only when the block at forkHeight+1 — the lowest block a reorg
    // onto this tip must disconnect and re-connect — has itself been pruned.
    // At pruneheight == forkHeight+1 that block is still stored, so the reorg
    // is feasible; the guard is `> forkHeight + 1`, not `> forkHeight`, to
    // avoid over-skipping that boundary into a spurious "not recoverable"
    // reindex warning.
    if (info.pruned && (info.pruneheight ?? 0) > forkHeight + 1) {
      result.skippedPruned.push(tip)
      continue
    }
    await cli(subc, opts, 'reconsiderblock', tip.hash)
    result.reconsidered.push(tip)
  }
}

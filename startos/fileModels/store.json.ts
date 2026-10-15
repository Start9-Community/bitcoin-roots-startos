import { FileHelper, z } from '@start9labs/start-sdk'
import { sdk } from '../sdk'

export const shape = z.looseObject({
  reindexBlockchain: z.boolean().catch(false),
  reindexChainstate: z.boolean().catch(false),
  fullySynced: z.boolean().catch(false),
  snapshotInUse: z.boolean().catch(false),
  /** Wallet that the Wallet-group Actions operate on. Defaults to the
   *  historical hardcoded wallet name so existing installs are unchanged. */
  selectedWallet: z.string().catch('coin'),
  reattachPeerOnions: z.boolean().catch(false),
  /** Set by the migration off an RDTS-enforcing flavor; consumed once by the
   *  chain-recovery oneshot in main.ts. See startos/forkRecovery.ts. */
  reconsiderInvalidTips: z.boolean().catch(false),
  /** Whether the binary that last advanced this datadir enforced the RDTS
   *  consensus rules — the package-level durable marker bitcoind itself lacks
   *  (its persisted block verdicts don't record which rules produced them).
   *  Every flavor records it each start; the non-enforcing flavors are the
   *  ones that act on it. Roots always writes false. Left `undefined` for a
   *  datadir last advanced by a package version that predates the marker,
   *  which this flavor must read as "may have enforced". */
  rdtsEnforcedLastRun: z.boolean().optional().catch(undefined),
})

export const storeJson = FileHelper.json(
  {
    base: sdk.volumes.main,
    subpath: '/store.json',
  },
  shape,
)

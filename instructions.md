# Bitcoin Roots

## Documentation

- [Start9 Bitcoin guides](https://docs.start9.com/bitcoin-guides/) — operating-a-Bitcoin-node guides curated for StartOS users (connecting wallets, dependent services, common workflows).
- [About Bitcoin Roots](https://plan-b.foundation/bitcoin-roots/) — upstream project's description of what Roots changes and what it deliberately does not.
- [Transaction relay policy](https://plan-b.foundation/bitcoin-roots/doc/policy/README) — upstream's account of where local policy ends and consensus begins.

## What you get on StartOS

- A full Bitcoin Roots node with three interfaces: **RPC Interface** (JSON-RPC for wallets and dependent services), **Peer Interface** (the network port other nodes connect to), and **ZeroMQ Interface** (block/transaction notifications, when ZMQ is enabled).
- An embedded **i2pd** sidecar that brings up I2P transport automatically — your node accepts inbound peers over I2P out of the box, with a separate **I2P Daemon Console** interface available when you turn the i2pd web console on.
- An automatic Tor outbound proxy (your node reaches `.onion` peers without configuration); add a `.onion` to the Peer Interface to advertise yourself and accept inbound Tor connections too.
- Disk-aware defaults: on disks smaller than 900 GB the package enables pruning and disables `txindex`; on larger disks you get a full archival node. The transition is transparent — pruned nodes route RPC through a small `btc-rpc-proxy` sidecar so port 8332 always serves RPC the same way, and it fetches any block your node has pruned from the peer-to-peer network on demand, so wallets and services see a node that behaves as though nothing were pruned.
- Shared `bitcoind` package id with Bitcoin Core and Bitcoin Knots — you can switch here from any of them without re-syncing the chain, and every dependent service (Electrs, LND, Mempool, BTCPay and the rest) keeps working against the same node with no reconfiguration.
- **Conservative policy without a consensus change.** Roots restores the data-carrier limits Bitcoin Core v30 removed, as settings you control rather than as rules about which blocks are valid: an 83-byte default OP_RETURN budget, bare pubkey and bare multisig relay off, parasite and token filters on. It does **not** enforce RDTS/BIP-110. A transaction your node refuses to relay can still be perfectly valid, and if a valid block contains it your node accepts the block — so running Roots cannot put you on a different chain from everyone else.

## Getting set up

Bitcoin Roots starts and begins Initial Block Download (IBD) immediately on install.

1. Start the service. Open the Dashboard and watch the sync progress.
2. If you want inbound clearnet peers, add a public IP or hostname on the **Peer Interface**. If you want inbound Tor peers, add a `.onion` there.
3. If you want to expose RPC to a wallet or dependent service that doesn't use the cookie file, run **Generate RPC User Credentials** and supply the username/password to the consumer.

> Initial Block Download takes hours to days depending on hardware and network. The node is functional immediately but RPC calls that depend on chain state will return partial results until sync completes.

### If you are switching from Bitcoin Core or Bitcoin Knots

Nothing is re-synced and nothing needs reconfiguring — it is the same service with a different binary. Two things do change, and both are deliberate:

1. **Your mempool policy settings are reset to Roots' defaults.** Roots and the flavor you came from do not share defaults even where they share setting names, so values carried over would quietly hold your node to the old flavor's policy. Anything you had customised under **Mempool Settings** needs setting again if you want it.
2. **Coming from the RDTS-enforcing Bitcoin Knots**, your node does a one-time chain check on its first start. Knots recorded "invalid" against blocks that are invalid only under BIP-110, and Roots does not have that rule — so those verdicts are cleared and the node re-evaluates those branches under its own rules. You will see a **Chain Verdicts Reset** notification if anything was cleared. The node may then reorganise onto a different chain, which can take a while and needs peers on it.
   - If your node is **pruned**, some branches may be unrecoverable this way — it no longer stores the blocks needed to reorganise that far back. You will get a **Some Chains Not Recoverable** warning. If the node then looks stuck on the wrong chain, run **Reindex Blockchain** (on a pruned node this re-downloads the chain).

## Using Bitcoin Roots

### RPC

The **RPC Interface** is where wallets, indexers, Lightning nodes, and other dependent services connect. Internal services on this StartOS authenticate via the cookie file automatically; external clients need an RPC user (see actions below).

### Configuration

Four configuration actions cover the full set of editable `bitcoin.conf` values, grouped to be navigable:

- **Mempool Settings** — Roots' policy controls (OP_RETURN limits, parasite/token filters, replacement rules, ancestor/descendant limits, dust relay fee, etc.) plus standard mempool sizing.
- **Peer Settings** — `onlynet`, BIP324 v2 transport, I2P SAM proxy on/off, manual peers, max connections.
- **RPC Settings** — RPC threads, work queue, server timeout.
- **Other Settings** — ZMQ, txindex, block templates, coinstats index, block filters (BIP158/157), pruning, dbcache, wallet master switches, NAT-PMP, max upload target, and more.

Turning on txindex, the coinstats index, or block filters after the chain is already synced starts a rebuild from the first block. The **Index Sync** health check on the Dashboard tracks it, and anything relying on that index — transaction lookups, filter-based wallet scans — stays incomplete until it finishes, even though the node itself reports fully synced.

### Preserving a peer .onion address after an update

The update reattaches existing peer addresses to the current peer interface through Tor, keeping their hostname and public port. Keep Tor up to date; reattachment waits until it supports this operation. Unused addresses from a different host can be explicitly selected through the interface's Tor table.

### RPC users

- **Generate RPC User Credentials** — create a username/password pair for an external client.
- **Delete RPC Users** — remove credentials you no longer need.

### Wallet (on-node wallets)

When wallets are not disabled, the node ships with a basic wallet toolkit you can drive from actions:

- **Select Wallet** — choose which wallet the other Wallet actions operate on. It defaults to `coin`, and the dropdown also lists wallets created by dependent services such as BTCPay Server/NBXplorer (including bitcoind's unnamed default wallet).
- **Get Address**, **Get Balance**, **Send Coins**, **Send All Coins**, **Sign Message**.
- **Backup wallet** / **Restore wallet** / **Remove wallet**. Backup wallet replaces the selected wallet's previous backup, and Restore wallet only works once that wallet has been removed; both ask for confirmation.

Every action above acts on the currently selected wallet, so if you run more than one wallet (for example alongside BTCPay Server) use **Select Wallet** to point them at the right one first — otherwise they operate on `coin`. For day-to-day use prefer a dedicated wallet pointed at the RPC interface; the action surface here is mainly for one-off recovery and maintenance.

### Mining

- **Prioritize Transaction** — bump a transaction's relative priority in the mempool with a fee delta.

### Maintenance

- **Reindex Blockchain** — full reindex; expect a long re-sync.
- **Reindex Chainstate** — rebuild chainstate from existing blocks (not available on pruned nodes).
- **Delete Peer List** — wipe `peers.dat` if peer discovery is misbehaving.
- **Delete Transaction Index** / **Delete Coinstats Index** — clear a corrupted index so it can be rebuilt.

### Advanced

- **Download UTXO Snapshot (assumeutxo)** — pull a UTXO snapshot to short-cut IBD; the action hides itself once the node is fully synced. The URL must be a direct link to a `.dat` snapshot file, which can be one you serve from your own machine over the LAN.
- **Runtime Information** — current connection count, block height, sync progress, softfork state, and other runtime details at a glance.

## Limitations

- **No riscv64 build.** Upstream publishes Linux x86_64 and aarch64 only. If your server is riscv64, you cannot switch to this flavor.
- **Releases are signed by a single key.** Bitcoin Core requires 5 of 7 release signers and Knots 3 of 5; Roots has one signer, and that key is published only inside the checksum file it signs. The package pins it and verifies every build against it, which proves a release came from the same party as the previous ones — not that the party is who it claims to be. Weigh that as you would any young project.
- **Wallet actions cover hot-wallet basics only.** Anything beyond the listed actions (coin control, PSBTs, multisig, hardware-wallet flows) needs an external wallet talking to the RPC interface.
- **Advanced i2pd tuning is not exposed.** Bandwidth class, transit share, floodfill, console, and tunnel limits are baked into the bundled `i2pd.conf`. To change them, edit `i2pd.conf` on the `i2pd` volume directly.
- **The service log filters the I2P router's routine chatter.** Lines the router still prints carry an `[i2pd]` prefix; Bitcoin's own lines are unprefixed. Real router problems still appear — only known-routine network noise is dropped.
- **The bundled I2P router carries only your node's traffic.** It relays nothing for other I2P users, so enabling I2P costs you your own Bitcoin traffic and nothing more. An update also raised its bandwidth class from L to O, which makes inbound I2P reliable without adding any relayed traffic. Both are defaults: set `notransit` or the bandwidth class in `i2pd.conf` on the `i2pd` volume and your values stick — including turning relaying on, if you want to support the I2P network.

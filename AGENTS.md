# AGENTS.md

This is a StartOS service-package repository — it builds a `.s9pk` for StartOS.

Develop it inside a StartOS packaging workspace created by `start-cli s9pk init-workspace`,
which provides the packaging guide and agent context one level up. If you're reading this in a
bare clone with no workspace, the full guide is at <https://docs.start9.com/packaging>.

- **Package id is `bitcoind`, not `bitcoin-roots`.** Bitcoin Core, Bitcoin Knots and this package are drop-in flavors of one package; the repo and directory are named after the flavor, but `effects` calls, dependents, and `start-cli` all take `bitcoind`. The flavor lives in the version string's `#roots` prefix, which is identity and never changes.
- **Derived from `Start9-Community/bitcoin-knots-prerdts-startos`.** Look there when something here is unexplained; a fix that is not Roots-specific likely belongs there too.
- **Keep host ids, ports and action ids identical to `bitcoin-core-startos`.** Dependents build against Core's `utils` and drive `autoconfig` by id, then run against whichever flavor is installed.
- **`store.json` stays `z.looseObject`.** All bitcoind flavors share one store, and a strict shape would discard another flavor's pending state on a switch.
- **Verify option changes against the binary, not against Knots.** `docker run --platform linux/arm64 -v "$PWD/ex:/r:ro" debian:stable-slim /r/bin/bitcoind -help-debug` on an extracted release tarball is the authority for what exists. Roots **warns and continues** on an unknown `bitcoin.conf` value rather than failing, so a modelled key the binary dropped produces a dead form field and a log line, not a visible error.
- **`VERSION` in the manifest must equal the upstream git tag minus the `v`.** The release tarballs carry no version in their filenames, so the tag is the only selector. See UPDATING.md.
- **One release signer, 1-of-1 quorum, key published only in-band.** `assets/release-keys/` holds a copy taken from `v29.4-roots.4`. Never refresh it from a failing release's own `SHA512SUMS` — read UPDATING.md's key section before touching `PINNED_FINGERPRINTS`.
- **No riscv64.** Upstream ships x86_64 and aarch64 only; `Makefile` pins `ARCHES := x86 arm` to match the manifest. Adding riscv64 back needs an upstream build to exist, not just a manifest edit.
- **`startos/i2pdLogFilter.ts` and `test/i2pdLogFilter.test.ts` are shared verbatim with the Bitcoin Core and Knots repos** — edit every tree together. `npm test` runs the suite, and the Makefile's `TS_CHECK` override chains it into the build gate, so `make` and CI fail on it. The drop list is keyed to the pinned i2pd image's exact message wording; read UPDATING.md's i2pd section before bumping that image.
- **`fullConfigSpec` has three hand-maintained halves and no exhaustiveness check.** A new setting must be added to `shape`, `fileToForm`, and `formToFile` in `startos/fileModels/bitcoin.conf.ts` — TypeScript will not tell you one is missing. Then select it in one of the four config actions' `filter({…})`; a field no action selects is unreachable from the UI.
- **Every Wallet-group action gates on `!conf?.raw?.disablewallet`.** A new one must do the same, or it appears on a node with no wallet and fails at the RPC.
- **`setInterfaces` must not drop RPC and peer along with the conf.** Only the ZMQ and I2P exports read `bitcoin.conf`; an early return on a null read de-exports every interface, and every dependent that watches this host sees them all vanish at once. A torn write is a real way to read null (Start9Labs/start-technologies#3668).

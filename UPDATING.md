# Updating the upstream version

Upstream is actively releasing, so unlike the pre-RDTS Knots package this one
derives from, a bump procedure applies here.

## The pin

`VERSION` build-arg under `images.bitcoind.source.dockerBuild.buildArgs` in
`startos/manifest/index.ts`. There is no `dockerTag` and no `PATH_VERSION`:
the `bitcoind` image is built locally from `Dockerfile`, which downloads
`https://github.com/LuganoPlanB/bitcoin-roots/releases/download/v${VERSION}/`.

`VERSION` must equal the upstream git tag **minus the leading `v`** —
`29.4-roots.4` for tag `v29.4-roots.4`. This is load-bearing: the release
tarballs are named `bitcoin-roots-linux-{x86_64,aarch64}.tar.gz` with no
version in the filename, so the tag is the only thing that selects a release.
A wrong `VERSION` is a 404, not a silently wrong binary.

## Bumping

1. **Check the release carries both Linux tarballs.** Upstream publishes
   x86_64 and aarch64 (plus macOS and Windows, which are irrelevant here) and
   no riscv64. A release missing one of the two Linux builds cannot ship.
2. **Verify the signature against the pinned key before anything else** — see
   the next section.
3. **Diff the option set.** `bitcoind -help-debug` from the new tarball
   against the keys in `shape` in `startos/fileModels/bitcoin.conf.ts`. At
   `29.4-roots.4` exactly two modelled keys are absent from the binary
   (`consensusrules`, `softwareexpiry`) and both are declared must-be-absent
   on purpose. An option that disappears without being moved to that group
   leaves a dead form field; one that appears is a feature the package does
   not expose yet. Note that Roots only *warns* on unknown config values
   (verified at `29.4-roots.4`), so neither case fails loudly at runtime.
4. **If the Core base major changes, the migration edges change with it.** The
   `other` edges in `startos/versions/current.ts` are written for a 29-based
   binary: `^30` strips the moved `coinstatsindex` and `^31` additionally
   strips `fee_estimates.dat`, because coming *down* from those majors is a
   backwards data-format move. On a Roots 30.x or 31.x base those cleanups
   belong on different edges, or on none.
5. **A 31.x base also ships `libexec/bitcoin-node`** (Core's IPC binary),
   which the 29.4 archive does not. The Dockerfile copies only `bin/bitcoind`
   and `bin/bitcoin-cli`; exposing IPC would mean copying that too and porting
   the `ipc` action from `bitcoin-core-startos`.
6. **Bump the version string** in `startos/versions/current.ts`:
   `#roots:<upstream>:<revision>`. The flavor `#roots` never changes — it is
   identity, and the registry indexes by `(id, version, sighash)`. Upstream's
   `-roots.N` patch counter has no place in ExVer, so it lives only in the
   Dockerfile's `VERSION`; two upstream releases that differ only by that
   counter must still differ here, which means bumping the downstream
   revision.
7. **Re-check the `satisfies` values** — see below.

Watch what upstream calls a release. The repo README has described the v31
line as a "development candidate" with recorded verification gaps while
publishing v31.1 release tarballs and full release notes; the 29.4 line is the
settled one. Read `doc/roots-features.md` on the tag you are bumping to before
assuming a published tarball means a finished port.

## The signing key

`assets/release-keys/5EADD53F2CD1F0B7AEEE920D25FC5C29CD528E32.asc`, pinned in
`PINNED_FINGERPRINTS` with `REQUIRED_QUORUM=1`.

**One signer, and the key is published only inside the `SHA512SUMS` file it
signs** — not on keys.openpgp.org, not in upstream's `SECURITY.md` or
`doc/release-process.md`, not in a builder-keys file. The committed copy came
from the `v29.4-roots.4` manifest and is the same key that signed every Roots
release back to `v29.3-roots.1`, so a passing build proves continuity with
earlier releases and nothing more about who the signer is.

That makes key rotation a trust decision, never a build fix. If a release
fails verification because upstream rotated:

- Do **not** refresh the key from the new release's own `SHA512SUMS`. That is
  the artifact under test; taking the key from it verifies nothing.
- Find the new key through a channel that is not the release manifest —
  upstream's repo, a signed announcement, a keyserver — and say in the commit
  message which one it was.
- If upstream ever adds a second signer, raise `REQUIRED_QUORUM` with it. The
  quorum walk in `Dockerfile` already counts distinct primaries and needs no
  other change.

## The `satisfies` values

`startos/versions/current.ts` carries `.satisfies('29.4:16')` and
`.satisfies('28.4:28')` — the Bitcoin Core revisions this package stands in
for when a dependent's `versionRange` is evaluated. `29.4:16` is the revision
Core's own graph names for the 29.4 line, which is this package's base.

Two failure modes, in opposite directions. Claiming a revision this node does
not behave as lets a dependent install against a node missing what it needs.
Claiming too low a one makes dependents that raise their floor stop being
satisfiable, dropping off one at a time. Re-derive both from the Core package's
version graph whenever the upstream base moves, rather than carrying them
forward.

## The i2pd image

The service-log filter's drop list (`startos/i2pdLogFilter.ts`) is transcribed
verbatim from the pinned i2pd image's message wording. Bumping the `i2pd` image
tag can reword those messages; that fails open — a reworded family passes the
filter and the log flood returns — rather than dropping evidence, but it means
an i2pd bump owes a re-validation: run `npm test`, then watch a few hours of
live service logs and fold any reworded families back into the list (and its
test corpus). The same filter and test ship in `bitcoin-core-startos` and the
Knots packages, which maintain their own copies.

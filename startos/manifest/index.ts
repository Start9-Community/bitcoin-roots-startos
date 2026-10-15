import { setupManifest } from '@start9labs/start-sdk'
import { long, short } from './i18n'

export const manifest = setupManifest({
  // The id is `bitcoind`, not `bitcoin-roots`. Bitcoin Core, Bitcoin Knots and
  // this package are drop-in flavors of ONE package: StartOS switches between
  // them in place, on the same `main` volume, so the existing chainstate and
  // every dependent (Electrs, LND, Mempool, …) survive the switch untouched.
  // Giving Roots its own id would instead install a second node beside the
  // first, with its own empty datadir and a full re-sync. The flavor is carried
  // by the version string's `#roots` prefix — see startos/versions/current.ts.
  id: 'bitcoind',
  title: 'Bitcoin Roots',
  license: 'MIT',
  donationUrl: null,
  packageRepo: 'https://github.com/Start9-Community/bitcoin-roots-startos',
  upstreamRepo: 'https://github.com/LuganoPlanB/bitcoin-roots',
  marketingUrl: 'https://plan-b.foundation/bitcoin-roots/',
  description: { short, long },
  volumes: ['main', 'i2pd'],
  images: {
    bitcoind: {
      source: {
        dockerBuild: {
          buildArgs: {
            // Must match the upstream git tag minus the leading `v`: the
            // release tarballs carry no version in their filenames, so the tag
            // is the only thing that selects a release. The Knots flavors also
            // pass PATH_VERSION for bitcoinknots.org's directory layout; Roots
            // publishes through GitHub releases, which needs no such path.
            VERSION: '29.4-roots.4',
          },
        },
      },
      // No riscv64: upstream publishes Linux x86_64 and aarch64 only. The
      // sibling flavors list three arches because bitcoincore.org and
      // bitcoinknots.org both ship a riscv64 tarball. Makefile pins ARCHES to
      // match, so `make` does not attempt a build that cannot resolve.
      arch: ['x86_64', 'aarch64'],
    },
    proxy: {
      source: {
        dockerTag: 'ghcr.io/start9labs/btc-rpc-proxy:v0.8.1',
      },
      arch: ['x86_64', 'aarch64'],
    },
    python: {
      source: {
        dockerTag: 'python:3.14.2-alpine',
      },
      arch: ['x86_64', 'aarch64'],
    },
    i2pd: {
      source: {
        dockerTag: 'purplei2p/i2pd:release-2.58.0',
      },
      arch: ['x86_64', 'aarch64'],
      emulateMissing: true,
    },
  },
})

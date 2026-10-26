import { setupManifest } from '@start9labs/start-sdk'
import { long, short } from './i18n'

export const manifest = setupManifest({
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
            // The upstream git tag minus its leading `v`; the tarball names carry no version.
            VERSION: '29.4-roots.4',
          },
        },
      },
      // Upstream publishes no riscv64 build.
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

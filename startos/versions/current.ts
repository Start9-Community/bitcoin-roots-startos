import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'
import { rm } from 'fs/promises'
import { bitcoinConfFile } from '../fileModels/bitcoin.conf'

/**
 * Reset all mempool settings to undefined so the new flavor's upstream
 * defaults take effect.
 */
const mempoolReset = {
  // Shared mempool settings
  persistmempool: undefined,
  maxmempool: undefined,
  mempoolexpiry: undefined,
  mempoolfullrbf: undefined,
  permitbaremultisig: undefined,
  datacarrier: undefined,
  datacarriersize: undefined,
  // Knots/Roots policy settings
  permitbaredatacarrier: undefined,
  rejectparasites: undefined,
  rejecttokens: undefined,
  mempoolreplacement: undefined,
  mempooltruc: undefined,
  permitbareanchor: undefined,
  permitephemeral: undefined,
  minrelaytxfee: undefined,
  bytespersigop: undefined,
  bytespersigopstrict: undefined,
  maxtxlegacysigops: undefined,
  limitancestorcount: undefined,
  limitancestorsize: undefined,
  limitdescendantcount: undefined,
  limitdescendantsize: undefined,
  permitbarepubkey: undefined,
  maxscriptsize: undefined,
  datacarriercost: undefined,
  acceptnonstddatacarrier: undefined,
  dustrelayfee: undefined,
  acceptunknownwitness: undefined,
  minrelaycoinblocks: undefined,
  minrelaymaturity: undefined,
}

export const current = VersionInfo.of({
  version: '#roots:29.4:0',
  releaseNotes: {
    en_US:
      'First release of the Bitcoin Roots flavor. Roots is Bitcoin Core with conservative relay and mempool policy preserved from Bitcoin Knots, and it does not enforce RDTS/BIP-110. Switching to it from Bitcoin Core or Bitcoin Knots (pre-RDTS) keeps your blockchain data and your dependent services; your mempool policy settings are reset to Roots defaults so the switch does not leave the other flavor’s policy in force.',
    es_ES:
      'Primera versión de la variante Bitcoin Roots. Roots es Bitcoin Core con una política conservadora de retransmisión y mempool heredada de Bitcoin Knots, y no aplica RDTS/BIP-110. Cambiar a ella desde Bitcoin Core o Bitcoin Knots (pre-RDTS) conserva sus datos de la cadena de bloques y sus servicios dependientes; su configuración de política de mempool se restablece a los valores por defecto de Roots para que el cambio no deje en vigor la política de la otra variante.',
    de_DE:
      'Erste Veröffentlichung der Variante Bitcoin Roots. Roots ist Bitcoin Core mit konservativer Relay- und Mempool-Policy aus Bitcoin Knots und erzwingt RDTS/BIP-110 nicht. Ein Wechsel von Bitcoin Core oder Bitcoin Knots (pre-RDTS) behält Ihre Blockchain-Daten und Ihre abhängigen Dienste; Ihre Mempool-Policy-Einstellungen werden auf die Roots-Standardwerte zurückgesetzt, damit der Wechsel nicht die Policy der anderen Variante in Kraft lässt.',
    pl_PL:
      'Pierwsze wydanie odmiany Bitcoin Roots. Roots to Bitcoin Core z konserwatywną polityką przekazywania i mempoola zachowaną z Bitcoin Knots; nie wymusza RDTS/BIP-110. Przejście na nią z Bitcoin Core lub Bitcoin Knots (pre-RDTS) zachowuje dane łańcucha bloków i usługi zależne; ustawienia polityki mempoola są resetowane do wartości domyślnych Roots, aby przejście nie pozostawiło w mocy polityki drugiej odmiany.',
    fr_FR:
      "Première version de la déclinaison Bitcoin Roots. Roots est Bitcoin Core avec une politique conservatrice de relais et de mempool préservée de Bitcoin Knots, et il n'applique pas RDTS/BIP-110. Y passer depuis Bitcoin Core ou Bitcoin Knots (pre-RDTS) conserve vos données de chaîne de blocs et vos services dépendants ; vos réglages de politique de mempool sont réinitialisés aux valeurs par défaut de Roots afin que le changement ne laisse pas en vigueur la politique de l'autre déclinaison.",
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
    other: {
      // Core ↔ #roots, keyed by Core major series.
      ['^28']: {
        up: async ({ effects }) => {
          await bitcoinConfFile.merge(effects, mempoolReset)
        },
        down: async ({ effects }) => {
          await bitcoinConfFile.merge(effects, mempoolReset)
        },
      },
      ['^29']: {
        up: async ({ effects }) => {
          await bitcoinConfFile.merge(effects, mempoolReset)
        },
        down: async ({ effects }) => {
          await bitcoinConfFile.merge(effects, mempoolReset)
        },
      },
      ['^30']: {
        up: async ({ effects }) => {
          await bitcoinConfFile.merge(effects, mempoolReset)
          await rm('/media/startos/volumes/main/indexes/coinstatsindex', {
            recursive: true,
            force: true,
          }).catch(console.error)
        },
        down: async ({ effects }) => {
          await bitcoinConfFile.merge(effects, mempoolReset)
        },
      },
      ['^31']: {
        up: async ({ effects }) => {
          await bitcoinConfFile.merge(effects, mempoolReset)
          await rm('/media/startos/volumes/main/fee_estimates.dat', {
            force: true,
          }).catch(console.error)
          await rm('/media/startos/volumes/main/indexes/coinstatsindex', {
            recursive: true,
            force: true,
          }).catch(console.error)
        },
        down: async ({ effects }) => {
          await bitcoinConfFile.merge(effects, mempoolReset)
        },
      },
      ['^#knotsprerdts:29.3']: {
        up: async ({ effects }) => {
          await bitcoinConfFile.merge(effects, mempoolReset)
        },
        down: async ({ effects }) => {
          await bitcoinConfFile.merge(effects, mempoolReset)
        },
      },
      // #knots through :7 ran Knots 29.3.knots20260210 or earlier; :8 is the first RDTS build.
      ['<=#knots:29.3:7']: {
        up: async ({ effects }) => {
          await bitcoinConfFile.merge(effects, mempoolReset)
        },
      },
    },
  },
})
  .satisfies('29.4:16')
  .satisfies('28.4:28')

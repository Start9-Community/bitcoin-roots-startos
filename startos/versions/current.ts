import { IMPOSSIBLE, T, VersionInfo } from '@start9labs/start-sdk'
import { readFile, rm, writeFile } from 'fs/promises'
import { bitcoinConfFile } from '../fileModels/bitcoin.conf'
import { clearPeerOnionTarget } from '../utils'

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

// Keys Core does not model and would carry over verbatim; Roots' writer always emits deprecatedrpc.
const rootsOnlyKey =
  /^(deprecatedrpc=create_bdb|blockmaxsize=|blockreconstructionextratxnsize=)/

const toCore = async ({ effects }: { effects: T.Effects }) => {
  await bitcoinConfFile.merge(effects, mempoolReset)
  const path = '/media/startos/volumes/main/bitcoin.conf'
  const conf = await readFile(path, 'utf8')
  await writeFile(
    path,
    conf
      .split('\n')
      .filter((line) => !rootsOnlyKey.test(line))
      .join('\n'),
  )
  await clearPeerOnionTarget(effects)
}

export const current = VersionInfo.of({
  version: '#roots:29.4:7',
  releaseNotes: {
    en_US:
      'DATUM Gateway can now finish its Bitcoin setup and start: Other Settings gains Block Reserved Weight, the room block templates leave for a mining pool’s coinbase.',
    es_ES:
      'DATUM Gateway ya puede completar su configuración de Bitcoin e iniciarse: Otras configuraciones incorpora Peso reservado del bloque, el espacio que las plantillas de bloque dejan para la coinbase de un pool de minería.',
    de_DE:
      'DATUM Gateway kann seine Bitcoin-Einrichtung jetzt abschließen und starten: Weitere Einstellungen enthalten nun Reserviertes Blockgewicht, den Platz, den Blockvorlagen für die Coinbase eines Mining-Pools freilassen.',
    pl_PL:
      'DATUM Gateway może teraz dokończyć konfigurację Bitcoina i się uruchomić: Inne ustawienia zyskują Zarezerwowaną wagę bloku, czyli miejsce, które szablony bloków zostawiają na coinbase puli wydobywczej.',
    fr_FR:
      'DATUM Gateway peut désormais terminer sa configuration Bitcoin et démarrer : les Autres paramètres gagnent Poids de bloc réservé, l’espace que les modèles de bloc laissent à la coinbase d’un pool de minage.',
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
        down: toCore,
      },
      ['^29']: {
        up: async ({ effects }) => {
          await bitcoinConfFile.merge(effects, mempoolReset)
        },
        down: toCore,
      },
      ['^30']: {
        up: async ({ effects }) => {
          await bitcoinConfFile.merge(effects, mempoolReset)
          await rm('/media/startos/volumes/main/indexes/coinstatsindex', {
            recursive: true,
            force: true,
          }).catch(console.error)
        },
        down: toCore,
      },
      // Core 32 wallets containing unused() descriptors require Core 32.
      // Core 32's txindex stays readable: 29.4 re-indexes from its own legacy locator.
      ['>=31:0 && <33:0']: {
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
        down: toCore,
      },
      ['^#knotsprerdts:29.3']: {
        up: async ({ effects }) => {
          await bitcoinConfFile.merge(effects, mempoolReset)
        },
        down: async ({ effects }) => {
          await bitcoinConfFile.merge(effects, mempoolReset)
          await clearPeerOnionTarget(effects)
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

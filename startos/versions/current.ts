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
  version: '#roots:29.4:4',
  releaseNotes: {
    en_US:
      'Send Coins and Send All Coins now warn before they spend from the selected wallet, and reject a fee rate above 1000 sat/vB, a zero amount or a malformed number before anything is sent. Backup wallet now says which file it writes.',
    es_ES:
      'Enviar monedas y Enviar todas las monedas ahora avisan antes de gastar de la cartera seleccionada y rechazan una tasa de comisión superior a 1000 sat/vB, un importe cero o un número mal formado antes de enviar nada. Respaldar billetera ahora indica qué archivo escribe.',
    de_DE:
      'Coins senden und Alle Coins senden warnen jetzt, bevor sie aus der ausgewählten Wallet ausgeben, und lehnen einen Gebührensatz über 1000 sat/vB, einen Betrag von null oder eine fehlerhafte Zahl ab, bevor etwas gesendet wird. Wallet sichern nennt jetzt die Datei, die es schreibt.',
    pl_PL:
      'Akcje Wyślij monety i Wyślij wszystkie monety ostrzegają teraz przed wydaniem środków z wybranego portfela i odrzucają stawkę opłaty powyżej 1000 sat/vB, zerową kwotę lub błędnie zapisaną liczbę, zanim cokolwiek zostanie wysłane. Akcja Utwórz kopię zapasową portfela podaje teraz, który plik zapisuje.',
    fr_FR:
      'Envoyer des fonds et Envoyer tous les fonds avertissent désormais avant de dépenser depuis le portefeuille sélectionné, et refusent un taux de frais supérieur à 1000 sat/vB, un montant nul ou un nombre mal formé avant tout envoi. Sauvegarder le portefeuille indique désormais le fichier qu’il écrit.',
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

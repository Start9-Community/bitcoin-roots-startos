import { IMPOSSIBLE, T, VersionInfo } from '@start9labs/start-sdk'
import { readFile, rm, writeFile } from 'fs/promises'
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
}

export const current = VersionInfo.of({
  version: '#roots:29.4:5',
  releaseNotes: {
    en_US:
      'Requires StartOS 0.4.2 or later. ZeroMQ notifications are now reachable only by other services on this server, no longer from your local network: the ZeroMQ Block and ZeroMQ Transaction interfaces are removed, and services that use ZeroMQ, such as LND, are unaffected. Switching chain data from Bitcoin Core 32.x is now supported. Do not switch a wallet that used the Core 32 addhdkey RPC: Roots cannot load that wallet; keep it on Core 32. Fixes memory use growing while the service runs.',
    es_ES:
      'Requiere StartOS 0.4.2 o posterior. Las notificaciones ZeroMQ ahora solo son accesibles para otros servicios de este servidor, ya no desde su red local: se eliminan las interfaces Bloque ZeroMQ y Transacción ZeroMQ, y los servicios que usan ZeroMQ, como LND, no se ven afectados. Ahora se admite el cambio de los datos de la cadena desde Bitcoin Core 32.x. No cambie una cartera que haya usado el RPC addhdkey de Core 32: Roots no puede cargarla; manténgala en Core 32. Corrige el aumento del uso de memoria mientras el servicio está en ejecución.',
    de_DE:
      'Erfordert StartOS 0.4.2 oder neuer. ZeroMQ-Benachrichtigungen sind jetzt nur noch für andere Dienste auf diesem Server erreichbar, nicht mehr aus Ihrem lokalen Netzwerk: Die Schnittstellen ZeroMQ-Block und ZeroMQ-Transaktion wurden entfernt, und Dienste, die ZeroMQ nutzen, etwa LND, sind nicht betroffen. Die Übernahme der Blockchain-Daten von Bitcoin Core 32.x wird jetzt unterstützt. Wallets, die den RPC addhdkey von Core 32 verwendet haben, dürfen nicht gewechselt werden: Roots kann sie nicht laden; diese Wallets müssen auf Core 32 bleiben. Behebt einen während der Laufzeit des Dienstes ansteigenden Speicherverbrauch.',
    pl_PL:
      'Wymaga StartOS 0.4.2 lub nowszego. Powiadomienia ZeroMQ są teraz dostępne tylko dla innych usług na tym serwerze, a nie z sieci lokalnej: usunięto interfejsy Blok ZeroMQ i Transakcja ZeroMQ, a usługi korzystające z ZeroMQ, takie jak LND, działają bez zmian. Przeniesienie danych łańcucha z Bitcoin Core 32.x jest teraz obsługiwane. Nie przenoś portfela, który używał RPC addhdkey z Core 32: Roots nie może go załadować; pozostaw go na Core 32. Naprawia wzrost zużycia pamięci podczas działania usługi.',
    fr_FR:
      "Nécessite StartOS 0.4.2 ou une version ultérieure. Les notifications ZeroMQ ne sont désormais accessibles qu'aux autres services de ce serveur, et non plus depuis votre réseau local : les interfaces Bloc ZeroMQ et Transaction ZeroMQ sont supprimées, et les services qui utilisent ZeroMQ, comme LND, ne sont pas affectés. Le transfert des données de la chaîne depuis Bitcoin Core 32.x est désormais pris en charge. Ne transférez pas un portefeuille ayant utilisé le RPC addhdkey de Core 32 : Roots ne peut pas le charger ; conservez-le sur Core 32. Corrige l'augmentation de la consommation de mémoire pendant le fonctionnement du service.",
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

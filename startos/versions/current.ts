import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'
import { rm } from 'fs/promises'
import { bitcoinConfFile } from '../fileModels/bitcoin.conf'
import { storeJson } from '../fileModels/store.json'

/**
 * Reset all mempool settings to undefined so the new flavor's upstream
 * defaults take effect.
 *
 * Applied on every flavor transition, Knots↔Roots included: the two do not
 * share policy defaults even where they share option names. Roots 29.4 ships
 * datacarriersize=83, datacarriercost=1, maxscriptsize=1650 and
 * mempoolreplacement=fee,-optin; Knots differs on several of these. Leaving an
 * explicit value behind would silently hold the node to the *other* flavor's
 * policy while the UI showed it as a default.
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

/**
 * Chain-split recovery flag (see startos/forkRecovery.ts), set when switching
 * in from an RDTS-enforcing flavor and consumed by the recovery oneshot at the
 * next start (a clean no-op when there is nothing to fix).
 *
 * All bitcoind flavors share one `main` volume, so the switch carries the
 * source flavor's persisted per-block validity verdicts (CBlockIndex::nStatus
 * in blocks/index/) into the Roots binary. Those verdicts are trusted verbatim
 * at startup — bitcoind never re-validates buried blocks under the new
 * binary's rules, and the persisted validity level does not record which
 * consensus rules produced it. An RDTS-driven BLOCK_FAILED_VALID mark would
 * therefore keep a Roots node off the most-work chain it is supposed to
 * follow, and Roots cannot recognize those marks as foreign because it knows
 * nothing about RDTS. Clearing them is the whole point of the oneshot.
 *
 * There is no reverse edge to maintain: a Knots release that enforces RDTS
 * re-validates the applicable range itself when it starts on a datadir that
 * advanced without enforcement.
 */
const leavingRdtsFlavor = { reconsiderInvalidTips: true }

export const current = VersionInfo.of({
  // `#roots` is the flavor; `29.4` is the upstream version (git tag
  // v29.4-roots.4 — the `-roots.4` suffix is upstream's own patch counter on
  // Core 29.4, and is carried in the Dockerfile's VERSION build arg rather
  // than here, because ExVer has no place for it); `:0` is this package's
  // first revision. Both the id and the flavor are identity, not labels: the
  // registry indexes by (id, version, sighash) and there is no rename path.
  version: '#roots:29.4:0',
  releaseNotes: {
    en_US:
      'First release of the Bitcoin Roots flavor. Roots is Bitcoin Core with conservative relay and mempool policy preserved from Bitcoin Knots, and it does not enforce RDTS/BIP-110. Switching to it from Bitcoin Core or Bitcoin Knots keeps your blockchain data and your dependent services; your mempool policy settings are reset to Roots defaults so the switch does not leave the other flavor’s policy in force.',
    es_ES:
      'Primera versión de la variante Bitcoin Roots. Roots es Bitcoin Core con una política conservadora de retransmisión y mempool heredada de Bitcoin Knots, y no aplica RDTS/BIP-110. Cambiar a ella desde Bitcoin Core o Bitcoin Knots conserva sus datos de la cadena de bloques y sus servicios dependientes; su configuración de política de mempool se restablece a los valores por defecto de Roots para que el cambio no deje en vigor la política de la otra variante.',
    de_DE:
      'Erste Veröffentlichung der Variante Bitcoin Roots. Roots ist Bitcoin Core mit konservativer Relay- und Mempool-Policy aus Bitcoin Knots und erzwingt RDTS/BIP-110 nicht. Ein Wechsel von Bitcoin Core oder Bitcoin Knots behält Ihre Blockchain-Daten und Ihre abhängigen Dienste; Ihre Mempool-Policy-Einstellungen werden auf die Roots-Standardwerte zurückgesetzt, damit der Wechsel nicht die Policy der anderen Variante in Kraft lässt.',
    pl_PL:
      'Pierwsze wydanie odmiany Bitcoin Roots. Roots to Bitcoin Core z konserwatywną polityką przekazywania i mempoola zachowaną z Bitcoin Knots; nie wymusza RDTS/BIP-110. Przejście na nią z Bitcoin Core lub Bitcoin Knots zachowuje dane łańcucha bloków i usługi zależne; ustawienia polityki mempoola są resetowane do wartości domyślnych Roots, aby przejście nie pozostawiło w mocy polityki drugiej odmiany.',
    fr_FR:
      "Première version de la déclinaison Bitcoin Roots. Roots est Bitcoin Core avec une politique conservatrice de relais et de mempool préservée de Bitcoin Knots, et il n'applique pas RDTS/BIP-110. Y passer depuis Bitcoin Core ou Bitcoin Knots conserve vos données de chaîne de blocs et vos services dépendants ; vos réglages de politique de mempool sont réinitialisés aux valeurs par défaut de Roots afin que le changement ne laisse pas en vigueur la politique de l'autre déclinaison.",
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
    other: {
      // Bitcoin Core (unflavored) ↔ #roots, keyed by Core major series.
      // Roots 29.4 is built on Core 29.4, so coming from a higher Core major
      // means moving *back* a data format: both cleanups below are for that
      // direction, and the `down` edges only need the policy reset.
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
          // coinstatsindex moved in Core 30; a 29-based binary would read the
          // new location as an absent index and the old one as stale.
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
          // Core 31 bumped CURRENT_FEES_FILE_VERSION (149900 → 309900) and
          // changed the fee estimator's bucket size; a 29-based binary
          // hard-fails on a v31-written file rather than ignoring it.
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
      // Bitcoin Knots (RDTS-enforcing) → #roots. Same data layout, so this is
      // a policy reset plus the RDTS opt-out cleanup: queue the invalid-verdict
      // reconsideration, because the verdicts this datadir carries were
      // produced by rules Roots does not have. Any `consensusrules=rdts` left
      // in bitcoin.conf is dropped by the file model on its first write (that
      // option does not exist in the Roots binary), so there is nothing to
      // clear here.
      //
      // No `down`: the Knots release re-validates the RDTS-applicable range
      // itself on its first start against a datadir that advanced without
      // enforcement, so the reverse edge needs no work from this package.
      ['^#knots:29.3']: {
        up: async ({ effects }) => {
          await bitcoinConfFile.merge(effects, mempoolReset)
          await storeJson.merge(effects, leavingRdtsFlavor)
        },
      },
      // Bitcoin Knots (pre-RDTS) ↔ #roots — the flavor this package was
      // derived from. Neither side ever enforced RDTS, so there are no foreign
      // verdicts to reconsider and the policy reset is the whole migration.
      ['^#knotsprerdts:29.3']: {
        up: async ({ effects }) => {
          await bitcoinConfFile.merge(effects, mempoolReset)
        },
        down: async ({ effects }) => {
          await bitcoinConfFile.merge(effects, mempoolReset)
        },
      },
    },
  },
})
  // Roots 29.4-roots.4 is built on Core 29.4, so it satisfies dependents that
  // ask for the Core 29.4 line (`:16` is the revision Bitcoin Core's own graph
  // names for it) and anything older. Re-check these when bumping the upstream
  // base — claiming a revision this node does not actually behave as would let
  // a dependent install against a node missing what it needs.
  .satisfies('29.4:16')
  .satisfies('28.4:28')

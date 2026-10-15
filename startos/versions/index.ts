import { VersionGraph } from '@start9labs/start-sdk'
import { current } from './current'

// `other` is empty because `#roots:29.4:0` is this flavor's first release —
// there is no earlier Roots version to migrate from. Switching in from another
// bitcoind flavor is not handled here but by `migrations.other` in current.ts,
// keyed by that flavor's version range.
export const versionGraph = VersionGraph.of({
  current,
  other: [],
})

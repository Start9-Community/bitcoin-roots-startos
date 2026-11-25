import { setupOnionTarget } from 'tor-startos/startos/utils/target'
import { sdk } from '../sdk'
import { peerOnionBinding, peerPortOnion } from '../utils'

export const onionTarget = setupOnionTarget(sdk, {
  ...peerOnionBinding,
  target: peerPortOnion,
})

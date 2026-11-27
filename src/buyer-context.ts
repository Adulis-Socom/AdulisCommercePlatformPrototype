// DEMO-003: the Buyer account the Buyer app is signed in as. The app is remounted when the account changes, so every screen and the chat read one
// value and never a module constant. The default is the dataset's primary Buyer (Maya).
import { createContext, useContext } from 'react'
import { SURFACE_DEFAULTS, type BuyerId } from './demo-data'

export const BuyerCtx = createContext<BuyerId>(SURFACE_DEFAULTS.buyer)
export const useBuyer = (): BuyerId => useContext(BuyerCtx)

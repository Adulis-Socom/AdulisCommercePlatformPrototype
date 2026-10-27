import { useState } from 'react'
import { Button } from '../components/ui/Button'
import { SystemStatePanel, type SystemStateKind } from '../components/ui/Overlay'
import { ORDERS, ORDER_IDS, PRODUCTS, SELLERS, SURFACE_DEFAULTS, formatEtb, orderTotals, sellerProductsAt } from '../demo-data'

type Surface = 'Buyer' | 'Courier' | 'Seller' | 'Operator' | 'Platform'

interface ScenarioState {
  kind: SystemStateKind
  title: string
  description: string
  detail?: string
}

interface Scenario extends ScenarioState {
  id: string
  surface: Surface
  actionLabel?: string
  outcome?: ScenarioState
}

const SURFACES: Array<'All' | Surface> = ['All', 'Buyer', 'Courier', 'Seller', 'Operator', 'Platform']

// A scenario that happens to a canonical record names it, read from the canonical module (WO-001): the default checkout
// Order's payment, the default Seller's out-of-stock Product and the Order verified by OTP fallback. A state that never
// happens to a canonical record names an example instead. The failed payment attempt says only that the attempt failed
// and the Seller Order remains for the retry (rule 5.9; WO-017's approved wording).
const ORDER = SURFACE_DEFAULTS.order
const SELLER = SELLERS[ORDERS[ORDER].seller].name
const TOTAL = formatEtb(orderTotals(ORDER).total)
const OUT_OF_STOCK = sellerProductsAt(SURFACE_DEFAULTS.seller).find(id => PRODUCTS[id].availability === 'Out of Stock')!
const OTP_ORDER = ORDER_IDS.find(id => ORDERS[id].finalHandoff?.method === 'OTP fallback')!

const SCENARIOS: Scenario[] = [
  {
    id: 'search-zero',
    surface: 'Buyer',
    kind: 'empty',
    title: 'No results for “silver tibeb jacket”',
    description: 'Try fewer words, another category, or browse nearby Sellers.',
    detail: 'No filters were silently removed.',
    actionLabel: 'Clear search',
    outcome: {
      kind: 'success',
      title: 'Search ready',
      description: 'The query was cleared and discovery suggestions are available again.',
    },
  },
  {
    id: 'empty-collection',
    surface: 'Buyer',
    kind: 'empty',
    title: 'This Collection is empty',
    description: 'Saved Products and Shoppable Posts will appear here.',
    actionLabel: 'Explore products',
    outcome: {
      kind: 'success',
      title: 'Ready to explore',
      description: 'Discovery can continue without changing or deleting the empty Collection.',
    },
  },
  {
    id: 'out-of-stock',
    surface: 'Buyer',
    kind: 'terminal',
    title: 'Product is out of stock',
    description: `${PRODUCTS[OUT_OF_STOCK].name} cannot be added to Cart right now.`,
    detail: 'The Product remains visible with its Seller and availability history intact.',
    actionLabel: 'Save for later',
    outcome: {
      kind: 'success',
      title: 'Saved for later',
      description: 'The Product is saved. Its availability is still Out of Stock.',
    },
  },
  {
    id: 'restricted-post',
    surface: 'Buyer',
    kind: 'permission',
    title: 'Shoppable Post restricted',
    description: 'This revision is unavailable in For You and Search following moderation review.',
    detail: 'Tagged Products remain governed by their own publication and availability states.',
  },
  {
    id: 'payment-processing',
    surface: 'Buyer',
    kind: 'processing',
    title: 'Processing payment',
    description: `The payment provider is processing ${TOTAL} for ${SELLER}.`,
    detail: 'Keep this screen open and do not pay again.',
    actionLabel: 'Simulate confirmation',
    outcome: {
      kind: 'success',
      title: 'Payment confirmed',
      description: `The provider confirmed payment and Seller Order ${ORDER} was created.`,
    },
  },
  {
    id: 'payment-reconciliation',
    surface: 'Buyer',
    kind: 'stale',
    title: 'Payment reconciliation in progress',
    description: 'The provider response is delayed. Adulis is checking provider and backend records before creating a Seller Order.',
    detail: 'Do not pay again. The Seller cannot mark this payment as paid.',
    actionLabel: 'Check again',
    outcome: {
      kind: 'success',
      title: 'Payment reconciled',
      description: 'The provider confirmed payment and Example Order was created once.',
    },
  },
  {
    id: 'payment-failed',
    surface: 'Buyer',
    kind: 'failed',
    title: 'Payment failed',
    description: 'Payment attempt failed. No payment was confirmed. The existing Seller Order remains in place for retry.',
    actionLabel: 'Try payment again',
    outcome: {
      kind: 'processing',
      title: 'Retry in progress',
      description: 'A new provider attempt is processing. The previous failed attempt remains recorded.',
    },
  },
  {
    id: 'payment-success',
    surface: 'Buyer',
    kind: 'success',
    title: 'Payment confirmed',
    description: `The provider confirmed payment and Seller Order ${ORDER} was created.`,
    detail: `Paid · ${TOTAL} · ${SELLER}`,
  },
  {
    id: 'order-stale',
    surface: 'Buyer',
    kind: 'stale',
    title: 'Order status may be stale',
    description: 'This timeline was last synchronized 8 minutes ago.',
    detail: 'The displayed status is retained until a verified newer state is received.',
    actionLabel: 'Refresh Order',
    outcome: {
      kind: 'success',
      title: 'Order status refreshed',
      description: 'The latest provider and fulfilment states were retrieved.',
      detail: 'Preparing · synchronized just now',
    },
  },
  {
    id: 'qr-expired',
    surface: 'Buyer',
    kind: 'terminal',
    title: 'Delivery QR expired',
    description: 'This code can no longer verify final handoff.',
    detail: 'No handoff state changed. Ask the courier to generate a current Delivery QR.',
    actionLabel: 'Request new QR',
    outcome: {
      kind: 'processing',
      title: 'Waiting for a new QR',
      description: 'The courier can present a fresh code for the same Seller Order.',
    },
  },
  {
    id: 'qr-invalid',
    surface: 'Buyer',
    kind: 'validation',
    title: 'QR does not match this Order',
    description: 'The scanned code belongs to a different delivery or cannot be verified.',
    detail: 'The package handoff is not confirmed.',
    actionLabel: 'Use OTP fallback',
    outcome: {
      kind: 'processing',
      title: 'OTP fallback ready',
      description: 'Enter the verification code sent to your phone while physically receiving the package.',
      detail: 'Opening the fallback does not itself confirm handoff.',
    },
  },
  {
    id: 'otp-fallback',
    surface: 'Buyer',
    kind: 'validation',
    title: 'Enter the 6-digit delivery OTP',
    description: 'The fallback code is required because QR scanning is unavailable.',
    detail: 'Codes expire and are limited to the current recipient handoff.',
    actionLabel: 'Validate example code',
    outcome: {
      kind: 'success',
      title: 'OTP verified',
      description: `Final handoff is confirmed for Seller Order ${OTP_ORDER}.`,
    },
  },
  {
    id: 'claim-evidence',
    surface: 'Buyer',
    kind: 'validation',
    title: 'Claim evidence required',
    description: 'Add at least one clear image of the received item before submitting this Claim.',
    detail: 'Your description is saved as a draft.',
    actionLabel: 'Add evidence',
    outcome: {
      kind: 'success',
      title: 'Evidence attached',
      description: 'The Claim is ready for review before submission.',
      detail: 'Attaching evidence does not submit or decide the Claim.',
    },
  },
  {
    id: 'offer-expired',
    surface: 'Courier',
    kind: 'terminal',
    title: 'Delivery offer expired',
    description: 'The Example Seller offer was not accepted before its response window ended.',
    detail: 'No delivery was assigned and no compensation was earned.',
    actionLabel: 'View current offers',
    outcome: {
      kind: 'empty',
      title: 'No current offers',
      description: 'New offers will appear here when an approved Seller sends one.',
    },
  },
  {
    id: 'location-unavailable',
    surface: 'Courier',
    kind: 'failed',
    title: 'Checkpoint location unavailable',
    description: 'Location could not be recorded at the Delivery checkpoint.',
    detail: 'The verified QR handoff remains successful. Location availability does not determine Handoff validity.',
    actionLabel: 'Continue',
    outcome: {
      kind: 'success',
      title: 'Delivery remains verified',
      description: 'The checkpoint records Location Unavailable alongside the successful Handoff.',
    },
  },
  {
    id: 'seller-conflict',
    surface: 'Seller',
    kind: 'conflict',
    title: 'Seller Order changed elsewhere',
    description: 'Another Seller Console session updated Example Order.',
    detail: 'Refresh before taking the next operational action.',
    actionLabel: 'Refresh Seller Order',
    outcome: {
      kind: 'success',
      title: 'Conflict resolved',
      description: 'The latest Seller Order revision is loaded and operational actions are available again.',
    },
  },
  {
    id: 'seller-loading',
    surface: 'Seller',
    kind: 'loading',
    title: 'Loading Seller Orders',
    description: 'Paid Seller Orders and fulfilment states are being retrieved.',
  },
  {
    id: 'no-entitlement',
    surface: 'Seller',
    kind: 'entitlement',
    title: 'Advanced insights unavailable',
    description: 'This Seller does not have the required entitlement for cohort analytics.',
    detail: 'Daily operations, Orders, Products, and the Store remain available.',
  },
  {
    id: 'operator-permission',
    surface: 'Operator',
    kind: 'permission',
    title: 'Permission denied',
    description: 'Your Operator role cannot approve this Founder-governed configuration change.',
    detail: 'The denied attempt is recorded. Request access through the named governance workflow.',
  },
  {
    id: 'notification-network',
    surface: 'Platform',
    kind: 'network',
    title: 'Notification delivery delayed',
    description: 'The push provider did not accept the latest notification attempt.',
    detail: 'The business action succeeded and remains recorded. Notification failure does not reverse payment, Order, Claim, or Handoff state.',
    actionLabel: 'Retry notification',
    outcome: {
      kind: 'success',
      title: 'Notification delivered',
      description: 'The recipient was notified. The underlying business action was already successful.',
    },
  },
  {
    id: 'provider-incident',
    surface: 'Platform',
    kind: 'processing',
    title: 'Payment provider incident',
    description: 'Provider callbacks are delayed while reconciliation remains active.',
    detail: 'Monitoring · Sellers cannot establish payment status.',
    actionLabel: 'Simulate recovery',
    outcome: {
      kind: 'success',
      title: 'Provider incident resolved',
      description: 'Delayed callbacks were reconciled against provider and backend records.',
      detail: 'Affected buyers and Sellers receive state-specific updates.',
    },
  },
]

export default function SystemStates() {
  const [surface, setSurface] = useState<'All' | Surface>('All')
  const [resolved, setResolved] = useState<Record<string, boolean>>({})
  const scenarios = surface === 'All' ? SCENARIOS : SCENARIOS.filter(scenario => scenario.surface === surface)

  return (
    <div className="system-states mx-auto max-w-7xl p-8">
      <div className="mb-8">
        <div className="font-mono text-xs font-semibold uppercase tracking-widest text-brand-text">Operational resilience</div>
        <h1 className="mt-2 font-display text-4xl font-semibold">System States</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-text-secondary">
          Representative non-happy paths across Adulis. Each state preserves the authority and boundary of the underlying business workflow.
        </p>
      </div>

      <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Filter system states by surface">
        {SURFACES.map(item => (
          <Button
            key={item}
            size="sm"
            variant={surface === item ? 'primary' : 'tertiary'}
            aria-pressed={surface === item}
            onClick={() => setSurface(item)}
          >
            {item}
          </Button>
        ))}
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-info/20 bg-info-bg p-4 text-sm leading-relaxed text-info">
          Location unavailable is checkpoint evidence only. It does not invalidate a successfully verified Handoff.
        </div>
        <div className="rounded-xl border border-warning/20 bg-warning-bg p-4 text-sm leading-relaxed text-text-secondary">
          Push or notification delivery can fail independently. The recorded business action remains authoritative.
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {scenarios.map(scenario => {
          const state = resolved[scenario.id] && scenario.outcome ? scenario.outcome : scenario
          return (
            <div key={scenario.id} className="flex flex-col">
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-text-muted">{scenario.surface}</span>
                {resolved[scenario.id] && scenario.outcome && (
                  <Button
                    variant="text"
                    size="sm"
                    onClick={() => setResolved(values => ({ ...values, [scenario.id]: false }))}
                  >
                    Reset state
                  </Button>
                )}
              </div>
              <SystemStatePanel
                kind={state.kind}
                title={state.title}
                description={state.description}
                detail={state.detail}
                actionLabel={!resolved[scenario.id] ? scenario.actionLabel : undefined}
                onAction={scenario.outcome ? () => setResolved(values => ({ ...values, [scenario.id]: true })) : undefined}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

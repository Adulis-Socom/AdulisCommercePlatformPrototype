import { Button } from '../components/ui/Button'
import { BUYERS, COURIERS, DEMO_CARTS, ORDERS, PRODUCTS, SELLERS, STAFF, SURFACE_DEFAULTS, firstName, formatEtb, orderTotals, paymentAttempts, shortName, stageFor, type OrderId } from '../demo-data'

export type FlowId = 'MASTER' | 'A' | 'B' | 'C' | 'D' | 'E' | 'E2' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L' | 'M'

export interface FlowStage {
  section: string
  target?: string
  title: string
  instruction: string
}

export interface FlowDefinition {
  id: FlowId
  title: string
  summary: string
  surfaces: string[]
  stages: FlowStage[]
}

// Record names and identifiers in the summaries and instructions are read from the canonical module (WO-001). Step
// titles stay fixed labels.
const [CHECKOUT_ORDER, SECOND_ORDER] = DEMO_CARTS
const SELLER = SELLERS[SURFACE_DEFAULTS.seller].name
const COURIER = COURIERS[SURFACE_DEFAULTS.courier].name
const BUYER = BUYERS[SURFACE_DEFAULTS.buyer].name
const sellerOf = (order: OrderId) => SELLERS[ORDERS[order].seller].name
const productOf = (order: OrderId) => PRODUCTS[ORDERS[order].lines[0].product].name
// Flow M's records (WO-006A): the canonical Buyer Collection Order, its Seller, and the team member who displays its QR.
const COLLECTION = stageFor('M', 0).focus!.order!
const COLLECTION_SELLER = SELLERS[ORDERS[COLLECTION].seller]
const COLLECTION_STAFF = ORDERS[COLLECTION].finalHandoff?.displayedBy
const PRESENTER = COLLECTION_STAFF ? shortName(STAFF[COLLECTION_STAFF].name) : COLLECTION_SELLER.name
const COLLECTOR = firstName(BUYERS[ORDERS[COLLECTION].buyer].name)

export const FLOW_DEFINITIONS: FlowDefinition[] = [
  {
    id: 'MASTER',
    title: 'ADULIS MASTER DEMO',
    summary: 'The complete buyer, seller, courier, operator, and Founder story in one presentation path.',
    surfaces: ['Website', 'Storefront', 'Buyer', 'Seller Companion', 'Courier', 'Seller Console', 'Operator'],
    stages: [
      { section: '03-website', target: 'home', title: 'Company Website', instruction: 'Explain Adulis from the public Company Website: Shoppable discovery, Seller-owned commerce, and verified fulfilment.' },
      { section: '04-storefront', title: 'Seller Storefront', instruction: `Show ${SELLER} as public Seller commerce, then open the featured ${PRODUCTS[SURFACE_DEFAULTS.product].name} Product.` },
      { section: '05-buyer', target: 'feed', title: 'Mobile For You', instruction: 'Show Shoppable discovery in For You. Open the post or use its Product hotspot to demonstrate the commerce layer.' },
      { section: '05-buyer', target: 'product', title: 'Product Detail', instruction: 'Review Product detail, Seller identity, fulfilment context, Save, Chat, and Add to Cart.' },
      { section: '05-buyer', target: 'search', title: 'Search', instruction: 'Search across Products, Shoppable Posts, and Sellers, then return to the guided path.' },
      { section: '05-buyer', target: 'multi-cart', title: 'Multi-cart', instruction: `Explain the coordinated multi-cart: ${sellerOf(CHECKOUT_ORDER)} and ${sellerOf(SECOND_ORDER)} remain separate Seller carts and Seller Orders.` },
      { section: '05-buyer', target: 'seller-checkout', title: 'Checkout + 0.5% Surcharge', instruction: `Review fulfilment, the ${formatEtb(orderTotals(CHECKOUT_ORDER).surcharge)} Adulis surcharge (0.5%), delivery fee, and final Seller Order total. Continue to payment if time allows.` },
      { section: '05-buyer', target: 'payment-success', title: 'Payment Success', instruction: 'Show provider-confirmed payment success and the newly created Paid Seller Order.' },
      { section: '06-seller-companion', target: 'paid-alert', title: 'Seller Receives Paid Order', instruction: `Open the New Paid Order alert for ${CHECKOUT_ORDER} in Seller Companion.` },
      { section: '06-seller-companion', target: 'order', title: 'Assign Courier and Mark Ready', instruction: `Prepare the Paid Order, Mark Ready, select ${COURIER}, and accept the delivery offer.` },
      { section: '06-seller-companion', target: 'pickup-qr', title: 'Seller Displays Pickup QR', instruction: 'Display the Seller Pickup QR for the sealed package and explain custody verification.' },
      { section: '07-courier', target: 'pickup-scan', title: 'Courier Scans Pickup', instruction: `Simulate ${firstName(COURIER)} scanning the Seller Pickup QR, verify pickup, and continue through the pickup checkpoint.` },
      { section: '07-courier', target: 'delivery', title: 'Courier Reaches Buyer', instruction: 'Review the recipient and delivery details at the Buyer handoff, then complete delivery.' },
      { section: '07-courier', target: 'delivery-qr', title: 'Courier Displays Delivery QR', instruction: `Display the Delivery QR to ${firstName(BUYER)} and wait for the recipient scan.` },
      { section: '05-buyer', target: 'qr-scanner', title: 'Buyer Scans', instruction: 'Open the camera, simulate the Delivery QR scan, verify the handoff, and continue.' },
      { section: '05-buyer', target: 'completed', title: 'Completed Order', instruction: 'Show the completed Seller Order and its verified fulfilment record.' },
      { section: '05-buyer', target: 'review', title: 'Review', instruction: 'Demonstrate separate Seller Service and Product Quality ratings, then submit the review.' },
      { section: '08-seller-console', target: 'products', title: 'Seller Console', instruction: 'Use the existing navigation to show Products, Content, Insights, and Couriers.' },
      { section: '09-operator-console', target: 'wq-claims', title: 'Operator Console', instruction: 'Open the Claim example in the work queue. Moderation is also available from the adjacent queue.' },
      { section: '09-operator-console', target: 'gov-approvals', title: 'Founder Approval Workflow', instruction: 'Create a proposal, switch Founder identity, and demonstrate independent approval and execution.' },
    ],
  },
  { id: 'A', title: 'Seller Acquisition', summary: 'Company Website → For Sellers → Waitlist → Success', surfaces: ['Website'], stages: [{ section: '03-website', target: 'home', title: 'Company Website', instruction: 'Open For Sellers, choose the waitlist action, complete the form, and submit to reach Success.' }] },
  { id: 'B', title: 'Social Entry to Native Product', summary: 'Social link → Storefront → Product → Open in Adulis → Mobile Product', surfaces: ['Storefront', 'Buyer'], stages: [{ section: '04-storefront', target: 'product', title: 'Social Product Link', instruction: `The social product link opens ${SELLER} Product Detail. Choose Open in Adulis.` }, { section: '05-buyer', target: 'product', title: 'Native Mobile Product', instruction: 'The transition lands on the canonical Mobile Product Detail.' }] },
  { id: 'C', title: 'Discovery to Paid Order', summary: 'For You → Shoppable Post → Product → Cart → Checkout → Payment → Paid', surfaces: ['Buyer'], stages: [{ section: '05-buyer', target: 'feed', title: 'For You to Purchase', instruction: `Open a Shoppable Post, tap a hotspot, view Product Detail, Add to Cart, checkout ${SELLER}, continue through provider payment, and choose Paid.` }] },
  { id: 'D', title: 'Multi-Seller Cart', summary: `${sellerOf(CHECKOUT_ORDER)} + ${sellerOf(SECOND_ORDER)} → Multi-cart → separate Seller Orders`, surfaces: ['Buyer'], stages: [{ section: '05-buyer', target: 'product', title: 'Add Addis Atelier Product', instruction: `Add the ${productOf(CHECKOUT_ORDER)} to its Seller-specific cart.` }, { section: '05-buyer', target: 'multi-cart', title: 'Add Nura Glow Product · Coordinated Multi-cart', instruction: `This connected transition adds the ${sellerOf(SECOND_ORDER)} ${productOf(SECOND_ORDER)} and opens the coordinated multi-cart. Review both Seller carts, then check out each as its own Seller Order: ${sellerOf(CHECKOUT_ORDER)} first, then ${sellerOf(SECOND_ORDER)}, whose first payment attempt ${paymentAttempts(SECOND_ORDER)[0].ref} fails. Retry it on the same Seller Order.` }] },
  { id: 'E', title: 'Seller Publishing', summary: 'Product creation → Publish → Shoppable Post → Tag Product → Publish', surfaces: ['Seller Console'], stages: [{ section: '08-seller-console', target: 'products', title: 'Create and Publish Product', instruction: 'Create a Product, complete its Product Editor, preview, and publish.' }, { section: '08-seller-console', target: 'content', title: 'Create Tagged Shoppable Post', instruction: 'Create a Shoppable Post, select the new same-Seller Product, add a hotspot, preview, and publish.' }] },
  { id: 'E2', title: 'Zero-Product Publishing', summary: 'Shoppable Post → zero Products → Published / Not FYP Eligible', surfaces: ['Seller Console'], stages: [{ section: '08-seller-console', target: 'content', title: 'Publish Without Products', instruction: 'Create a Shoppable Post, deselect every Product, leave hotspots off, and publish. Observe Published and Not FYP Eligible as separate states.' }] },
  { id: 'F', title: 'Courier Pool Approval', summary: `Couriers → ${firstName(COURIER)} application → Approve → future compensation`, surfaces: ['Seller Console'], stages: [{ section: '08-seller-console', target: 'couriers', title: 'Daniel Courier Application', instruction: `Open Applications, select ${COURIER}, approve the relationship, then update future compensation.` }] },
  { id: 'G', title: 'Verified Fulfilment', summary: 'Paid Order → Seller prep → Pickup QR → Courier delivery → Buyer completion', surfaces: ['Seller Companion', 'Courier', 'Buyer'], stages: [{ section: '06-seller-companion', target: 'order', title: 'Seller Preparation and Assignment', instruction: `Prepare the Paid Order, Mark Ready, select ${firstName(COURIER)}, accept the offer, and display the Seller Pickup QR.` }, { section: '07-courier', target: 'active', title: 'Courier Pickup and Delivery', instruction: 'Scan the Seller Pickup QR, verify pickup and checkpoint, complete delivery, display the Delivery QR, and wait for the recipient scan.' }, { section: '05-buyer', target: 'qr-scanner', title: 'Buyer Final Handoff', instruction: 'Scan the courier’s Delivery QR, verify the handoff, and continue to Completed Order.' }] },
  { id: 'H', title: 'Delegated Recipient', summary: 'Delegate setup → Courier final delivery → Delegate scan → Completed', surfaces: ['Buyer', 'Courier', 'Buyer'], stages: [{ section: '05-buyer', target: 'delegated-recipient', title: 'Authorize Recipient', instruction: 'Enter the delegate name and phone, review the rights boundary, and save.' }, { section: '07-courier', target: 'delivery-qr', title: 'Courier Displays Delivery QR', instruction: 'Display the Delivery QR and continue to Waiting for Recipient.' }, { section: '05-buyer', target: 'qr-scanner', title: 'Delegate Scans', instruction: 'The delegated recipient scans the courier’s QR. Verify and continue to Completed Order.' }] },
  { id: 'I', title: 'Completed Order Review', summary: 'Completed Order → separate Seller Service and Product Quality review', surfaces: ['Buyer'], stages: [{ section: '05-buyer', target: 'completed', title: 'Review Completed Order', instruction: 'Choose Review Order, score Seller Service and Product Quality separately, then submit.' }] },
  { id: 'J', title: 'Claim to Operator Case', summary: 'Order → Claim → Submit → Operator Claim Queue → Case', surfaces: ['Buyer', 'Operator'], stages: [{ section: '05-buyer', target: 'claim-start', title: 'Buyer Claim', instruction: 'Choose an issue, add details and evidence, submit, and observe Claim status.' }, { section: '09-operator-console', target: 'wq-claims', title: 'Operator Claim Case', instruction: `Open ${stageFor('J', 1).focus?.claim} from the Claims queue to review payment, handoff, evidence, and purpose-specific actions.` }] },
  { id: 'K', title: 'Reported Shoppable Post', summary: 'Buyer report → Moderation Case → Restrict → distribution removal', surfaces: ['Buyer', 'Operator'], stages: [{ section: '05-buyer', target: 'post', title: 'Buyer Reports Post', instruction: 'Choose Report on the expanded Shoppable Post, select a reason, and submit.' }, { section: '09-operator-console', target: 'wq-moderation', title: 'Moderation Restriction', instruction: `Open ${stageFor('K', 1).focus?.moderation}, choose Restrict, and observe removal from FYP and Search while Storefront impact remains explicit.` }] },
  { id: 'L', title: 'Chatbot Escalation', summary: 'Product Chat → Chatbot → Escalate → Seller Companion Inbox', surfaces: ['Buyer', 'Seller Companion'], stages: [{ section: '05-buyer', target: 'product', title: 'Product Chat and Assistant', instruction: 'Choose Chat, ask the suggested question, then escalate the unmatched Product question to the Seller.' }, { section: '06-seller-companion', target: 'inbox', title: 'Seller Companion Inbox', instruction: 'Open the escalated Buyer thread and send a human Seller reply.' }] },
  { id: 'M', title: 'Buyer Collection Final Handoff', summary: 'Ready for Collection → Seller displays Collection QR → Buyer scans → Verified → Completed', surfaces: ['Buyer', 'Seller Companion', 'Buyer'], stages: [{ section: '05-buyer', target: 'order-detail', title: 'M1 · Ready for Collection', instruction: `${COLLECTION} is Ready for Collection from ${COLLECTION_SELLER.name} in ${COLLECTION_SELLER.area}. No Collection QR exists yet: the Seller displays it only when ${COLLECTOR} is there.` }, { section: '06-seller-companion', target: 'collection-qr', title: 'M2 · Seller Displays Collection QR', instruction: `${COLLECTOR} and ${PRESENTER} meet at the ${COLLECTION_SELLER.buyerCollection?.place}. ${PRESENTER} displays the Collection QR for ${COLLECTION}: the Seller presents, ${COLLECTOR} scans.` }, { section: '05-buyer', target: 'qr-scanner', title: 'M2 · Buyer Scans Collection QR', instruction: `Open the camera, scan ${COLLECTION_SELLER.name}’s Collection QR, and complete verification. Only the verified scan completes ${COLLECTION}.` }, { section: '05-buyer', target: 'completed', title: 'M3 · Verified and Completed', instruction: `The Collection Handoff is verified and ${COLLECTION} is Completed. ${COLLECTOR} is eligible to review it; no Review is written.` }] },
]

export default function DemoFlows({ onStart }: { onStart: (id: FlowId) => void }) {
  const masterDemo = FLOW_DEFINITIONS[0]
  const supportingFlows = FLOW_DEFINITIONS.slice(1)

  return (
    <div className="mx-auto max-w-7xl p-8">
      <div className="mb-8"><div className="font-mono text-xs font-semibold uppercase tracking-widest text-brand">Presentation starting point</div><h1 className="mt-2 font-display text-4xl font-semibold">ADULIS MASTER DEMO</h1><p className="mt-2 max-w-3xl text-sm leading-relaxed text-text-secondary">A single 10–15 minute guided path through the existing Adulis prototype. The controller moves between canonical frames while preserving every underlying workflow for live interaction.</p></div>
      <div className="mb-10 overflow-hidden rounded-2xl border border-brand bg-surface shadow-lg">
        <div className="grid gap-8 p-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="flex flex-col items-start">
            <span className="rounded-full bg-brand-muted px-3 py-1 font-mono text-xs font-bold text-brand-dark">20 STEPS · 7 SURFACES</span>
            <div className="mt-4 font-display text-3xl font-semibold">{masterDemo.title}</div>
            <p className="mt-3 text-sm leading-relaxed text-text-secondary">{masterDemo.summary}</p>
            <div className="mt-5 flex flex-wrap gap-1.5">{masterDemo.surfaces.map((surface, index) => <span key={`${surface}-${index}`} className="rounded-full bg-surface-raised px-2.5 py-1 text-xs font-semibold text-text-muted">{surface}</span>)}</div>
            <Button size="lg" onClick={() => onStart('MASTER')} style={{ marginTop: 24 }}>Start master demo</Button>
          </div>
          <div className="grid grid-cols-2 gap-x-5 gap-y-2 rounded-xl bg-surface-raised p-4">
            {masterDemo.stages.map((stage, index) => (
              <div key={`${stage.section}-${stage.title}`} className="flex min-w-0 items-center gap-2 border-b border-border py-1.5 last:border-b-0">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-surface font-mono text-[10px] font-bold text-brand">{index + 1}</span>
                <span className="truncate text-xs font-medium text-text-secondary">{stage.title}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mb-4"><div className="font-display text-2xl font-semibold">Supporting flows</div><p className="mt-1 text-sm text-text-secondary">Focused journeys remain available for feature-level walkthroughs and testing.</p></div>
      <div className="grid grid-cols-3 gap-4">
        {supportingFlows.map(flow => <button key={flow.id} onClick={() => onStart(flow.id)} className="group flex min-h-56 flex-col rounded-2xl border border-border bg-surface p-5 text-left shadow-sm transition hover:border-brand"><div className="flex items-start justify-between"><span className="flex h-10 min-w-10 items-center justify-center rounded-xl bg-brand-muted px-2 font-mono text-xs font-bold text-brand-dark">FLOW {flow.id}</span><span className="text-xl text-text-muted group-hover:text-brand">→</span></div><div className="mt-5 font-display text-xl font-semibold">{flow.title}</div><p className="mt-2 flex-1 text-sm leading-relaxed text-text-secondary">{flow.summary}</p><div className="mt-4 flex flex-wrap gap-1.5">{flow.surfaces.map((surface, index) => <span key={`${surface}-${index}`} className="rounded-full bg-surface-raised px-2 py-1 text-[10px] font-semibold text-text-muted">{surface}</span>)}</div><div className="mt-4 text-xs font-semibold text-brand">Start guided flow</div></button>)}
      </div>
    </div>
  )
}

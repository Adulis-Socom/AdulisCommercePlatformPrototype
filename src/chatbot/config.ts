// Seller chatbot configuration (BOT-004): structured knowledge and policy the engine may use. It only EXTENDS canonical facts; the
// Product, Seller and Fulfilment records are reused, never re-entered. Missing knowledge restricts automation, never publication.
import type { ProductKnowledge, SellerReturns } from './types.ts'

export interface BotConfig {
  /** Seller switch: off means every Buyer Message goes to a person with a static status. */
  enabled: boolean
  returns: SellerReturns
  /** 'yes' needs a summary; 'no' means the Seller states there is no warranty (nothing is said); '' is not configured. */
  warrantyOffered: 'yes' | 'no' | ''
  warranty: string
  /** Seller-wide measurement chart; a Product's own chart wins. */
  sizeGuide: string
  collectionHours: string
  /** Where human handoffs go (shown in the Console; never promised to the Buyer as a time). */
  handoffRoute: string
  products: Record<string, ProductKnowledge>
  /** Scene id -> English context summary (purpose, styling, how the tagged Products combine). */
  scenes: Record<string, string>
}

export const blankBotConfig = (): BotConfig => ({
  enabled: true, returns: { eligibility: '', window: '', condition: '', process: '' }, warrantyOffered: '', warranty: '', sizeGuide: '', collectionHours: '', handoffRoute: '', products: {}, scenes: {},
})

export interface ReadinessLine { key: string; label: string; status: 'ready' | 'missing' | 'not-needed'; effect: string }

/** What the Seller's knowledge covers. A gap names what the assistant will NOT answer; publication is unaffected. */
export function botReadiness(config: BotConfig, ctx: { collectionOn: boolean; publicSceneCount: number; scenesWithContext: number }): ReadinessLine[] {
  const r = config.returns
  const returnsMissing = (['eligibility', 'window', 'condition', 'process'] as const).filter(k => !r[k].trim())
  return [
    { key: 'returns', label: 'Returns and exchanges', status: returnsMissing.length ? 'missing' : 'ready', effect: returnsMissing.length ? `Returns questions go to you (missing: ${returnsMissing.join(', ')}).` : 'Returns questions are answered from this policy.' },
    { key: 'warranty', label: 'Warranty and service', status: config.warrantyOffered === 'yes' && config.warranty.trim() ? 'ready' : config.warrantyOffered === 'no' ? 'not-needed' : 'missing', effect: config.warrantyOffered === 'yes' && config.warranty.trim() ? 'Warranty questions are answered from your summary.' : config.warrantyOffered === 'no' ? 'You state there is no warranty: the assistant says nothing about one and offers you the question.' : 'Warranty questions go to you.' },
    { key: 'size', label: 'Sizing and measurements', status: config.sizeGuide.trim() || Object.values(config.products).some(p => p.sizeGuide?.trim()) ? 'ready' : 'missing', effect: 'Without a chart, size questions go to you. The assistant never guesses a fit.' },
    { key: 'hours', label: 'Collection hours', status: !ctx.collectionOn ? 'not-needed' : config.collectionHours.trim() ? 'ready' : 'missing', effect: ctx.collectionOn ? 'Without hours the assistant states the collection place only if you set one in Store setup.' : 'Buyer Collection is off.' },
    { key: 'scenes', label: 'Scene context', status: ctx.publicSceneCount === 0 ? 'not-needed' : ctx.scenesWithContext >= ctx.publicSceneCount ? 'ready' : 'missing', effect: 'Scenes without context are listed by their tagged Products only; "what is this look" goes to you.' },
    { key: 'handoff', label: 'Human handoff route', status: config.handoffRoute.trim() ? 'ready' : 'missing', effect: 'Handoffs always reach the Inbox; this note tells your team who answers.' },
  ]
}

// DEMO-002: Operator moderation of the two kinds of simulated content the dataset marks for moderation: shared Courier comments (courier_comments.moderation_state)
// and purchased reviews (reviews.visibility / moderation_note). Pure TypeScript. An Operator approves (shown and counted) or hides (neither shown nor counted)
// one record; the decision is a session action over the seed, namespaced and cleared by "Reset simulation". It changes visibility only: no Order, stock, Cart, money,
// Trust or chatbot template is touched, and the Operator gets no other power here.
import type { Action, Result, SimState } from './orders.ts'

export const HIDDEN = 'HIDDEN_MODERATION'
const SHARED = 'PROPOSED_SHARED_ELIGIBLE_SELLERS', VISIBLE = 'VISIBLE_FIXTURE'
const fail = (code: string, reason: string): Result => ({ ok: false, code, reason })
type ModAction = Extract<Action, { type: 'MODERATE' }>

export function moderationAction(s: SimState, a: ModAction): Result {
  if (a.actor.role !== 'OPERATOR') return fail('WRONG_PARTY', 'Only an Operator moderates content')
  if (a.decision !== 'APPROVE' && a.decision !== 'HIDE') return fail('BAD_DECISION', 'Choose approve or hide')
  const approve = a.decision === 'APPROVE'
  if (a.kind === 'COMMENT') {
    const c = s.comments[a.id]
    if (!c) return fail('NO_RECORD', `Unknown comment ${a.id}`)
    const visible = c.visibility === SHARED && c.moderation === VISIBLE
    if (approve && visible) return fail('ALREADY', `${a.id} is already visible`)
    if (!approve && c.moderation === HIDDEN) return fail('ALREADY', `${a.id} is already hidden`)
    const next = approve ? { ...c, visibility: SHARED, moderation: VISIBLE } : { ...c, moderation: HIDDEN }
    return { ok: true, state: { ...s, comments: { ...s.comments, [a.id]: next } }, note: approve ? `Comment ${a.id} approved: shared with eligible Sellers and counted` : `Comment ${a.id} hidden: not shown and not counted` }
  }
  const r = s.reviews[a.id]
  if (!r) return fail('NO_RECORD', `Unknown review ${a.id}`)
  if (approve && r.visibility === 'PUBLISHED') return fail('ALREADY', `${a.id} is already published`)
  if (!approve && r.visibility !== 'PUBLISHED') return fail('ALREADY', `${a.id} is already hidden`)
  const next = approve ? { ...r, visibility: 'PUBLISHED', moderationNote: null } : { ...r, visibility: HIDDEN, moderationNote: 'Hidden by an Operator in this session (simulation)' }
  return { ok: true, state: { ...s, reviews: { ...s.reviews, [a.id]: next } }, note: approve ? `Review ${a.id} approved: published and counted` : `Review ${a.id} hidden: excluded from every rating` }
}

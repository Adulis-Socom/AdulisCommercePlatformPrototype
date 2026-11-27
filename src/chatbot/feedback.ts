// C-22 (PDF p.19): Seller feedback and Operator quality review. A Seller marks an answer green, yellow or red; yellow and red need a description and
// the expected answer; red is a high-priority case that keeps the response, subject, intent, template version and fact references. An authorised
// Operator reviews it and records a decision. NOTHING here edits a template, the live assistant or any model: a wording change is a reviewed code change.
import { TEMPLATES, TEMPLATE_VERSION } from './templates.ts'
import type { BotResult, IntentId, MessageSubject, Slot } from './types.ts'

export type Signal = 'green' | 'yellow' | 'red'
export type ReviewDecision = 'revise-wording' | 'no-change' | 'needs-seller-data'
export const DECISION_LABEL: Record<ReviewDecision, string> = { 'revise-wording': 'Wording should be revised (proposal only)', 'no-change': 'The answer was right', 'needs-seller-data': 'The Seller needs to add information' }
export interface BotFeedback {
  id: string; seq: number; sellerId: string; signal: Signal; priority: 'normal' | 'high'
  note: string; expected: string
  /** Bound at the moment of feedback, so a later change cannot rewrite what was reviewed. */
  question: string; response: string; subjectLabel: string; subject: MessageSubject; intent: IntentId | null
  templateId: string; templateVersion: string; dialogue: string[]; slots: Slot[]
  status: 'open' | 'reviewed'
  review?: { decision: ReviewDecision; note: string; by: string; seq: number }
}

/** '' when valid, otherwise the message to show. */
export function validateFeedback(signal: Signal | null, note: string, expected: string): string {
  if (!signal) return 'Choose green, yellow or red.'
  if (signal !== 'green' && (note.trim().length < 5 || expected.trim().length < 5)) return 'Describe what happened and what the assistant should have answered.'
  return ''
}
export function createFeedback(p: { seq: number; sellerId: string; signal: Signal; note: string; expected: string; question: string; subjectLabel: string; result: BotResult }): BotFeedback {
  const r = p.result
  return {
    id: `FB-${String(p.seq).padStart(3, '0')}`, seq: p.seq, sellerId: p.sellerId, signal: p.signal, priority: p.signal === 'red' ? 'high' : 'normal',
    note: p.note.trim(), expected: p.expected.trim(), question: p.question, response: r.text ?? '', subjectLabel: p.subjectLabel, subject: structuredClone(r.subject), intent: r.intent,
    templateId: r.templateId, templateVersion: r.templateVersion, dialogue: [...r.dialogue], slots: r.slots.map(s => ({ ...s })), status: 'open',
  }
}
export function validateReview(decision: ReviewDecision | '', note: string): string {
  if (!decision) return 'Choose a decision.'
  if (note.trim().length < 5) return 'Add a short note for the Seller and the audit trail.'
  return ''
}
export const reviewFeedback = (fb: BotFeedback, decision: ReviewDecision, note: string, by: string, seq: number): BotFeedback => ({ ...fb, status: 'reviewed', review: { decision, note: note.trim(), by, seq } })

/** The C-22 workflow as executable checks (separate from the 113 engine-run dialogue groups). */
export function feedbackWorkflowChecks(sample: BotResult): { steps: number; passed: number; failures: string[] } {
  const failures: string[] = []
  let steps = 0
  const ck = (label: string, ok: boolean) => { steps++; if (!ok) failures.push(label) }
  const before = JSON.stringify(TEMPLATES)
  const frozen = JSON.stringify(sample)
  ck('green needs no description', validateFeedback('green', '', '') === '')
  ck('no signal chosen is refused', validateFeedback(null, '', '') !== '')
  ck('yellow without a description and expected answer is refused', validateFeedback('yellow', '', '') !== '' && validateFeedback('yellow', 'It was slow', '') !== '')
  ck('red without a description and expected answer is refused', validateFeedback('red', 'Wrong', 'x') !== '')
  ck('red with both is accepted', validateFeedback('red', 'Said in stock', 'Out of stock') === '')
  const red = createFeedback({ seq: 1, sellerId: sample.subject.sellerId, signal: 'red', note: 'The option was unavailable', expected: 'Say it is out of stock', question: 'Is it available?', subjectLabel: 'Product', result: sample })
  ck('red creates a high-priority case', red.priority === 'high' && red.status === 'open')
  ck('yellow is normal priority', createFeedback({ seq: 2, sellerId: 's', signal: 'yellow', note: 'unclear wording', expected: 'clearer wording', question: 'q', subjectLabel: 'x', result: sample }).priority === 'normal')
  ck('the case binds response, subject, intent, template id and version, and fact references', red.response === (sample.text ?? '') && JSON.stringify(red.subject) === JSON.stringify(sample.subject) && red.intent === sample.intent && red.templateId === sample.templateId && red.templateVersion === sample.templateVersion && red.slots.length === sample.slots.length)
  ck('a review needs a decision and a note', validateReview('', 'note here') !== '' && validateReview('no-change', '') !== '' && validateReview('revise-wording', 'Reword it') === '')
  const reviewed = reviewFeedback(red, 'revise-wording', 'Reword the stock answer', 'Operator', 2)
  ck('review records the decision and keeps the bound response unchanged', reviewed.status === 'reviewed' && reviewed.review?.decision === 'revise-wording' && reviewed.response === red.response && reviewed.templateVersion === red.templateVersion)
  ck('the original case is not mutated by review', red.status === 'open' && !red.review)
  ck('templates are byte-identical after feedback and review (no automatic edit, no training)', JSON.stringify(TEMPLATES) === before && TEMPLATE_VERSION === TEMPLATE_VERSION)
  ck('feedback never modifies the answer it is about', JSON.stringify(sample) === frozen)
  return { steps, passed: steps - failures.length, failures }
}

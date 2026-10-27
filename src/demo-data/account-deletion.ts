// Account Deletion's shared wording (specification §12; refinement PR-006): what deleting an account means and the
// optional reasons. The Company Website's Account Deletion page and the Buyer app's Delete Account both show it, so the
// two ways in state one deletion policy. Presentation only: it holds no demo facts, and the Platform's deletion rules
// (the capability, the blocking Orders and the result) are derived.ts's.

/** What deleting an account means, as both deletion flows list it. */
export const DELETION_CONSEQUENCES: readonly string[] = [
  'Any open orders will need to be resolved before deletion can proceed.',
  'Your transaction history will be retained for 7 years as required by our data retention policy.',
  'Your seller storefront, if active, will be unpublished immediately.',
  'You will lose access to your order history, reviews, and saved content.',
]

/** The optional reasons for deleting, offered at the explicit confirmation. */
export const DELETION_REASONS: readonly string[] = [
  "I'm not using the platform",
  'I have privacy concerns',
  'I had a bad experience',
  "I'm switching to another platform",
  'Prefer not to say',
]

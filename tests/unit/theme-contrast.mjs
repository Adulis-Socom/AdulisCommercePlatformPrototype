// DESIGN-001 (FR-013): the CTO Theme Lab palette. It uses exactly the specified hex values, and every text/background token pair its surfaces use
// reaches WCAG AA (4.5:1 normal text, 3:1 large text and UI components). Pure maths on the token map (no browser): `node tests/unit/theme-contrast.mjs`
import { CTO, PALETTES, BASELINE_ID, isFixed } from '../../src/theme/palettes.ts'
import { ctoTokens, contrast } from '../../src/theme/tokens.ts'

let pass = 0, fail = 0
const ck = (label, ok, detail) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${ok ? '' : ' — ' + JSON.stringify(detail)?.slice(0, 300)}`); ok ? pass++ : fail++ }
const T = ctoTokens(CTO)
const r2 = n => Math.round(n * 100) / 100

// ---- the specified values, exactly ----
const L = CTO.light
ck('Primary #111111', L.primary === '#111111')
ck('Secondary #F4F5F7', L.secondary === '#F4F5F7')
ck('Accent #C4FE29', L.accent === '#C4FE29')
ck('Danger/Like #EF4444', CTO.extras.danger === '#EF4444')
ck('Gray text #7E8494', CTO.extras.gray === '#7E8494')
ck('Border #E5E7EB', L.border === '#E5E7EB')
ck('Background #F5F5F7, surfaces white, text #111111', L.background === '#F5F5F7' && L.surface === '#FFFFFF' && L.text === '#111111')
ck('CTO is registered, selectable, Light-only (no Dark roles) and Baseline is still first and unchanged', PALETTES.includes(CTO) && isFixed(CTO) && !CTO.dark && PALETTES[0].id === BASELINE_ID && PALETTES[0].light.primary === '#A04720')
ck('the tokens carry the specified values themselves', T['--adulis-primary'] === '#111111' && T['--adulis-accent'] === '#C4FE29' && T['--adulis-border'] === '#E5E7EB' && T['--adulis-background'] === '#F5F5F7' && T['--adulis-like'] === '#EF4444' && T['--adulis-danger-fill'] === '#EF4444' && T['--adulis-gray'] === '#7E8494' && T['--adulis-border-strong'] === '#7E8494')

// ---- what the specified colours cannot carry, and what is derived instead ----
const grayOnWhite = contrast(CTO.extras.gray, L.surface), dangerOnWhite = contrast(CTO.extras.danger, L.surface)
console.log(`INFO Gray #7E8494 on white ${r2(grayOnWhite)}:1; Danger #EF4444 on white ${r2(dangerOnWhite)}:1; white on lime ${r2(contrast('#FFFFFF', L.accent))}:1; lime on white ${r2(contrast(L.accent, L.surface))}:1; ink on lime ${r2(contrast(L.text, L.accent))}:1`)
ck('the specified Gray is below AA on white (so it is not small text) but is a legible UI/large-text colour (>= 3:1)', grayOnWhite < 4.5 && grayOnWhite >= 3, grayOnWhite)
ck('the specified Danger is below AA as small text on white (so text uses a derived red) but a legible heart/UI colour (>= 3:1)', dangerOnWhite < 4.5 && dangerOnWhite >= 3, dangerOnWhite)
ck('lime is not a legible text or outline colour on white (< 3:1): never used as either', contrast(L.accent, L.surface) < 3)
ck('white on lime would fail AA, so the ink on lime is the dark ink, never white', contrast('#FFFFFF', L.accent) < 4.5 && T['--adulis-cta-label'] === '#111111' && T['--adulis-on-accent'] === '#111111')

// ---- every declared text/background pair ----
const surfaces = ['--adulis-surface', '--adulis-background', '--adulis-surface-secondary', '--adulis-primary-soft']
const pairs = [
  // [foreground token, [background tokens], minimum ratio, what it is]
  ['--adulis-text', surfaces, 4.5, 'body text'],
  ['--adulis-secondary-text', surfaces, 4.5, 'secondary body text (the derived darker gray)'],
  ['--adulis-muted-text', surfaces, 4.5, 'muted / caption text (the lightest gray that reaches AA)'],
  ['--adulis-primary-text', surfaces, 4.5, 'links, active labels, prices'],
  ['--adulis-primary-strong', surfaces, 4.5, 'pressed / strong brand text'],
  ['--adulis-on-primary', ['--adulis-primary', '--adulis-primary-hover'], 4.5, 'label on a primary (ink) fill'],
  ['--adulis-on-primary-muted', ['--adulis-primary'], 4.5, 'secondary copy on a primary band'],
  ['--adulis-cta-label', ['--adulis-cta', '--adulis-cta-hover', '--adulis-cta-active'], 4.5, 'label on the lime call to action'],
  ['--adulis-on-accent', ['--adulis-accent'], 4.5, 'text on a lime fill'],
  ['--adulis-on-secondary', ['--adulis-secondary'], 4.5, 'text on the Secondary fill'],
  ['--adulis-on-danger-fill', ['--adulis-danger-fill'], 4.5, 'label on the #EF4444 destructive fill'],
  ['--adulis-accent-on-dark', ['--adulis-ink'], 4.5, 'lime text on the fixed dark bands'],
  ['--adulis-operator-text', ['--adulis-operator-bg', '--adulis-operator-surface', '--adulis-operator-raised'], 4.5, 'Operator body text'],
  ['--adulis-operator-muted', ['--adulis-operator-bg', '--adulis-operator-surface', '--adulis-operator-raised'], 4.5, 'Operator muted text'],
  ['--adulis-operator-accent', ['--adulis-operator-bg', '--adulis-operator-surface', '--adulis-operator-raised'], 4.5, 'Operator accent text'],
  ['--adulis-inverse-text', ['--adulis-ink'], 4.5, 'light text on the dark immersive surfaces'],
]
for (const status of ['success', 'warning', 'danger', 'info', 'courier']) {
  pairs.push([`--adulis-${status}`, [...surfaces, `--adulis-${status}-soft`], 4.5, `${status} text and icons`])
  pairs.push(['--adulis-on-status', [`--adulis-${status}`], 4.5, `label on a ${status} fill`])
}
// Non-text UI components and indicators: 3:1.
const ui = [
  ['--adulis-focus-ring', ['--adulis-surface', '--adulis-background'], 3, 'keyboard focus ring'],
  ['--adulis-border-strong', ['--adulis-surface', '--adulis-background'], 3, 'input / control boundary (the specified Gray)'],
  ['--adulis-like', ['--adulis-surface', '--adulis-background'], 3, 'like heart (#EF4444)'],
  ['--adulis-primary', ['--adulis-surface', '--adulis-background'], 3, 'primary fill / icon'],
]
for (const [fg, bgs, min, what] of [...pairs, ...ui]) {
  for (const bg of bgs) {
    const ratio = contrast(T[fg], T[bg])
    ck(`${what}: ${fg} ${T[fg]} on ${bg} ${T[bg]} = ${r2(ratio)}:1 (>= ${min})`, ratio >= min, ratio)
  }
}

// ---- sparing lime ----
const limeTokens = Object.entries(T).filter(([, v]) => String(v).toUpperCase() === L.accent).map(([k]) => k).sort()
console.log('INFO tokens that are lime:', limeTokens.join(', '))
ck('lime is only the accent, the call to action and the on-dark mark (never a surface, text or border token)', JSON.stringify(limeTokens) === JSON.stringify(['--adulis-accent', '--adulis-accent-on-dark', '--adulis-cta']), limeTokens)
ck('no tint of lime is a surface (accent-soft is the neutral Secondary, so a hero band is never lime)', T['--adulis-accent-soft'] === L.secondary)

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)

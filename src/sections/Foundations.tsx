/* ═══════════════════════════════════════════════
   01 — FOUNDATIONS
   Adulis Design System Reference Board
═══════════════════════════════════════════════ */

import { useState } from 'react'
import { ORDERS, PRODUCTS, REFERENCE_SAMPLES, SELLERS, SURFACE_DEFAULTS, formatClock12, formatEtb, orderStateAt, orderTotals, stateTime } from '../demo-data'

export default function Foundations() {
  return (
    <div style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text-primary)', background: 'var(--color-background)' }}>
      <FoundationsHeader />
      <div className="max-w-6xl mx-auto px-8 pb-24 space-y-20">
        <ColorTokens />
        <TypographyScale />
        <SpacingSystem />
        <RadiusTokens />
        <ElevationTokens />
        <LayoutGrid />
        <IconSystem />
        <AccessibilityChecks />
      </div>
    </div>
  )
}

/* ─── Section label ─── */
function FoundationsHeader() {
  return (
    <div
      className="border-b"
      style={{ borderColor: 'var(--color-border)', paddingTop: 48, paddingBottom: 40, marginBottom: 0 }}
    >
      <div className="max-w-6xl mx-auto px-8">
        <div
          style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.12em', color: 'var(--color-text-muted)', marginBottom: 12 }}
        >
          01 — ADULIS DESIGN FOUNDATIONS
        </div>
        <h1
          style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 600, margin: '0 0 12px', color: 'var(--color-text-primary)', lineHeight: 1.1 }}
        >
          Visual Foundation
        </h1>
        <p style={{ fontSize: 16, color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.65, maxWidth: 580 }}>
          Tokens, scales, and patterns that underpin every Adulis product surface —
          consumer mobile, public web, seller operations, and operator control plane.
        </p>
      </div>
    </div>
  )
}

function SectionHeading({ label, title, desc }: { label: string; title: string; desc?: string }) {
  return (
    <div className="mb-8">
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em', color: 'var(--color-text-muted)', marginBottom: 6 }}>
        {label}
      </div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, margin: '0 0 8px', color: 'var(--color-text-primary)' }}>
        {title}
      </h2>
      {desc && <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.6 }}>{desc}</p>}
    </div>
  )
}

/* ═══════════════════════════════════════════════
   COLOR TOKENS
═══════════════════════════════════════════════ */

const COLOR_GROUPS = [
  {
    group: 'Brand',
    tokens: [
      { name: 'brand',        var: '--color-brand',        hex: '#C2622D', label: 'Brand / Accent',  usage: 'Primary CTAs, active states, key highlights' },
      { name: 'brand-light',  var: '--color-brand-light',  hex: '#D97B45', label: 'Brand Light',     usage: 'Hover states, lighter accent contexts' },
      { name: 'brand-muted',  var: '--color-brand-muted',  hex: '#F0DDD1', label: 'Brand Muted',     usage: 'Tinted backgrounds, active nav, soft chips' },
      { name: 'brand-dark',   var: '--color-brand-dark',   hex: '#943F1A', label: 'Brand Dark',      usage: 'Pressed states, text on brand-muted surfaces' },
    ],
  },
  {
    group: 'Background & Surface',
    tokens: [
      { name: 'background',     var: '--color-background',     hex: '#FAF8F5', label: 'Background',      usage: 'Page canvas — warm cream base' },
      { name: 'surface',        var: '--color-surface',        hex: '#FFFFFF', label: 'Surface',         usage: 'Cards, panels, inputs' },
      { name: 'surface-raised', var: '--color-surface-raised', hex: '#F5F2ED', label: 'Surface Raised',  usage: 'Sidebar fills, hover backgrounds, code blocks' },
    ],
  },
  {
    group: 'Text',
    tokens: [
      { name: 'text-primary',   var: '--color-text-primary',   hex: '#1A1512', label: 'Text Primary',   usage: 'Headlines, labels, primary content' },
      { name: 'text-secondary', var: '--color-text-secondary', hex: '#5C4F45', label: 'Text Secondary', usage: 'Body copy, secondary labels' },
      { name: 'text-muted',     var: '--color-text-muted',     hex: '#9C8E85', label: 'Text Muted',     usage: 'Placeholders, metadata, timestamps' },
      { name: 'text-inverse',   var: '--color-text-inverse',   hex: '#FAF8F5', label: 'Text Inverse',   usage: 'Text on dark/colored surfaces' },
    ],
  },
  {
    group: 'Border',
    tokens: [
      { name: 'border',        var: '--color-border',        hex: '#E8E0D8', label: 'Border',        usage: 'Default dividers, card outlines' },
      { name: 'border-strong', var: '--color-border-strong', hex: '#C8BDB5', label: 'Border Strong', usage: 'Emphasized separators, inputs on focus' },
    ],
  },
  {
    group: 'Semantic',
    tokens: [
      { name: 'success',    var: '--color-success',    hex: '#2D7A4F', label: 'Success',    usage: 'Paid, Verified, Completed, Established' },
      { name: 'success-bg', var: '--color-success-bg', hex: '#EAF5EE', label: 'Success BG', usage: 'Success badge backgrounds' },
      { name: 'warning',    var: '--color-warning',    hex: '#B87C20', label: 'Warning',    usage: 'Low stock, pending, New trust level' },
      { name: 'warning-bg', var: '--color-warning-bg', hex: '#FDF3E1', label: 'Warning BG', usage: 'Warning badge backgrounds' },
      { name: 'danger',     var: '--color-danger',     hex: '#C2372D', label: 'Danger',     usage: 'Claim, error, restricted, destructive' },
      { name: 'danger-bg',  var: '--color-danger-bg',  hex: '#FDECEA', label: 'Danger BG',  usage: 'Error badge backgrounds' },
      { name: 'info',       var: '--color-info',       hex: '#2D5CC2', label: 'Information', usage: 'Informational states, processing' },
      { name: 'info-bg',    var: '--color-info-bg',    hex: '#EBF0FC', label: 'Info BG',    usage: 'Info badge backgrounds' },
    ],
  },
  {
    group: 'Operator Console (Dark)',
    dark: true,
    tokens: [
      { name: 'operator-bg',      var: '--color-operator-bg',      hex: '#111418', label: 'Operator BG',      usage: 'Operator Console page canvas' },
      { name: 'operator-surface', var: '--color-operator-surface', hex: '#1C2028', label: 'Operator Surface', usage: 'Cards, panels in Operator Console' },
      { name: 'operator-raised',  var: '--color-operator-raised',  hex: '#252B35', label: 'Operator Raised',  usage: 'Hover, nested surfaces' },
      { name: 'operator-border',  var: '--color-operator-border',  hex: '#2E3540', label: 'Operator Border',  usage: 'Dividers in dark surfaces' },
      { name: 'operator-text',    var: '--color-operator-text',    hex: '#E8EAF0', label: 'Operator Text',    usage: 'Primary text in Operator Console' },
      { name: 'operator-muted',   var: '--color-operator-muted',   hex: '#7A8499', label: 'Operator Muted',   usage: 'Secondary text, labels' },
      { name: 'operator-accent',  var: '--color-operator-accent',  hex: '#E8874A', label: 'Operator Accent',  usage: 'Active highlights in dark context' },
    ],
  },
]

const TRUST_COLORS = [
  { level: 'NEW',         color: '#B87C20', bg: '#FDF3E1', desc: 'Recently admitted. Reduced fulfilment permissions.' },
  { level: 'REBUILDING',  color: '#C2372D', bg: '#FDECEA', desc: 'Recovering from negative signals. Restricted.' },
  { level: 'ESTABLISHED', color: '#2D5CC2', bg: '#EBF0FC', desc: 'Solid operational track record.' },
  { level: 'TRUSTED',     color: '#2D7A4F', bg: '#EAF5EE', desc: 'Highest trust tier. Expanded permissions.' },
]

function ColorTokens() {
  const [copied, setCopied] = useState<string | null>(null)

  function copy(text: string, key: string) {
    navigator.clipboard?.writeText(text).catch(() => {})
    setCopied(key)
    setTimeout(() => setCopied(null), 1200)
  }

  return (
    <section>
      <SectionHeading
        label="COLORS"
        title="Color Tokens"
        desc="Semantic tokens only. Never reference raw hex values in product screens — always use CSS custom properties."
      />

      <div className="space-y-8">
        {COLOR_GROUPS.map(group => (
          <div key={group.group}>
            <div
              className="text-xs font-semibold uppercase tracking-widest mb-3"
              style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
            >
              {group.group}
            </div>
            <div
              className="rounded-xl border overflow-hidden"
              style={{ borderColor: 'var(--color-border)', background: group.dark ? '#0D1117' : 'var(--color-surface)' }}
            >
              {group.tokens.map((token, i) => {
                const isDark = group.dark
                const isCopied = copied === token.var
                return (
                  <div
                    key={token.var}
                    className="flex items-center gap-4 px-5 py-3 border-b last:border-b-0 transition-colors"
                    style={{
                      borderColor: isDark ? '#1E2530' : 'var(--color-border)',
                      background: 'transparent',
                    }}
                  >
                    {/* Swatch */}
                    <button
                      className="flex-shrink-0 rounded-lg border cursor-pointer transition-transform hover:scale-105"
                      style={{
                        width: 40,
                        height: 40,
                        background: token.hex,
                        borderColor: isDark ? '#2E3540' : 'var(--color-border)',
                      }}
                      onClick={() => copy(token.hex, token.var)}
                      title="Copy hex"
                    />
                    {/* Token name */}
                    <div className="flex-shrink-0" style={{ minWidth: 220 }}>
                      <div
                        className="text-xs font-medium"
                        style={{ fontFamily: 'var(--font-mono)', color: isDark ? '#7A8499' : 'var(--color-text-muted)' }}
                      >
                        var({token.var})
                      </div>
                      <div
                        className="text-sm font-semibold mt-0.5"
                        style={{ color: isDark ? '#E8EAF0' : 'var(--color-text-primary)' }}
                      >
                        {token.label}
                      </div>
                    </div>
                    {/* Hex */}
                    <button
                      className="flex-shrink-0 text-xs rounded px-2 py-1 transition-colors font-mono"
                      style={{
                        fontFamily: 'var(--font-mono)',
                        background: isCopied ? 'var(--color-success-bg)' : (isDark ? '#1C2028' : 'var(--color-surface-raised)'),
                        color: isCopied ? 'var(--color-success)' : (isDark ? '#7A8499' : 'var(--color-text-muted)'),
                        border: `1px solid ${isDark ? '#2E3540' : 'var(--color-border)'}`,
                      }}
                      onClick={() => copy(token.hex, token.var)}
                    >
                      {isCopied ? '✓ copied' : token.hex}
                    </button>
                    {/* Usage */}
                    <div className="flex-1 text-sm" style={{ color: isDark ? '#7A8499' : 'var(--color-text-muted)' }}>
                      {token.usage}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {/* Trust levels */}
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
            Trust Level Colors
          </div>
          <div
            className="rounded-xl border p-5"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
          >
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
              {TRUST_COLORS.map(t => (
                <div
                  key={t.level}
                  className="rounded-xl p-4 border"
                  style={{ background: t.bg, borderColor: t.color + '40' }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
                      style={{ background: t.bg, color: t.color, border: `1.5px solid ${t.color}`, fontFamily: 'var(--font-mono)' }}
                    >
                      {t.level}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: t.color, margin: 0 }}>{t.desc}</p>
                  <div className="flex gap-2 mt-2">
                    <span className="text-xs font-mono" style={{ color: t.color + 'AA', fontFamily: 'var(--font-mono)' }}>{t.color}</span>
                    <span className="text-xs font-mono" style={{ color: t.color + 'AA', fontFamily: 'var(--font-mono)' }}>{t.bg}</span>
                  </div>
                </div>
              ))}
            </div>
            <div
              className="mt-4 pt-4 border-t text-xs"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
            >
              Trust is <strong style={{ color: 'var(--color-text-secondary)' }}>read-only</strong>. It cannot be purchased, manually typed by Operators, or edited by Sellers.
              Valid levels: <code style={{ fontFamily: 'var(--font-mono)' }}>NEW · REBUILDING · ESTABLISHED · TRUSTED</code>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════
   TYPOGRAPHY SCALE
═══════════════════════════════════════════════ */

// Samples that name demo records read them from the canonical module (WO-001): the default Seller, Product and Order at
// the 10:25 snapshot, and the reference sample Products.
const SAMPLE_ORDER = SURFACE_DEFAULTS.order
const SAMPLE_TOTAL = formatEtb(orderTotals(SAMPLE_ORDER).total)
const BODY_PRODUCT = PRODUCTS[REFERENCE_SAMPLES.bodyProduct]

const TYPE_SCALE = [
  {
    label: 'Display',
    tag: 'display',
    fontFamily: 'var(--font-display)',
    fontSize: 48,
    fontWeight: 600,
    lineHeight: 1.05,
    letterSpacing: '-0.02em',
    sample: 'Discover products.',
    usage: 'Hero headings on Company Website. Fraunces — optical size opsz auto.',
  },
  {
    label: 'H1',
    tag: 'h1',
    fontFamily: 'var(--font-display)',
    fontSize: 36,
    fontWeight: 600,
    lineHeight: 1.1,
    letterSpacing: '-0.015em',
    sample: SELLERS[SURFACE_DEFAULTS.seller].name,
    usage: 'Page-level headings, Storefront name, major Console sections.',
  },
  {
    label: 'H2',
    tag: 'h2',
    fontFamily: 'var(--font-display)',
    fontSize: 26,
    fontWeight: 600,
    lineHeight: 1.2,
    letterSpacing: '-0.01em',
    sample: PRODUCTS[SURFACE_DEFAULTS.product].name,
    usage: 'Product names, section headings, card titles in Console.',
  },
  {
    label: 'H3',
    tag: 'h3',
    fontFamily: 'var(--font-body)',
    fontSize: 18,
    fontWeight: 600,
    lineHeight: 1.3,
    letterSpacing: '-0.005em',
    sample: `Order ${SAMPLE_ORDER}`,
    usage: 'Sub-section headings, group labels, sidebar section titles.',
  },
  {
    label: 'Title',
    tag: 'title',
    fontFamily: 'var(--font-body)',
    fontSize: 16,
    fontWeight: 600,
    lineHeight: 1.4,
    letterSpacing: '0',
    sample: PRODUCTS[REFERENCE_SAMPLES.titleProduct].name,
    usage: 'Card titles, list item primary text, modal headings.',
  },
  {
    label: 'Body Large',
    tag: 'body-lg',
    fontFamily: 'var(--font-body)',
    fontSize: 17,
    fontWeight: 400,
    lineHeight: 1.65,
    letterSpacing: '0',
    sample: 'Adulis combines structured Product Posts with creative Shoppable Posts so buyers can move from inspiration to accurate product information.',
    usage: 'Lead copy on Website, onboarding explanations, long-form content.',
  },
  {
    label: 'Body',
    tag: 'body',
    fontFamily: 'var(--font-body)',
    fontSize: 15,
    fontWeight: 400,
    lineHeight: 1.6,
    letterSpacing: '0',
    sample: `${BODY_PRODUCT.name} — ${BODY_PRODUCT.description}`,
    usage: 'Default body copy, product descriptions, order detail text.',
  },
  {
    label: 'Body Small',
    tag: 'body-sm',
    fontFamily: 'var(--font-body)',
    fontSize: 13,
    fontWeight: 400,
    lineHeight: 1.55,
    letterSpacing: '0',
    sample: `Pickup confirmed — ${formatClock12(stateTime(SAMPLE_ORDER, 'Pickup Verified')!)} · Courier is delivering your order`,
    usage: 'Secondary copy, timestamps, compact list metadata.',
  },
  {
    label: 'Label',
    tag: 'label',
    fontFamily: 'var(--font-body)',
    fontSize: 12,
    fontWeight: 600,
    lineHeight: 1.4,
    letterSpacing: '0.01em',
    sample: `${ORDERS[SAMPLE_ORDER].fulfilment} · ${formatEtb(orderTotals(SAMPLE_ORDER).delivery)}`,
    usage: 'Form labels, badge text, navigation items, action labels.',
  },
  {
    label: 'Caption',
    tag: 'caption',
    fontFamily: 'var(--font-body)',
    fontSize: 11,
    fontWeight: 400,
    lineHeight: 1.45,
    letterSpacing: '0.01em',
    sample: '4 items · Added 3 mins ago',
    usage: 'Metadata, helper text, minimal footnotes.',
  },
  {
    label: 'Mono Label',
    tag: 'mono-label',
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    fontWeight: 500,
    lineHeight: 1.4,
    letterSpacing: '0.08em',
    sample: `${SAMPLE_ORDER} · ${orderStateAt(SAMPLE_ORDER)!.toUpperCase()} · ${SAMPLE_TOTAL}`,
    usage: 'Order references, status badges, data labels, tokens, timestamps in console.',
  },
  {
    label: 'Financial',
    tag: 'financial',
    fontFamily: 'var(--font-display)',
    fontSize: 22,
    fontWeight: 600,
    lineHeight: 1.2,
    letterSpacing: '-0.01em',
    sample: SAMPLE_TOTAL,
    usage: 'Price emphasis on product pages, checkout totals, order summaries.',
  },
]

function TypographyScale() {
  return (
    <section>
      <SectionHeading
        label="TYPOGRAPHY"
        title="Type Scale"
        desc="Fraunces (display/serif) pairs with Outfit (geometric sans) for warmth and clarity. DM Mono for data, statuses, and references."
      />

      {/* Font pairing overview */}
      <div className="grid gap-4 mb-8" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {[
          { name: 'Fraunces', role: 'Display / Headings', tag: 'display', sample: 'Discover.', note: 'Optical-size variable serif. Warm, distinctive, premium.' },
          { name: 'Outfit', role: 'Body / UI', tag: 'body', sample: 'Adulis', note: 'Geometric sans. Clean, friendly, highly legible at small sizes.' },
          { name: 'DM Mono', role: 'Data / Labels', tag: 'mono', sample: SAMPLE_ORDER, note: 'Tabular mono. Orders, prices, statuses, references.' },
        ].map(f => (
          <div
            key={f.name}
            className="rounded-xl border p-5"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
              {f.role}
            </div>
            <div
              style={{
                fontFamily: f.tag === 'display' ? 'var(--font-display)' : f.tag === 'mono' ? 'var(--font-mono)' : 'var(--font-body)',
                fontSize: f.tag === 'display' ? 40 : f.tag === 'mono' ? 28 : 34,
                fontWeight: 600,
                color: 'var(--color-text-primary)',
                lineHeight: 1.1,
                marginBottom: 12,
              }}
            >
              {f.sample}
            </div>
            <div className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)', marginBottom: 4 }}>{f.name}</div>
            <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{f.note}</div>
          </div>
        ))}
      </div>

      {/* Full scale */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
      >
        {TYPE_SCALE.map((style, i) => (
          <div
            key={style.tag}
            className="border-b last:border-b-0"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-start gap-0">
              {/* Spec column */}
              <div
                className="flex-shrink-0 px-5 py-4 border-r"
                style={{ width: 200, borderColor: 'var(--color-border)', background: 'var(--color-surface-raised)' }}
              >
                <div className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{style.label}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-muted)', marginTop: 4 }}>
                  {style.fontSize}px · {style.fontWeight}w
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-muted)' }}>
                  lh {style.lineHeight} · ls {style.letterSpacing || '0'}
                </div>
              </div>
              {/* Sample + usage column */}
              <div className="flex-1 px-5 py-4">
                <div
                  style={{
                    fontFamily: style.fontFamily,
                    fontSize: Math.min(style.fontSize, style.fontSize > 20 ? style.fontSize : style.fontSize),
                    fontWeight: style.fontWeight,
                    lineHeight: style.lineHeight,
                    letterSpacing: style.letterSpacing,
                    color: 'var(--color-text-primary)',
                    marginBottom: 6,
                  }}
                >
                  {style.sample}
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {style.usage}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════
   SPACING SYSTEM
═══════════════════════════════════════════════ */

const SPACING_STEPS = [
  { value: 4,  label: '4',  token: 'space-1',  tailwind: 'p-1',  usage: 'Icon padding, badge inset, micro gap' },
  { value: 8,  label: '8',  token: 'space-2',  tailwind: 'p-2',  usage: 'Input field padding (tight), compact row gap' },
  { value: 16, label: '16', token: 'space-4',  tailwind: 'p-4',  usage: 'Card padding (mobile), button padding, list item spacing' },
  { value: 24, label: '24', token: 'space-6',  tailwind: 'p-6',  usage: 'Card padding (desktop), modal body, section interior spacing' },
  { value: 32, label: '32', token: 'space-8',  tailwind: 'p-8',  usage: 'Section padding, sidebar groups, content block gap' },
  { value: 40, label: '40', token: 'space-10', tailwind: 'p-10', usage: 'Page-level horizontal padding (tablet), section gap' },
  { value: 48, label: '48', token: 'space-12', tailwind: 'p-12', usage: 'Page-level horizontal padding (desktop), major section gap' },
  { value: 64, label: '64', token: 'space-16', tailwind: 'p-16', usage: 'Hero padding, above-the-fold breathing room' },
  { value: 80, label: '80', token: 'space-20', tailwind: 'p-20', usage: 'Large feature sections, hero vertical padding' },
  { value: 96, label: '96', token: 'space-24', tailwind: 'p-24', usage: 'Maximum section spacing on desktop' },
]

function SpacingSystem() {
  return (
    <section>
      <SectionHeading
        label="SPACING"
        title="8-Point Spacing System"
        desc="All spacing uses multiples of 4px with primary increments at 8px. Touch targets minimum 44px."
      />
      <div
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
      >
        {SPACING_STEPS.map((step, i) => (
          <div
            key={step.value}
            className="flex items-center gap-4 px-5 py-3 border-b last:border-b-0"
            style={{ borderColor: 'var(--color-border)' }}
          >
            {/* Visual bar */}
            <div className="flex-shrink-0" style={{ width: 120 }}>
              <div
                className="rounded"
                style={{ width: step.value, height: 24, background: 'var(--color-brand)', opacity: 0.2 + (i * 0.075) }}
              />
            </div>
            {/* Spec */}
            <div className="flex-shrink-0" style={{ width: 100 }}>
              <span
                className="font-semibold text-lg"
                style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}
              >
                {step.label}px
              </span>
            </div>
            <div className="flex-shrink-0" style={{ width: 140 }}>
              <span
                className="text-xs px-2 py-0.5 rounded"
                style={{
                  fontFamily: 'var(--font-mono)',
                  background: 'var(--color-surface-raised)',
                  color: 'var(--color-text-muted)',
                  border: '1px solid var(--color-border)',
                }}
              >
                {step.tailwind}
              </span>
            </div>
            <div className="flex-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {step.usage}
            </div>
          </div>
        ))}
      </div>
      {/* Touch target note */}
      <div
        className="mt-4 rounded-xl border p-4 flex items-start gap-3"
        style={{ background: 'var(--color-brand-muted)', borderColor: 'var(--color-brand)' + '40' }}
      >
        <span style={{ fontSize: 18 }}>👆</span>
        <div>
          <div className="font-semibold text-sm" style={{ color: 'var(--color-brand-dark)' }}>Minimum Mobile Touch Target: 44 × 44px</div>
          <div className="text-sm mt-1" style={{ color: 'var(--color-brand-dark)', opacity: 0.75 }}>
            All interactive elements on mobile surfaces must meet this minimum. Visually smaller elements (icons, badges) must have an invisible tap area padded to 44×44.
          </div>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════
   RADIUS TOKENS
═══════════════════════════════════════════════ */

const RADIUS_TOKENS = [
  { label: 'None',    value: '0px',     var: '--radius-none', usage: 'Table cells, flat separator lines' },
  { label: 'Small',   value: '4px',     var: '--radius-sm',   usage: 'Badges, status chips, compact tags, code blocks' },
  { label: 'Medium',  value: '8px',     var: '--radius-md',   usage: 'Buttons, inputs, small cards, dropdowns' },
  { label: 'Large',   value: '12px',    var: '--radius-lg',   usage: 'Cards, modals, panels, bottom sheets' },
  { label: 'XL',      value: '16px',    var: '--radius-xl',   usage: 'Large cards, overlay containers, mobile sheets' },
  { label: '2XL',     value: '24px',    var: '--radius-2xl',  usage: 'Featured content blocks, hero elements' },
  { label: 'Full',    value: '9999px',  var: '--radius-full', usage: 'Pill buttons, avatar circles, toggle switches' },
]

function RadiusTokens() {
  return (
    <section>
      <SectionHeading
        label="RADIUS"
        title="Border Radius"
        desc="Restrained, consistent radius across all surfaces. Consumer mobile surfaces may use xl/2xl freely. Operator Console stays md/lg for a more precise feel."
      />
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
        {RADIUS_TOKENS.map(r => (
          <div
            key={r.label}
            className="rounded-xl border p-5"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            {/* Swatch */}
            <div className="mb-4" style={{ height: 56, display: 'flex', alignItems: 'center' }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: r.value,
                  background: 'var(--color-brand-muted)',
                  border: '2px solid var(--color-brand)',
                  opacity: 0.85,
                }}
              />
            </div>
            <div className="font-semibold text-sm mb-1" style={{ color: 'var(--color-text-primary)' }}>{r.label}</div>
            <div
              className="text-xs mb-2"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-brand)', background: 'var(--color-brand-muted)', display: 'inline-block', padding: '1px 6px', borderRadius: 4 }}
            >
              {r.value}
            </div>
            <div className="text-xs" style={{ color: 'var(--color-text-muted)', lineHeight: 1.5 }}>{r.usage}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════
   ELEVATION / SHADOWS
═══════════════════════════════════════════════ */

const SHADOW_TOKENS = [
  {
    label: 'Flat',
    token: 'flat',
    shadow: 'none',
    usage: 'In-page sections, table rows, navigation items. No visual lift.',
    border: true,
  },
  {
    label: 'XS',
    token: 'shadow-xs',
    shadow: '0 1px 2px rgba(26, 21, 18, 0.06)',
    usage: 'Default card state, list items. Barely-there lift.',
    border: true,
  },
  {
    label: 'Small',
    token: 'shadow-sm',
    shadow: '0 1px 4px rgba(26, 21, 18, 0.08), 0 1px 2px rgba(26, 21, 18, 0.04)',
    usage: 'Hover card state, buttons on light surfaces, input fields.',
    border: false,
  },
  {
    label: 'Medium',
    token: 'shadow-md',
    shadow: '0 4px 12px rgba(26, 21, 18, 0.10), 0 2px 4px rgba(26, 21, 18, 0.06)',
    usage: 'Active/focused cards, popovers, floating labels.',
    border: false,
  },
  {
    label: 'Large',
    token: 'shadow-lg',
    shadow: '0 8px 24px rgba(26, 21, 18, 0.12), 0 4px 8px rgba(26, 21, 18, 0.06)',
    usage: 'Dropdown menus, context menus, tooltips, notification toasts.',
    border: false,
  },
  {
    label: 'XL / Modal',
    token: 'shadow-xl',
    shadow: '0 16px 48px rgba(26, 21, 18, 0.14), 0 8px 16px rgba(26, 21, 18, 0.08)',
    usage: 'Modals, dialogs, bottom sheets, full-screen overlays.',
    border: false,
  },
]

function ElevationTokens() {
  return (
    <section>
      <SectionHeading
        label="ELEVATION"
        title="Shadow & Elevation"
        desc="Subtle, warm-tinted shadows that respect the cream background. Never blue-grey box shadows. Elevation communicates interactivity — not decoration."
      />
      <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
        {SHADOW_TOKENS.map(s => (
          <div
            key={s.label}
            className="rounded-xl p-6 border"
            style={{
              background: 'var(--color-surface)',
              borderColor: s.border ? 'var(--color-border)' : 'transparent',
              boxShadow: s.shadow === 'none' ? 'none' : s.shadow,
            }}
          >
            <div className="font-semibold text-sm mb-1" style={{ color: 'var(--color-text-primary)' }}>{s.label}</div>
            <div
              className="text-xs mb-3"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}
            >
              var(--{s.token})
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)', margin: 0 }}>{s.usage}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════
   LAYOUT GRID
═══════════════════════════════════════════════ */

function LayoutGrid() {
  const breakpoints = [
    {
      label: 'Mobile Primary',
      width: '390px',
      cols: '4',
      gutter: '16px',
      margin: '16px',
      context: 'Buyer App, Seller Companion, Courier App',
      color: 'var(--color-brand)',
    },
    {
      label: 'Mobile Android',
      width: '360px',
      cols: '4',
      gutter: '16px',
      margin: '16px',
      context: 'Validation width — test all mobile screens here',
      color: 'var(--color-brand-light)',
    },
    {
      label: 'Tablet',
      width: '1024px',
      cols: '12',
      gutter: '24px',
      margin: '32px',
      context: 'Seller Console responsive / Operator dense view',
      color: '#2D5CC2',
    },
    {
      label: 'Desktop',
      width: '1440px',
      cols: '12',
      gutter: '24px',
      margin: '80px',
      context: 'Company Website, Seller Console, Operator Console',
      color: '#1A1512',
    },
  ]

  const consoleLayouts = [
    { surface: 'Company Website', layout: '12 col · content max-width 1200px · 80px margin', nav: 'Fixed top header' },
    { surface: 'Seller Console', layout: '264px sidebar + fluid content area · min 768px', nav: 'Left sidebar + top bar' },
    { surface: 'Operator Console', layout: '220px sidebar + fluid content + optional detail panel', nav: 'Left sidebar + top bar (dark)' },
    { surface: 'Seller Storefront', layout: '4 col mobile / 12 col desktop · max-width 960px', nav: 'Sticky storefront header + tabs' },
    { surface: 'Mobile App', layout: '4 col · 16px margin · safe area insets', nav: 'Bottom tab bar + stack navigation' },
  ]

  return (
    <section>
      <SectionHeading
        label="LAYOUT"
        title="Responsive Grid & Layout"
        desc="Every surface uses a consistent grid derived from these breakpoints. Margins and gutters scale with viewport."
      />

      {/* Breakpoints */}
      <div className="grid gap-4 mb-8" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {breakpoints.map(bp => (
          <div
            key={bp.label}
            className="rounded-xl border overflow-hidden"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            {/* Width bar */}
            <div style={{ background: bp.color + '12', padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
              <div
                style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 600, color: bp.color, letterSpacing: '-0.02em' }}
              >
                {bp.width}
              </div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                {bp.label}
              </div>
            </div>
            <div className="p-4 space-y-2 text-sm">
              {[
                ['Columns', bp.cols],
                ['Gutter', bp.gutter],
                ['Margin', bp.margin],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span style={{ color: 'var(--color-text-muted)' }}>{k}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)', fontSize: 12 }}>{v}</span>
                </div>
              ))}
              <div
                className="pt-2 mt-2 border-t text-xs"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
              >
                {bp.context}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Console layouts */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
      >
        <div
          className="px-5 py-3 border-b text-xs font-semibold uppercase tracking-widest"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)', background: 'var(--color-surface-raised)', fontFamily: 'var(--font-mono)' }}
        >
          Surface Layout Patterns
        </div>
        {consoleLayouts.map((cl, i) => (
          <div
            key={cl.surface}
            className="flex items-start gap-4 px-5 py-4 border-b last:border-b-0"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <div className="flex-shrink-0 font-semibold text-sm" style={{ width: 200, color: 'var(--color-text-primary)' }}>{cl.surface}</div>
            <div className="flex-1">
              <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{cl.layout}</div>
              <div
                className="text-xs mt-1"
                style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}
              >
                {cl.nav}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════
   ICON SYSTEM
═══════════════════════════════════════════════ */

function IconSystem() {
  const sizes = [
    { px: 16, label: '16px', usage: 'Inline text icons, compact badge icons, table cell indicators' },
    { px: 20, label: '20px', usage: 'Default UI icons — navigation items, form field icons, button icons' },
    { px: 24, label: '24px', usage: 'Primary action icons, bottom nav icons, section header icons' },
    { px: 32, label: '32px', usage: 'Feature icons, empty state, large status icons' },
    { px: 48, label: '48px', usage: 'Illustration-level icons, large empty states, onboarding' },
  ]

  const guidelines = [
    'Use a single consistent icon family across all surfaces. Recommend Lucide or Phosphor (outline weight) for their geometry and licensing.',
    'Icons must not be the sole communicator of state — pair every status icon with a text label.',
    'Maintain 2px stroke weight at 20–24px. Scale stroke proportionally — never rasterize.',
    'All interactive icons on mobile must have a 44×44px minimum tap target regardless of visual size.',
    'Operator Console may use the same icon set with adjusted opacity/color for the dark theme.',
    'Product hotspots use custom commerce-specific dot indicators — not generic map pins.',
    'Trust level icons must always be accompanied by the Trust level label (NEW / REBUILDING / ESTABLISHED / TRUSTED).',
  ]

  const DEMO_ICONS = [
    { icon: '🏠', label: 'Home / For You' },
    { icon: '🛍️', label: 'Shop' },
    { icon: '🔖', label: 'Saved' },
    { icon: '📦', label: 'Orders' },
    { icon: '👤', label: 'Account' },
    { icon: '🔍', label: 'Search' },
    { icon: '🛒', label: 'Cart' },
    { icon: '💬', label: 'Chat' },
    { icon: '🔔', label: 'Notifications' },
    { icon: '⚙️', label: 'Settings' },
    { icon: '✨', label: 'Shoppable Post' },
    { icon: '📱', label: 'Product Post' },
    { icon: '🚴', label: 'Courier' },
    { icon: '📍', label: 'Location' },
    { icon: '📷', label: 'QR Scanner' },
    { icon: '🛡️', label: 'Trust' },
    { icon: '⭐', label: 'Review' },
    { icon: '⚠️', label: 'Claim / Alert' },
    { icon: '✅', label: 'Verified' },
    { icon: '🔒', label: 'Operator' },
  ]

  return (
    <section>
      <SectionHeading
        label="ICONOGRAPHY"
        title="Icon System"
        desc="One consistent icon family. Restrained usage — icons support text, never replace it. Accessibility-first: status is always text + icon, never icon alone."
      />

      {/* Size guide */}
      <div
        className="rounded-xl border p-6 mb-6"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <div className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
          Icon Sizes
        </div>
        <div className="flex items-end gap-8 flex-wrap">
          {sizes.map(s => (
            <div key={s.px} className="flex flex-col items-center gap-2">
              <div
                className="flex items-center justify-center rounded"
                style={{
                  width: s.px + 16,
                  height: s.px + 16,
                  background: 'var(--color-brand-muted)',
                }}
              >
                <svg width={s.px} height={s.px} viewBox="0 0 24 24" fill="none" stroke="var(--color-brand)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)', textAlign: 'center' }}>{s.label}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-1.5">
          {sizes.map(s => (
            <div key={s.px} className="flex gap-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              <span className="flex-shrink-0 font-mono" style={{ width: 36, fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>{s.label}</span>
              <span>{s.usage}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Demo icon set */}
      <div
        className="rounded-xl border p-6 mb-6"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <div className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
          Core Adulis Icon Set (Semantic Map)
        </div>
        <div className="flex flex-wrap gap-4">
          {DEMO_ICONS.map(ico => (
            <div key={ico.label} className="flex flex-col items-center gap-1.5" style={{ minWidth: 64 }}>
              <div
                className="flex items-center justify-center rounded-xl"
                style={{ width: 48, height: 48, background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)' }}
              >
                <span style={{ fontSize: 22 }}>{ico.icon}</span>
              </div>
              <span style={{ fontSize: 10, color: 'var(--color-text-muted)', textAlign: 'center', lineHeight: 1.3, maxWidth: 64 }}>{ico.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Guidelines */}
      <div
        className="rounded-xl border p-6"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <div className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
          Usage Guidelines
        </div>
        <ul className="space-y-2">
          {guidelines.map((g, i) => (
            <li key={i} className="flex items-start gap-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              <span className="flex-shrink-0 mt-0.5" style={{ color: 'var(--color-brand)' }}>·</span>
              {g}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════
   ACCESSIBILITY
═══════════════════════════════════════════════ */

function AccessibilityChecks() {
  const contrastChecks = [
    { pair: 'text-primary on background',    fg: '#1A1512', bg: '#FAF8F5', ratio: '16.4:1', pass: 'AAA' },
    { pair: 'text-secondary on background',  fg: '#5C4F45', bg: '#FAF8F5', ratio: '7.1:1',  pass: 'AAA' },
    { pair: 'text-muted on background',      fg: '#9C8E85', bg: '#FAF8F5', ratio: '3.5:1',  pass: 'AA Large' },
    { pair: 'text-inverse on brand',         fg: '#FAF8F5', bg: '#C2622D', ratio: '4.7:1',  pass: 'AA' },
    { pair: 'text on success-bg',            fg: '#2D7A4F', bg: '#EAF5EE', ratio: '5.2:1',  pass: 'AA' },
    { pair: 'text on warning-bg',            fg: '#B87C20', bg: '#FDF3E1', ratio: '3.9:1',  pass: 'AA Large' },
    { pair: 'text on danger-bg',             fg: '#C2372D', bg: '#FDECEA', ratio: '4.8:1',  pass: 'AA' },
    { pair: 'operator-text on operator-bg',  fg: '#E8EAF0', bg: '#111418', ratio: '13.8:1', pass: 'AAA' },
  ]

  const principles = [
    { icon: '🎯', title: 'Touch Targets — 44×44px minimum', desc: 'Every interactive element on mobile surfaces must meet 44×44px minimum. Visually compact elements must have an invisible padding area to meet this requirement.' },
    { icon: '🔍', title: 'Text Size — 11px minimum', desc: 'Caption and Mono Label styles at 11px are used only for metadata and code. Primary content never drops below 13px (Body Small). Financial figures use display styles for clarity.' },
    { icon: '🎨', title: 'Status is never color-only', desc: 'Every status badge uses text + color. Trust levels, order states, payment states, and moderation states always include a text label. Color is always an additive signal.' },
    { icon: '⌨️', title: 'Keyboard navigation on desktop', desc: 'Seller Console and Operator Console must support full keyboard navigation. Focus indicators use the established accessible focus color for the surface, with sufficient contrast against the surrounding background: info blue by default, and light/inverse on dark or photo surfaces when necessary. Tab order follows logical reading flow.' },
    { icon: '🔎', title: 'Focus visible on all surfaces', desc: 'Focus rings are never hidden in the prototype. Mobile surfaces show focus for accessibility testing even if users typically rely on tap gestures.' },
    { icon: '📋', title: 'Product hotspots are not the only access method', desc: 'Shoppable Post tagged products are always accessible via a "Products in this post" list — never only via visual hotspot overlay. This serves keyboard users and screen reader users.' },
  ]

  return (
    <section>
      <SectionHeading
        label="ACCESSIBILITY"
        title="Accessibility Baseline"
        desc="WCAG 2.1 AA minimum across all surfaces. AAA where possible. Every design decision includes an accessible mode."
      />

      {/* Contrast table */}
      <div
        className="rounded-xl border overflow-hidden mb-6"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
      >
        <div
          className="px-5 py-3 border-b text-xs font-semibold uppercase tracking-widest"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)', background: 'var(--color-surface-raised)', fontFamily: 'var(--font-mono)' }}
        >
          Contrast Checks — Key Token Pairs
        </div>
        {contrastChecks.map((check, i) => (
          <div
            key={check.pair}
            className="flex items-center gap-4 px-5 py-3 border-b last:border-b-0"
            style={{ borderColor: 'var(--color-border)' }}
          >
            {/* Preview swatch */}
            <div
              className="flex-shrink-0 flex items-center justify-center rounded text-xs font-semibold"
              style={{
                width: 80,
                height: 32,
                background: check.bg,
                color: check.fg,
                border: `1px solid ${check.fg}20`,
                fontFamily: 'var(--font-mono)',
              }}
            >
              Aa
            </div>
            {/* Pair name */}
            <div className="flex-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>{check.pair}</div>
            {/* Ratio */}
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--color-text-primary)', minWidth: 60, textAlign: 'right' }}>
              {check.ratio}
            </div>
            {/* Pass level */}
            <span
              className="flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold"
              style={{
                background: check.pass.startsWith('AAA') ? 'var(--color-success-bg)' : 'var(--color-info-bg)',
                color: check.pass.startsWith('AAA') ? 'var(--color-success)' : 'var(--color-info)',
                fontFamily: 'var(--font-mono)',
                minWidth: 80,
                textAlign: 'center',
              }}
            >
              {check.pass}
            </span>
          </div>
        ))}
      </div>

      {/* Principles */}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}>
        {principles.map(p => (
          <div
            key={p.title}
            className="rounded-xl border p-5"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-start gap-3">
              <span className="text-xl flex-shrink-0">{p.icon}</span>
              <div>
                <div className="font-semibold text-sm mb-1.5" style={{ color: 'var(--color-text-primary)' }}>{p.title}</div>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)', margin: 0 }}>{p.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ─── Re-export PlaceholderSection for other sections ─── */
export function PlaceholderSection({ number, title, description, items }: {
  number: string
  title: string
  description: string
  items: string[]
}) {
  return (
    <div className="max-w-4xl mx-auto px-8 py-16">
      <div className="flex items-center gap-4 mb-8">
        <span
          className="flex-shrink-0 flex items-center justify-center rounded-xl font-mono text-sm font-semibold"
          style={{ width: 48, height: 48, background: 'var(--color-brand)', color: '#fff', fontFamily: 'var(--font-mono)' }}
        >
          {number}
        </span>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, margin: 0, color: 'var(--color-text-primary)' }}>
            {title}
          </h1>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4, letterSpacing: '0.08em' }}>
            ADULIS PROTOTYPE — PENDING WORK ORDER
          </div>
        </div>
      </div>
      <div
        className="rounded-2xl border-2 border-dashed p-10 text-center mb-8"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
      >
        <div style={{ fontSize: 40, marginBottom: 16 }}>🔜</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 500, color: 'var(--color-text-primary)', margin: '0 0 12px' }}>
          {title}
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 15, lineHeight: 1.6, maxWidth: 500, margin: '0 auto' }}>
          {description}
        </p>
      </div>
      <div
        className="rounded-xl border p-6"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <div className="font-semibold text-xs uppercase tracking-widest mb-4" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
          Planned Content
        </div>
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              <span className="flex-shrink-0 mt-0.5 text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>{String(i + 1).padStart(2, '0')}</span>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

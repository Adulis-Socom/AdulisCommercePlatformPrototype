// DESIGN-002: the small chart kit behind the marketplace Insights (inline SVG and plain HTML, theme tokens only, so every Theme Lab palette works).
// Every chart sits in a <figure> that carries a text equivalent: the SVG has an aria-label summary, its points are keyboard-focusable and read out their
// own value, and a collapsed "table" holds every number. Colour never carries meaning alone: identity is also a label or a dash pattern, direction is also
// a glyph and a sign. Stage colours (class .ins-root in index.css): discovery = info, interest = brand, response = courier teal; growth and decline use the
// success and danger tokens only for the change chips.
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { NOT_ENOUGH, fmtChange, type Delta, type RateDelta } from '../../marketplace/insights'

export type Tone = 'discovery' | 'interest' | 'response' | 'neutral'
export const TONE: Record<Tone, string> = { discovery: 'var(--ins-discovery)', interest: 'var(--ins-interest)', response: 'var(--ins-response)', neutral: 'var(--ins-neutral)' }
const DASH: Record<Tone, string | undefined> = { discovery: undefined, interest: undefined, response: '6 4', neutral: '2 3' }
export const fmt = (n: number) => n.toLocaleString('en-US')
export const fmtEtb = (n: number) => `ETB ${n.toLocaleString('en-US')}`

const useWidth = () => {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(560)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const read = () => setWidth(Math.max(240, Math.round(el.getBoundingClientRect().width)))
    read()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(read)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return [ref, width] as const
}

/** The change chip: glyph + sign + text, coloured by whether the direction is good (lowerIsBetter flips it). */
export function Change({ d, lowerIsBetter, vs = 'prior 28 days' }: { d: Delta; lowerIsBetter?: boolean; vs?: string }) {
  const text = fmtChange(d)
  const flat = d.change === null || Math.abs(d.change) < 0.0005
  const up = (d.change ?? 0) > 0
  const good = lowerIsBetter ? !up : up
  const tone = flat ? 'text-text-muted' : good ? 'text-success' : 'text-danger'
  return <span data-change className={`inline-flex items-center gap-1 text-xs font-semibold ${tone}`}><span aria-hidden="true">{flat ? '•' : up ? '▲' : '▼'}</span><span>{text}</span><span className="font-normal text-text-muted">vs {vs}</span></span>
}
export function RateChange({ r }: { r: RateDelta }) {
  if (r.points === null) return <span data-change className="text-xs text-text-muted">{r.current === null ? NOT_ENOUGH : `${NOT_ENOUGH} in the prior 28 days to compare`}</span>
  const flat = Math.abs(r.points) < 0.05, up = r.points > 0
  return <span data-change className={`inline-flex items-center gap-1 text-xs font-semibold ${flat ? 'text-text-muted' : up ? 'text-success' : 'text-danger'}`}><span aria-hidden="true">{flat ? '•' : up ? '▲' : '▼'}</span><span>{flat ? '0 pts' : `${up ? '+' : '−'}${Math.abs(r.points).toFixed(1)} pts`}</span><span className="font-normal text-text-muted">vs prior 28 days</span></span>
}

/** The label that marks a figure as simulation-derived. */
export const SimBadge = () => <span data-sim-label className="inline-flex flex-shrink-0 items-center rounded-full bg-warning-bg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-warning">Internal simulation</span>

export function Card({ title, subtitle, badge, className = '', children, ...rest }: { title?: ReactNode; subtitle?: ReactNode; badge?: ReactNode; className?: string; children: ReactNode } & Record<`data-${string}`, string | undefined>) {
  return (
    <section {...rest} className={`min-w-0 rounded-2xl border border-border bg-surface p-5 ${className}`}>
      {(title || badge) && <div className="mb-3 flex flex-wrap items-start justify-between gap-2"><div className="min-w-0">{title && <h2 className="font-display text-base font-semibold">{title}</h2>}{subtitle && <p className="mt-0.5 text-xs leading-relaxed text-text-muted">{subtitle}</p>}</div>{badge}</div>}
      {children}
    </section>
  )
}

export type Cells = (string | number)[]
/** The text equivalent: a collapsed table inside its own scroll frame, so a wide table never widens the page. */
export function DataTable({ summary, head, rows }: { summary: string; head: string[]; rows: Cells[] }) {
  return (
    <details data-text-equivalent className="mt-3 text-xs">
      <summary className="inline-flex min-h-8 cursor-pointer items-center rounded-lg px-1 font-semibold text-text-secondary">{summary}</summary>
      <div className="mt-2 overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-max border-collapse text-left">
          <thead className="bg-surface-raised text-text-muted"><tr>{head.map((h, i) => <th key={i} scope="col" className="px-3 py-2 font-semibold">{h}</th>)}</tr></thead>
          <tbody>{rows.map((r, i) => <tr key={i} className="border-t border-border">{r.map((c, j) => j === 0 ? <th key={j} scope="row" className="px-3 py-2 text-left font-semibold">{c}</th> : <td key={j} className="px-3 py-2 tabular-nums">{c}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </details>
  )
}

/** A chart with its caption, its screen-reader summary and its table. */
export function Figure({ title, subtitle, summary, badge, table, className = '', children }: { title: string; subtitle?: ReactNode; summary: string; badge?: ReactNode; table: { summary: string; head: string[]; rows: Cells[] }; className?: string; children: ReactNode }) {
  return (
    <Card className={className} data-figure="">
      <figure className="m-0">
        <figcaption className="mb-3 flex flex-wrap items-start justify-between gap-2"><span className="min-w-0"><span className="block font-display text-base font-semibold">{title}</span>{subtitle && <span className="mt-0.5 block text-xs leading-relaxed text-text-muted">{subtitle}</span>}</span>{badge}</figcaption>
        <p className="sr-only">{summary}</p>
        {children}
        <DataTable {...table} />
      </figure>
    </Card>
  )
}

/** A clean axis maximum: 1, 2, 5 or 10 times a power of ten. */
export function niceMax(max: number) {
  if (max <= 0) return 1
  const p = 10 ** Math.floor(Math.log10(max)), f = max / p
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p
}
/** A column: square at the baseline, 4 px rounded at the data end (a zero week keeps a 1 px hairline). */
const barPath = (x0: number, x1: number, yTop: number, yBase: number) => {
  const hgt = Math.max(1, yBase - yTop), r = Math.min(4, hgt, (x1 - x0) / 2), t = yBase - hgt
  return `M${x0} ${yBase} V${t + r} a${r} ${r} 0 0 1 ${r} ${-r} H${x1 - r} a${r} ${r} 0 0 1 ${r} ${r} V${yBase} Z`
}
const axisLabel = (n: number) => (n >= 10_000 ? `${n / 1000}K` : fmt(n))

/** A small line: weekly values, gaps where there is no value, an end dot in a surface ring. Decorative: the tile carries the number. */
export function Sparkline({ values, tone = 'neutral', label, max: forced }: { values: (number | null)[]; tone?: Tone; label: string; max?: number }) {
  const w = 96, h = 30, pad = 5
  const nums = values.filter((v): v is number => v !== null)
  const max = forced ?? Math.max(1, ...nums), min = Math.min(0, ...nums)
  const x = (i: number) => pad + (i * (w - 2 * pad)) / Math.max(1, values.length - 1)
  const y = (v: number) => h - pad - ((v - min) / (max - min || 1)) * (h - 2 * pad)
  let d = '', pen = false
  values.forEach((v, i) => { if (v === null) { pen = false; return } d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)} `; pen = true })
  const lastIndex = values.reduce<number>((l, v, i) => (v === null ? l : i), -1)
  return (
    <svg role="img" aria-label={label} width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="flex-shrink-0 overflow-visible">
      <path d={d} fill="none" stroke={TONE[tone]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={DASH[tone]} />
      {lastIndex >= 0 && <circle cx={x(lastIndex)} cy={y(values[lastIndex] as number)} r="4" fill={TONE[tone]} stroke="var(--color-surface)" strokeWidth="2" />}
    </svg>
  )
}

export interface TrendProps { values: (number | null)[]; labels: string[]; tone: Tone; name: string; valueText?: (v: number) => string; variant?: 'line' | 'bars'; split?: number; windowLabels?: [string, string]; max?: number }
/**
 * Weekly trend, 2 px line (or capped columns), gridlines at 0, half and the nice maximum, the last point labelled, the two 28-day windows marked. Each point is a
 * focusable control that reads its week and value into a live region; a gap is a week without evidence.
 */
export function TrendChart({ values, labels, tone, name, valueText = fmt, variant = 'line', split, windowLabels, max: forcedMax }: TrendProps) {
  const [ref, width] = useWidth()
  const live = useId()
  const [active, setActive] = useState<number | null>(null)
  const h = 190, left = 40, right = 14, top = 22, bottom = 26
  const nums = values.filter((v): v is number => v !== null)
  const top0 = forcedMax ?? niceMax(Math.max(0, ...nums))
  const n = values.length, band = (width - left - right) / n
  const x = (i: number) => left + band * (i + 0.5)
  const y = (v: number) => top + (1 - v / top0) * (h - top - bottom)
  let d = '', pen = false
  values.forEach((v, i) => { if (v === null) { pen = false; return } d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)} `; pen = true })
  const shown = active ?? (values.reduce<number>((l, v, i) => (v === null ? l : i), -1))
  const readout = shown < 0 ? `${name}: ${NOT_ENOUGH}` : `${name}, week of ${labels[shown]}: ${values[shown] === null ? NOT_ENOUGH : valueText(values[shown] as number)}`
  const step = band < 52 ? 2 : 1
  const barW = Math.min(24, band * 0.5)
  return (
    <div ref={ref} className="w-full">
      <svg role="group" aria-label={`${name}: weekly trend, ${n} weeks`} width={width} height={h} viewBox={`0 0 ${width} ${h}`} className="block overflow-visible">
        {split !== undefined && split > 0 && split < n && (
          <>
            <rect x={left + band * split} y={top - 8} width={band * (n - split)} height={h - top - bottom + 8} fill="var(--ins-neutral)" opacity="0.07" />
            <line x1={left + band * split} x2={left + band * split} y1={top - 8} y2={h - bottom} stroke="var(--color-border-strong)" strokeWidth="1" />
            {windowLabels && <><text x={left + 4} y={top - 10} fontSize="10" fill="var(--color-text-muted)">{windowLabels[0]}</text><text x={left + band * split + 4} y={top - 10} fontSize="10" fontWeight="600" fill="var(--color-text-secondary)">{windowLabels[1]}</text></>}
          </>
        )}
        {[0, 0.5, 1].map(t => <g key={t}><line x1={left} x2={width - right} y1={y(top0 * t)} y2={y(top0 * t)} stroke="var(--color-border)" strokeWidth="1" /><text x={left - 6} y={y(top0 * t) + 3} textAnchor="end" fontSize="10" fill="var(--color-text-muted)">{axisLabel(Math.round(top0 * t))}</text></g>)}
        {variant === 'line' && <path d={d} fill="none" stroke={TONE[tone]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={DASH[tone]} />}
        {values.map((v, i) => v === null ? null : (
          <g key={i}>
            {variant === 'bars' && <path d={barPath(x(i) - barW / 2, x(i) + barW / 2, y(v), y(0))} fill={TONE[tone]} opacity={i === shown ? 1 : 0.78} />}
            {variant === 'line' && <circle cx={x(i)} cy={y(v)} r={i === shown ? 5 : 4} fill={TONE[tone]} stroke="var(--color-surface)" strokeWidth="2" />}
            <circle data-point={i} tabIndex={0} role="img" aria-label={`${name}, week of ${labels[i]}: ${valueText(v)}`} cx={x(i)} cy={variant === 'bars' ? Math.min(y(v) + 8, y(0) - 4) : y(v)} r="14" fill="transparent"
              onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)} onFocus={() => setActive(i)} onBlur={() => setActive(null)} />
          </g>
        ))}
        {shown >= 0 && values[shown] !== null && <text x={Math.min(width - right - 2, Math.max(left + 14, x(shown)))} y={y(values[shown] as number) - 11} textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--color-text-primary)">{valueText(values[shown] as number)}</text>}
        {labels.map((l, i) => i % step === 0 ? <text key={i} x={x(i)} y={h - 8} textAnchor="middle" fontSize="10" fill="var(--color-text-muted)">{l}</text> : null)}
      </svg>
      <p id={live} aria-live="polite" className="mt-1 text-xs text-text-muted">{readout}</p>
    </div>
  )
}

export interface BarRow { key: string; label: ReactNode; detail?: ReactNode; value: number; prior?: number; text: string; change?: ReactNode; tone: Tone; marker?: ReactNode }
/** Ranked or stepped horizontal bars: a thick bar for the shown window, a thin ghost for the other, the value at the tip, the change as text. */
export function BarList({ rows, ordered, ariaLabel }: { rows: BarRow[]; ordered?: boolean; ariaLabel: string }) {
  const max = Math.max(1, ...rows.flatMap(r => [r.value, r.prior ?? 0]))
  const List = ordered ? 'ol' : 'ul'
  return (
    <List aria-label={ariaLabel} className="m-0 flex list-none flex-col gap-3 p-0">
      {rows.map((r, index) => (
        <li key={r.key} data-bar-row={r.key} className="min-w-0">
          <div className="flex items-baseline justify-between gap-3 text-xs">
            <span className="min-w-0 truncate font-semibold text-text-primary">{ordered && <span className="mr-1.5 font-normal text-text-muted">{index + 1}.</span>}{r.label}</span>
            <span className="flex-shrink-0 font-display text-sm font-semibold tabular-nums" data-bar-value>{r.text}</span>
          </div>
          <div className="mt-1 h-2.5 rounded-full bg-surface-raised" aria-hidden="true"><div className="h-full rounded-full" style={{ width: `${Math.max(1.5, (r.value / max) * 100)}%`, background: TONE[r.tone] }} /></div>
          {r.prior !== undefined && <div className="mt-1 h-1 rounded-full" aria-hidden="true"><div className="h-full rounded-full" style={{ width: `${Math.max(1, (r.prior / max) * 100)}%`, background: 'var(--ins-neutral)', opacity: 0.45 }} /></div>}
          {(r.detail || r.change) && <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-text-muted">{r.detail}{r.change}</div>}
        </li>
      ))}
    </List>
  )
}

/** A key for what the colours and strokes mean (identity is never colour alone). */
export function Legend({ items }: { items: { tone: Tone; label: string; note?: string }[] }) {
  return (
    <ul aria-label="Key" className="m-0 mb-3 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-[11px] text-text-secondary">
      {items.map(i => (
        <li key={i.label} className="flex items-center gap-1.5">
          <svg width="22" height="8" aria-hidden="true"><line x1="1" x2="21" y1="4" y2="4" stroke={TONE[i.tone]} strokeWidth="3" strokeLinecap="round" strokeDasharray={DASH[i.tone]} /></svg>
          <span><span className="font-semibold">{i.label}</span>{i.note && <span className="text-text-muted"> · {i.note}</span>}</span>
        </li>
      ))}
    </ul>
  )
}

/** The figure tile. `hero` is the one large metric of a tab; the others are quieter. Raw numbers also sit in data attributes for tests and exports. */
export function Tile({ metric, label, value, raw, note, change, spark, sparkLabel, tone, hero, badge, children, className = '' }: {
  metric: string; label: string; value: string; raw?: number | null; note?: ReactNode; change?: ReactNode; spark?: (number | null)[]; sparkLabel?: string; tone: Tone; hero?: boolean; badge?: ReactNode; children?: ReactNode; className?: string
}) {
  return (
    <section data-metric={metric} data-raw={raw ?? ''} data-hero={hero ? '' : undefined} aria-label={label} className={`min-w-0 rounded-2xl border border-border bg-surface ${hero ? 'p-6' : 'p-4'} ${className}`}>
      <div className="flex items-start justify-between gap-2"><h2 className={`min-w-0 font-semibold ${hero ? 'text-sm text-text-secondary' : 'text-xs text-text-muted'}`}>{label}</h2>{badge}</div>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
        <div data-metric-value className={`font-display font-semibold leading-none tabular-nums ${hero ? 'text-5xl' : value === NOT_ENOUGH ? 'text-base' : 'text-2xl'}`}>{value}</div>
        {spark && !hero && <Sparkline values={spark} tone={tone} label={sparkLabel ?? `${label}, weekly`} />}
      </div>
      {change && <div className="mt-2">{change}</div>}
      {note && <div data-metric-note className="mt-1.5 text-[11px] leading-snug text-text-muted">{note}</div>}
      {children}
    </section>
  )
}

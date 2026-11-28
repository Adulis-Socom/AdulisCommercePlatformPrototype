// DESIGN-002 (FR-005): the Seller Console Insights for the marketplace dataset: Overview, Scene Performance, Product Performance and Seller Reputation, from the
// supplied individual Seller, Scene and Product analytical records. Every number comes from the pure functions in src/marketplace/insights.ts (unit-tested and
// reconciled with the source); this file only lays them out. Current MVP shows discovery, exploration, Product interest, response and Popularity; everything
// derived from simulated paid Orders sits in a section labelled "Internal simulation" and is absent in the MVP. The legacy dataset keeps its own Insights.
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { PRODUCTS, SHOPPABLE_POSTS, SELLERS } from '../../demo-data'
import { OPERATIONS, loadAnalytics } from '../../marketplace/import'
import {
  NOT_ENOUGH, NEW_SELLER_NOTE, delta, fmtDay, fmtPct, fmtRange, fmtStars, funnel, hasHistory, openSources, overview, productRows, rankProducts, rankScenes, sceneAttribution, sceneRows,
  simulationOverview, simulationProducts, simulationScenes, starSummary, trustView, type AnalyticsData, type Lifecycle, type Metric, type Overview, type ProductRow, type SceneRow, type StarSummary,
} from '../../marketplace/insights'
import { usePrototypeMode } from '../../prototype-mode'
import { useSim } from '../../simulation/store'
import { WORLD } from '../../simulation/store'
import { ratingsOfProduct, visibleReviews } from '../../simulation/reviews'
import { Notice } from './kit'
import { BarList, Card, Change, DataTable, Figure, Legend, RateChange, SimBadge, Sparkline, Tile, TrendChart, fmt, fmtEtb, type BarRow, type Cells, type Tone } from './insights-charts'

type TabKey = 'overview' | 'scenes' | 'products' | 'reputation'
type Period = 'current' | 'prior'
type Range = '8w' | '28d'
const TABS: [TabKey, string][] = [['overview', 'Overview'], ['scenes', 'Scene Performance'], ['products', 'Product Performance'], ['reputation', 'Seller Reputation']]

let cache: AnalyticsData | null = null
function useAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(cache)
  useEffect(() => {
    if (cache) return
    let live = true
    loadAnalytics().then(a => { cache = a as unknown as AnalyticsData; if (live) setData(cache) })
    return () => { live = false }
  }, [])
  return data
}

interface Ctx {
  a: AnalyticsData; sellerId: string; name: string; lifecycle: Lifecycle; o: Overview; history: boolean; period: Period; range: Range; simulation: boolean
  opening: number; scenes: SceneRow[]; products: ProductRow[]
}
const stageNote = (w: Overview['windows']) => `Current 28 days: ${fmtRange(w.current.start, w.current.end)} · Prior 28 days: ${fmtRange(w.prior.start, w.prior.end)}`

// ---------- helpers every tab shares ----------
const weekLabels = (o: Overview) => o.windows.weeks.map(w => fmtDay(w.start))
/** The trend a tab draws: all eight weeks with the two windows marked, or just the selected window's four. */
function trendOf<T>(c: Ctx, series: T[]) {
  const o = c.o, labels = weekLabels(o)
  if (c.range === '8w') return { values: series, labels, split: 4 as number | undefined, windowLabels: ['Prior 28 days', 'Current 28 days'] as [string, string] }
  const [from, to] = c.period === 'current' ? [4, 8] : [0, 4]
  return { values: series.slice(from, to), labels: labels.slice(from, to), split: undefined, windowLabels: undefined }
}
const shown = (c: Ctx, m: Metric) => m.total[c.period]
const changeOf = (c: Ctx, m: Metric, lowerIsBetter?: boolean) => c.period === 'current' ? <Change d={m.total} lowerIsBetter={lowerIsBetter} /> : <span data-change className="text-xs text-text-muted">Baseline window: nothing earlier to compare</span>
const rateText = (c: Ctx, r: { current: number | null; prior: number | null }) => fmtPct(r[c.period])
const rateChangeOf = (c: Ctx, r: Parameters<typeof RateChange>[0]['r']) => c.period === 'current' ? <RateChange r={r} /> : <span data-change className="text-xs text-text-muted">Baseline window: nothing earlier to compare</span>
const priorLine = (m: Metric, f: (n: number) => string = fmt) => <>Prior 28 days <span data-prior>{f(m.total.prior)}</span> · Current 28 days <span data-current>{f(m.total.current)}</span></>
const sceneTitle = (id: string) => (SHOPPABLE_POSTS as Record<string, { title: string }>)[id]?.title ?? id
const productName = (id: string) => (PRODUCTS as Record<string, { name: string }>)[id]?.name ?? id
const weeklyHead = (o: Overview) => ['Measure', ...o.windows.weeks.map(w => `Week of ${fmtDay(w.start)}`)]

function SectionTitle({ children, badge, id }: { children: ReactNode; badge?: ReactNode; id?: string }) {
  return <div id={id} className="ins-span-all mt-2 flex flex-wrap items-center gap-2"><h2 className="font-display text-lg font-semibold">{children}</h2>{badge}</div>
}
const Definition = ({ children }: { children: ReactNode }) => <p className="text-xs leading-relaxed text-text-secondary">{children}</p>

function Empty({ title, children }: { title: string; children: ReactNode }) {
  return <div data-empty-state className="rounded-2xl border border-dashed border-border-strong bg-surface p-8 text-center"><div className="font-display text-xl font-semibold">{title}</div><p className="mx-auto mt-1 max-w-md text-sm text-text-muted">{children}</p></div>
}

// ---------- Overview ----------
function OverviewTab({ c }: { c: Ctx }) {
  const o = c.o, m = o.metrics, f = funnel(o), src = openSources(o)
  const stageTone: Record<string, Tone> = { discovery: 'discovery', exploration: 'discovery', interest: 'interest', response: 'response' }
  const rows: BarRow[] = f.map(s => ({
    key: s.key, label: s.label, value: s.total[c.period], prior: c.period === 'current' ? s.total.prior : undefined, text: fmt(s.total[c.period]), tone: stageTone[s.stage],
    change: c.period === 'current' ? <Change d={s.total} /> : undefined,
  }))
  const t = trendOf(c, m.product_detail_opens.series)
  const week = (key: keyof typeof m) => m[key].series
  return (
    <div className="ins-grid">
      <Tile hero className="ins-hero" metric="product_detail_opens" label="Product detail opens" tone="interest" value={fmt(shown(c, m.product_detail_opens))} raw={shown(c, m.product_detail_opens)}
        change={changeOf(c, m.product_detail_opens)} note={<>Product interest: Buyers opening a Product. {priorLine(m.product_detail_opens)}.</>}>
        <div className="mt-5"><TrendChart {...t} tone="interest" name="Product detail opens" /></div>
        <DataTable summary="Table: Product detail opens by week" head={weeklyHead(o)} rows={[['Product detail opens', ...m.product_detail_opens.series]]} />
      </Tile>
      <Tile metric="scene_impressions" label="Scene impressions" tone="discovery" value={fmt(shown(c, m.scene_impressions))} raw={shown(c, m.scene_impressions)} change={changeOf(c, m.scene_impressions)} spark={week('scene_impressions')} note="Discovery" />
      <Tile metric="explore_opens" label="Explore opens" tone="discovery" value={fmt(shown(c, m.explore_opens))} raw={shown(c, m.explore_opens)} change={changeOf(c, m.explore_opens)} spark={week('explore_opens')} note={<>Exploration · {fmtPct(c.period === 'current' ? o.rates.explore.current : o.rates.explore.prior)} of impressions</>} />
      <Tile metric="cart_additions" label="Cart additions" badge={<span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">review only</span>} tone="interest" value={fmt(shown(c, m.cart_additions))} raw={shown(c, m.cart_additions)} change={changeOf(c, m.cart_additions)} spark={week('cart_additions')} note="Product interest. The Cart is a review; nothing is bought." />
      <Tile metric="inquiries" label="Inquiries" tone="response" value={fmt(shown(c, m.inquiries))} raw={shown(c, m.inquiries)} change={changeOf(c, m.inquiries)} spark={week('inquiries')} note="Response: questions from Buyers" />

      <Figure className="ins-span-2" title="From discovery to inquiry" subtitle={<>Stepped view of {c.period === 'current' ? 'the current 28 days (thin bar: the prior 28 days)' : 'the prior 28 days'}. Not a strict conversion path: Product opens also come from outside Scenes, and inquiries are a parallel route.</>}
        summary={`Stepped bars for ${c.period === 'current' ? 'the current' : 'the prior'} 28 days: ${f.map(s => `${s.label} ${fmt(s.total[c.period])}`).join('; ')}.`}
        table={{ summary: 'Table: the six steps, both windows', head: ['Step', 'Current 28 days', 'Prior 28 days', 'Change'], rows: f.map(s => [s.label, s.total.current, s.total.prior, s.total.change === null ? 'New or none' : `${(s.total.change * 100).toFixed(1)}%`]) }}>
        <Legend items={[{ tone: 'discovery', label: 'Discovery and exploration' }, { tone: 'interest', label: 'Product interest' }, { tone: 'response', label: 'Response' }]} />
        <BarList ordered ariaLabel="Discovery to inquiry steps" rows={rows} />
      </Figure>

      <Figure className="ins-span-2" title="Where Product opens come from" subtitle="Opens that started in a Scene, against opens from anywhere else (Storefront, search, Follows)."
        summary={`Current 28 days: ${fmt(src.scene.current)} Product opens from Scenes of ${fmt(src.all.current)}; prior 28 days: ${fmt(src.scene.prior)} of ${fmt(src.all.prior)}.`}
        table={{ summary: 'Table: Product opens by source', head: ['Source', 'Current 28 days', 'Prior 28 days'], rows: [['From Scenes', src.scene.current, src.scene.prior], ['Elsewhere', src.other.current, src.other.prior], ['All Product opens', src.all.current, src.all.prior]] }}>
        <BarList ariaLabel="Product opens by source" rows={[
          { key: 'scene', label: 'From Scenes', value: src.scene[c.period], prior: c.period === 'current' ? src.scene.prior : undefined, text: fmt(src.scene[c.period]), tone: 'interest', change: c.period === 'current' ? <Change d={src.scene} /> : undefined },
          { key: 'other', label: 'From elsewhere', value: src.other[c.period], prior: c.period === 'current' ? src.other.prior : undefined, text: fmt(src.other[c.period]), tone: 'neutral', change: c.period === 'current' ? <Change d={src.other} /> : undefined },
        ]} />
        <p data-metric="scene_share" className="mt-3 text-xs text-text-secondary">Scene share of Product opens: <span className="font-semibold" data-scene-share>{fmtPct(c.period === 'current' ? o.rates.scenePerOpen.current : o.rates.scenePerOpen.prior)}</span></p>
      </Figure>

      <Card className="ins-span-2" title="Response" subtitle="How quickly and how often Buyers' questions are answered.">
        <div className="grid grid-cols-2 gap-3">
          <Tile metric="responded_inquiries" label="Responded" tone="response" value={fmt(shown(c, m.responded_inquiries))} raw={shown(c, m.responded_inquiries)} change={changeOf(c, m.responded_inquiries)} />
          <Tile metric="response_rate" label="Response rate" tone="response" value={rateText(c, o.response.rate)} raw={o.response.rate[c.period]} change={rateChangeOf(c, o.response.rate)} note="Responded of inquiries" />
          <Tile metric="median_response_minutes" label="Median response" tone="response" value={medianText(o.response.medianMinutes[c.period])} raw={o.response.medianMinutes[c.period]} className="col-span-2"
            note="The median of the weekly medians; weeks with no answered inquiry have none." />
        </div>
      </Card>
      <Card className="ins-span-2" title="Further figures" subtitle="Supporting detail, both windows.">
        <dl className="ins-dl m-0 text-xs">
          <dt className="font-semibold text-text-muted">Measure</dt><dd className="m-0 text-right font-semibold text-text-muted">Prior 28 days</dd><dd className="m-0 text-right font-semibold text-text-muted">Current 28 days</dd>
          {([['Scene Saves', m.scene_saves], ['Product Saves', m.product_saves], ['Checkout-review starts (review only)', m.checkout_review_starts], ['New followers', m.new_followers]] as [string, Metric][]).map(([label, mm]) => (
            <Row3 key={label} label={label} prior={fmt(mm.total.prior)} current={fmt(mm.total.current)} metric={label.toLowerCase().replace(/[^a-z]+/g, '_')} />
          ))}
          <Row3 label="Explore rate" prior={fmtPct(o.rates.explore.prior)} current={fmtPct(o.rates.explore.current)} metric="explore_rate" />
          <Row3 label="Cart additions per Product open" prior={fmtPct(o.rates.cartPerOpen.prior)} current={fmtPct(o.rates.cartPerOpen.current)} metric="cart_rate" />
        </dl>
      </Card>
      <div className="ins-span-all">
        <DataTable summary="All weekly figures, eight weeks" head={weeklyHead(o)} rows={([
          ['Scene impressions', 'scene_impressions'], ['Explore opens', 'explore_opens'], ['Product detail opens', 'product_detail_opens'], ['Product Saves', 'product_saves'], ['Cart additions', 'cart_additions'],
          ['Checkout-review starts (review only)', 'checkout_review_starts'], ['Inquiries', 'inquiries'], ['Responded', 'responded_inquiries'], ['New followers', 'new_followers'],
        ] as [string, keyof Overview['metrics']][]).map(([label, key]): Cells => [label, ...m[key].series])} />
      </div>
    </div>
  )
}
const Row3 = ({ label, prior, current, metric }: { label: string; prior: string; current: string; metric: string }) => <><dt data-aggregate={metric}>{label}</dt><dd className="m-0 text-right tabular-nums text-text-secondary">{prior}</dd><dd className="m-0 text-right font-semibold tabular-nums">{current}</dd></>
const medianText = (v: number | null) => (v === null ? NOT_ENOUGH : `${Number.isInteger(v) ? v : v.toFixed(1)} min`)

function SimOverview({ c }: { c: Ctx }) {
  const s = simulationOverview(c.a, c.sellerId), o = c.o
  const bad = delta(s.cancelled.total.current + s.failed.total.current, s.cancelled.total.prior + s.failed.total.prior)
  const gmvT = trendOf(c, s.gmv.series)
  return (
    <>
      <SectionTitle badge={<SimBadge />}>Simulated commerce</SectionTitle>
      <div data-sim-only="overview" className="ins-span-all"><Notice tone="warning" title="Simulated paid Orders, not live commerce">These figures come from simulated paid Orders in the internal simulation. Merchandise GMV is the simulated paid merchandise subtotal, not revenue. Orders placed in this session are not counted here; Orders that are still active today are left out of the historical weeks.</Notice></div>
      <div className="ins-span-all ins-grid" data-sim-only="overview-figures">
        <Tile metric="sim_paid_orders" label="Simulated paid Orders" badge={<SimBadge />} tone="interest" value={fmt(s.paid.total[c.period])} raw={s.paid.total[c.period]} change={changeOf(c, s.paid)} spark={s.paid.series} />
        <Tile metric="sim_completed_orders" label="Completed Orders" badge={<SimBadge />} tone="interest" value={fmt(s.completed.total[c.period])} raw={s.completed.total[c.period]} change={changeOf(c, s.completed)} spark={s.completed.series} note={<>Completion {rateText(c, s.completionRate)}</>} />
        <Tile metric="sim_gmv" label="Merchandise GMV (simulated)" badge={<SimBadge />} tone="interest" value={fmtEtb(s.gmv.total[c.period])} raw={s.gmv.total[c.period]} change={changeOf(c, s.gmv)} spark={s.gmv.series} note="Paid merchandise subtotal. Not revenue." />
        <Tile metric="sim_failed_cancelled" label="Failed or cancelled" badge={<SimBadge />} tone="neutral" value={fmt(c.period === 'current' ? bad.current : bad.prior)} raw={c.period === 'current' ? bad.current : bad.prior} change={changeOf(c, { series: [], total: bad }, true)}
          note={<>{fmt(s.failed.total[c.period])} failed delivery · {fmt(s.cancelled.total[c.period])} cancelled</>} />
        <Figure className="ins-span-all" title="Merchandise GMV by week (simulated)" badge={<SimBadge />} subtitle="ETB, simulated paid merchandise subtotal; not revenue."
          summary={`Simulated merchandise GMV by week: ${s.gmv.series.map((v, i) => `${weekLabels(o)[i]} ${fmtEtb(v)}`).join('; ')}.`}
          table={{ summary: 'Table: simulated Orders and GMV by week', head: weeklyHead(o), rows: [['Paid Orders', ...s.paid.series], ['Completed Orders', ...s.completed.series], ['GMV (ETB)', ...s.gmv.series], ['Cancelled', ...s.cancelled.series], ['Failed delivery', ...s.failed.series]] }}>
          <TrendChart {...gmvT} tone="interest" variant="bars" name="Simulated merchandise GMV" valueText={fmtEtb} />
        </Figure>
      </div>
    </>
  )
}

// ---------- Scene Performance ----------
function ScenesTab({ c }: { c: Ctx }) {
  const o = c.o, m = o.metrics, ranked = rankScenes(c.scenes), at = sceneAttribution(c.a, c.sellerId)
  const total = (pick: (s: SceneRow) => Metric): Metric => ({ series: o.windows.weeks.map((_, i) => c.scenes.reduce((n, s) => n + pick(s).series[i], 0)), total: delta(c.scenes.reduce((n, s) => n + pick(s).total.current, 0), c.scenes.reduce((n, s) => n + pick(s).total.prior, 0)) })
  const hotspot = total(s => s.hotspotTaps)
  const sceneMax = Math.max(1, ...c.scenes.flatMap(s => s.productOpens.series))
  const t = trendOf(c, m.scene_product_opens.series)
  const rows: BarRow[] = ranked.map(s => ({
    key: s.sceneId, label: sceneTitle(s.sceneId), value: s.productOpens.total[c.period], prior: c.period === 'current' ? s.productOpens.total.prior : undefined, text: fmt(s.productOpens.total[c.period]), tone: 'interest',
    detail: <span>Impressions {fmt(s.impressions.total[c.period])} · Explore opens {fmt(s.explore.total[c.period])} ({rateText(c, s.exploreRate)}) · Inquiries {fmt(s.inquiries.total[c.period])}</span>,
    change: c.period === 'current' ? <Change d={s.productOpens.total} /> : undefined,
  }))
  return (
    <div className="ins-grid">
      <Tile hero className="ins-hero" metric="scene_product_opens" label="Product opens from Scenes" tone="interest" value={fmt(shown(c, m.scene_product_opens))} raw={shown(c, m.scene_product_opens)} change={changeOf(c, m.scene_product_opens)}
        note={<>Product interest that started in one of your Scenes. {priorLine(m.scene_product_opens)}.</>}>
        <div className="mt-5"><TrendChart {...t} tone="interest" name="Product opens from Scenes" /></div>
        <DataTable summary="Table: Product opens from Scenes by week" head={weeklyHead(o)} rows={[['Product opens from Scenes', ...m.scene_product_opens.series]]} />
      </Tile>
      <Tile metric="scene_impressions" label="Scene impressions" tone="discovery" value={fmt(shown(c, m.scene_impressions))} raw={shown(c, m.scene_impressions)} change={changeOf(c, m.scene_impressions)} spark={m.scene_impressions.series} note="Discovery" />
      <Tile metric="explore_opens" label="Explore opens" tone="discovery" value={fmt(shown(c, m.explore_opens))} raw={shown(c, m.explore_opens)} change={changeOf(c, m.explore_opens)} spark={m.explore_opens.series} note={<>Exploration · {rateText(c, o.rates.explore)} of impressions</>} />
      <Tile metric="hotspot_taps" label="Hotspot taps" tone="discovery" value={fmt(shown(c, hotspot))} raw={shown(c, hotspot)} change={changeOf(c, hotspot)} spark={hotspot.series} note="Taps on a tagged Product in a Scene" />
      <Tile metric="scene_saves" label="Scene Saves" tone="interest" value={fmt(shown(c, m.scene_saves))} raw={shown(c, m.scene_saves)} change={changeOf(c, m.scene_saves)} spark={m.scene_saves.series} note="Popularity signal" />

      <Figure className="ins-span-all" title="Scenes ranked by Product opens" subtitle={<>Which Scenes led Buyers to a Product. {c.period === 'current' ? 'Thin bar: the prior 28 days.' : ''}</>}
        summary={`Scenes ranked by Product opens in the ${c.period === 'current' ? 'current' : 'prior'} 28 days: ${ranked.map(s => `${sceneTitle(s.sceneId)} ${fmt(s.productOpens.total[c.period])}`).join('; ')}.`}
        table={{ summary: 'Table: every Scene, both windows', head: ['Scene', 'Product opens current', 'Product opens prior', 'Impressions current', 'Explore opens current', 'Hotspot taps current', 'Likes current', 'Saves current', 'Shares current', 'Inquiries current'],
          rows: ranked.map(s => [sceneTitle(s.sceneId), s.productOpens.total.current, s.productOpens.total.prior, s.impressions.total.current, s.explore.total.current, s.hotspotTaps.total.current, s.likes.total.current, s.saves.total.current, s.shares.total.current, s.inquiries.total.current]) }}>
        <BarList ordered ariaLabel="Scenes ranked by Product opens" rows={rows} />
      </Figure>

      <Figure className="ins-span-all" title="Scene by scene, week by week" subtitle="Product opens per week, every Scene on the same scale, so the small charts compare."
        summary={`Weekly Product opens for each of ${ranked.length} Scenes, on one shared scale.`}
        table={{ summary: 'Table: weekly Product opens per Scene', head: weeklyHead(o), rows: ranked.map((s): Cells => [sceneTitle(s.sceneId), ...s.productOpens.series]) }}>
        <ul aria-label="Weekly Product opens per Scene" className="ins-multiples m-0 list-none p-0">
          {ranked.map(s => (
            <li key={s.sceneId} data-small-multiple={s.sceneId} className="min-w-0 rounded-xl bg-surface-raised p-3">
              <div className="truncate text-xs font-semibold">{sceneTitle(s.sceneId)}</div>
              <div className="mt-1 flex items-end justify-between gap-2"><span className="font-display text-xl font-semibold tabular-nums">{fmt(s.productOpens.total[c.period])}</span><Sparkline values={s.productOpens.series} tone="interest" max={sceneMax} label={`${sceneTitle(s.sceneId)}, Product opens by week`} /></div>
              {c.period === 'current' && <div className="mt-1"><Change d={s.productOpens.total} /></div>}
            </li>
          ))}
        </ul>
      </Figure>

      <Card className="ins-span-all" title="Attribution check" subtitle="Each Scene's Product opens add up to the Seller's Scene-attributed opens, which are the Product opens that started in a Scene.">
        <p className="text-xs text-text-secondary">Product opens from Scenes, all Scenes: <span className="font-semibold" data-attribution>{fmt(m.scene_product_opens.total.prior + m.scene_product_opens.total.current)}</span> over eight weeks; the same figure counted from the Products' Scene-attributed opens: <span className="font-semibold" data-attribution-products>{fmt(at.reduce((n, w) => n + w.productAttributed, 0))}</span>.</p>
        <DataTable summary="Table: attribution by week" head={['Week', 'Scenes', 'Scene-attributed (Seller)', 'Scene-attributed (Products)', 'Other opens', 'All Product opens']} rows={at.map(w => [`Week of ${fmtDay(w.weekStart)}`, w.scenes, w.sellerSceneOpens, w.productAttributed, w.productOther, w.allOpens])} />
      </Card>
    </div>
  )
}

function SimScenes({ c }: { c: Ctx }) {
  const rows = simulationScenes(c.a, c.sellerId).map(r => ({ id: r.sceneId, cur: r.current, pri: r.prior }))
    .sort((x, y) => (y.cur?.attributed_merchandise_gmv_etb ?? 0) - (x.cur?.attributed_merchandise_gmv_etb ?? 0) || x.id.localeCompare(y.id))
  const pick = (r: (typeof rows)[number]) => (c.period === 'current' ? r.cur : r.pri)
  return (
    <>
      <SectionTitle badge={<SimBadge />}>Simulated Orders from Scenes</SectionTitle>
      <div data-sim-only="scenes" className="ins-span-all">
        {rows.length === 0 ? <Empty title="No simulated Orders from Scenes">No simulated paid Order in the selected period started from one of this Seller's Scenes.</Empty> : (
          <Figure title="Attributed merchandise GMV by Scene (simulated)" badge={<SimBadge />} subtitle="Simulated paid Orders that started in a Scene, in the selected 28 days. GMV is simulated paid merchandise subtotal, not revenue."
            summary={`Simulated attributed GMV: ${rows.map(r => `${sceneTitle(r.id)} ${fmtEtb(pick(r)?.attributed_merchandise_gmv_etb ?? 0)}`).join('; ')}.`}
            table={{ summary: 'Table: simulated Scene attribution, both windows', head: ['Scene', 'Paid Orders current', 'Completed current', 'GMV current (ETB)', 'Paid Orders prior', 'Completed prior', 'GMV prior (ETB)'],
              rows: rows.map(r => [sceneTitle(r.id), r.cur?.simulated_attributed_paid_orders ?? 0, r.cur?.simulated_attributed_completed_orders ?? 0, r.cur?.attributed_merchandise_gmv_etb ?? 0, r.pri?.simulated_attributed_paid_orders ?? 0, r.pri?.simulated_attributed_completed_orders ?? 0, r.pri?.attributed_merchandise_gmv_etb ?? 0]) }}>
            <BarList ariaLabel="Attributed merchandise GMV by Scene" rows={rows.map(r => ({ key: r.id, label: sceneTitle(r.id), value: pick(r)?.attributed_merchandise_gmv_etb ?? 0, text: fmtEtb(pick(r)?.attributed_merchandise_gmv_etb ?? 0), tone: 'interest' as Tone,
              detail: <span>{fmt(pick(r)?.simulated_attributed_paid_orders ?? 0)} paid Order{pick(r)?.simulated_attributed_paid_orders === 1 ? '' : 's'} · {fmt(pick(r)?.simulated_attributed_completed_orders ?? 0)} completed</span> }))} />
          </Figure>
        )}
      </div>
    </>
  )
}

// ---------- Product Performance ----------
function ProductsTab({ c }: { c: Ctx }) {
  const o = c.o, m = o.metrics, ranked = rankProducts(c.products)
  const t = trendOf(c, m.cart_additions.series)
  const maxOpens = Math.max(1, ...c.products.flatMap(p => p.opens.series))
  const rows: BarRow[] = ranked.map(p => ({
    key: p.productId, label: productName(p.productId), value: p.opens.total[c.period], prior: c.period === 'current' ? p.opens.total.prior : undefined, text: fmt(p.opens.total[c.period]), tone: 'interest',
    detail: <span>Saves {fmt(p.saves.total[c.period])} · Cart additions {fmt(p.cart.total[c.period])} (review only) · Checkout-review starts {fmt(p.review.total[c.period])} · Cart per open {rateText(c, p.cartPerOpen)}</span>,
    change: c.period === 'current' ? <Change d={p.opens.total} /> : undefined,
  }))
  const top = ranked.slice(0, 6)
  return (
    <div className="ins-grid">
      <Tile hero className="ins-hero" metric="cart_additions" label="Cart additions" badge={<span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">review only</span>} tone="interest"
        value={fmt(shown(c, m.cart_additions))} raw={shown(c, m.cart_additions)} change={changeOf(c, m.cart_additions)} note={<>Buyers adding a Product to the Cart review. Nothing is bought. {priorLine(m.cart_additions)}.</>}>
        <div className="mt-5"><TrendChart {...t} tone="interest" name="Cart additions" /></div>
        <DataTable summary="Table: Cart additions by week" head={weeklyHead(o)} rows={[['Cart additions', ...m.cart_additions.series]]} />
      </Tile>
      <Tile metric="product_detail_opens" label="Product detail opens" tone="interest" value={fmt(shown(c, m.product_detail_opens))} raw={shown(c, m.product_detail_opens)} change={changeOf(c, m.product_detail_opens)} spark={m.product_detail_opens.series} note="Interest" />
      <Tile metric="product_saves" label="Product Saves" tone="interest" value={fmt(shown(c, m.product_saves))} raw={shown(c, m.product_saves)} change={changeOf(c, m.product_saves)} spark={m.product_saves.series} note="Popularity signal" />
      <Tile metric="checkout_review_starts" label="Checkout-review starts" badge={<span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">review only</span>} tone="interest" value={fmt(shown(c, m.checkout_review_starts))} raw={shown(c, m.checkout_review_starts)} change={changeOf(c, m.checkout_review_starts)} spark={m.checkout_review_starts.series} note="No Order is placed" />
      <Tile metric="cart_rate" label="Cart additions per Product open" tone="interest" value={rateText(c, o.rates.cartPerOpen)} raw={o.rates.cartPerOpen[c.period]} change={rateChangeOf(c, o.rates.cartPerOpen)} />

      <Figure className="ins-span-all" title="Products ranked by detail opens" subtitle={<>Every Product. {c.period === 'current' ? 'Thin bar: the prior 28 days.' : ''}</>}
        summary={`Products ranked by detail opens in the ${c.period === 'current' ? 'current' : 'prior'} 28 days: ${ranked.map(p => `${productName(p.productId)} ${fmt(p.opens.total[c.period])}`).join('; ')}.`}
        table={{ summary: 'Table: every Product, both windows', head: ['Product', 'Opens current', 'Opens prior', 'From Scenes current', 'Saves current', 'Cart additions current', 'Checkout-review starts current', 'Inquiries current'],
          rows: ranked.map(p => [productName(p.productId), p.opens.total.current, p.opens.total.prior, p.sceneOpens.total.current, p.saves.total.current, p.cart.total.current, p.review.total.current, p.inquiries.total.current]) }}>
        <BarList ordered ariaLabel="Products ranked by detail opens" rows={rows} />
      </Figure>

      <Figure className="ins-span-all" title="The top Products, week by week" subtitle="Detail opens per week for the six most opened Products, on one shared scale."
        summary={`Weekly detail opens for the ${top.length} most opened Products.`}
        table={{ summary: 'Table: weekly detail opens, top Products', head: weeklyHead(o), rows: top.map((p): Cells => [productName(p.productId), ...p.opens.series]) }}>
        <ul aria-label="Weekly detail opens per Product" className="ins-multiples m-0 list-none p-0">
          {top.map(p => (
            <li key={p.productId} data-small-multiple={p.productId} className="min-w-0 rounded-xl bg-surface-raised p-3">
              <div className="truncate text-xs font-semibold">{productName(p.productId)}</div>
              <div className="mt-1 flex items-end justify-between gap-2"><span className="font-display text-xl font-semibold tabular-nums">{fmt(p.opens.total[c.period])}</span><Sparkline values={p.opens.series} tone="interest" max={maxOpens} label={`${productName(p.productId)}, detail opens by week`} /></div>
              {c.period === 'current' && <div className="mt-1"><Change d={p.opens.total} /></div>}
            </li>
          ))}
        </ul>
      </Figure>
    </div>
  )
}

function SimProducts({ c }: { c: Ctx }) {
  const rows = simulationProducts(c.a, c.sellerId).map(r => ({ id: r.productId, cur: r.current, pri: r.prior }))
    .sort((x, y) => (y.cur?.merchandise_gmv_etb ?? 0) - (x.cur?.merchandise_gmv_etb ?? 0) || x.id.localeCompare(y.id))
  const pick = (r: (typeof rows)[number]) => (c.period === 'current' ? r.cur : r.pri)
  return (
    <>
      <SectionTitle badge={<SimBadge />}>Simulated Orders by Product</SectionTitle>
      <div data-sim-only="products" className="ins-span-all">
        {rows.length === 0 ? <Empty title="No simulated Orders">No simulated paid Order includes this Seller's Products.</Empty> : (
          <Figure title="Merchandise GMV by Product (simulated)" badge={<SimBadge />} subtitle="Simulated paid Orders in the selected 28 days. Order counts are per Product: an Order with several Products counts under each, so do not add them up. GMV is not revenue."
            summary={`Simulated GMV by Product: ${rows.map(r => `${productName(r.id)} ${fmtEtb(pick(r)?.merchandise_gmv_etb ?? 0)}`).join('; ')}.`}
            table={{ summary: 'Table: simulated Orders by Product, both windows', head: ['Product', 'Orders containing it current', 'Completed current', 'Units current', 'GMV current (ETB)', 'Orders containing it prior', 'Completed prior', 'Units prior', 'GMV prior (ETB)'],
              rows: rows.map(r => [productName(r.id), r.cur?.simulated_paid_orders ?? 0, r.cur?.simulated_completed_orders ?? 0, r.cur?.units ?? 0, r.cur?.merchandise_gmv_etb ?? 0, r.pri?.simulated_paid_orders ?? 0, r.pri?.simulated_completed_orders ?? 0, r.pri?.units ?? 0, r.pri?.merchandise_gmv_etb ?? 0]) }}>
            <BarList ariaLabel="Merchandise GMV by Product" rows={rows.map(r => ({ key: r.id, label: productName(r.id), value: pick(r)?.merchandise_gmv_etb ?? 0, text: fmtEtb(pick(r)?.merchandise_gmv_etb ?? 0), tone: 'interest' as Tone,
              detail: <span>{fmt(pick(r)?.simulated_paid_orders ?? 0)} Order{pick(r)?.simulated_paid_orders === 1 ? '' : 's'} containing it · {fmt(pick(r)?.simulated_completed_orders ?? 0)} completed · {fmt(pick(r)?.units ?? 0)} unit{pick(r)?.units === 1 ? '' : 's'}</span> }))} />
          </Figure>
        )}
      </div>
    </>
  )
}

// ---------- Seller Reputation ----------
function Stars({ s, label, id }: { s: StarSummary; label: string; id: string }) {
  const max = Math.max(1, ...s.counts)
  return (
    <div data-stars={id}>
      <div className="flex items-end gap-2"><span className="font-display text-4xl font-semibold tabular-nums" data-stars-average>{fmtStars(s.average)}</span>{s.average !== null && <span aria-hidden="true" className="mb-1 text-lg text-warning">★</span>}</div>
      <div className="mt-1 text-xs text-text-muted" data-stars-count>{s.count === 0 ? 'No ratings yet: not enough data for an average' : `${s.count} ${label}${s.count === 1 ? '' : 's'}`}</div>
      <ul aria-label={`${label} distribution`} className="m-0 mt-3 flex list-none flex-col gap-1.5 p-0">
        {[5, 4, 3, 2, 1].map(star => (
          <li key={star} className="flex items-center gap-2 text-xs"><span className="w-12 flex-shrink-0 text-text-secondary">{star} star{star === 1 ? '' : 's'}</span><span aria-hidden="true" className="h-2 flex-1 rounded-full bg-surface-raised"><span className="block h-full rounded-full" style={{ width: `${(s.counts[star - 1] / max) * 100}%`, background: 'var(--ins-interest)' }} /></span><span className="w-6 flex-shrink-0 text-right font-semibold tabular-nums" data-star-count={star}>{s.counts[star - 1]}</span></li>
        ))}
      </ul>
    </div>
  )
}

function ReputationTab({ c }: { c: Ctx }) {
  const o = c.o, m = o.metrics, r = o.response
  const rep = (OPERATIONS.seller_reputation as unknown as { seller_id: string; mvp_trust: string; historical_trust_showcase: string }[]).find(x => x.seller_id === c.sellerId)!
  const trust = trustView(rep, c.lifecycle)
  const pctSeries = r.rateSeries.map(v => (v === null ? null : v * 100))
  const t = trendOf(c, pctSeries), tm = trendOf(c, r.medianMinutes.series)
  const sum = (pick: (s: SceneRow) => Metric): Metric => ({ series: o.windows.weeks.map((_, i) => c.scenes.reduce((n, s) => n + pick(s).series[i], 0)), total: delta(c.scenes.reduce((n, s) => n + pick(s).total.current, 0), c.scenes.reduce((n, s) => n + pick(s).total.prior, 0)) })
  const likes = sum(s => s.likes), shares = sum(s => s.shares)
  const mdn = r.medianMinutes
  const mdnDelta = mdn.current !== null && mdn.prior !== null ? delta(mdn.current, mdn.prior) : null
  const newFollowers = m.new_followers
  const ft = trendOf(c, newFollowers.series)
  return (
    <div className="ins-grid">
      <Tile hero className="ins-hero" metric="response_rate" label="Response rate" tone="response" value={rateText(c, r.rate)} raw={r.rate[c.period]} change={rateChangeOf(c, r.rate)}
        note={<>Responded inquiries as a share of all inquiries in the 28 days. Prior 28 days <span data-prior>{fmtPct(r.rate.prior)}</span> · Current 28 days <span data-current>{fmtPct(r.rate.current)}</span>.</>}>
        <div className="mt-5"><TrendChart {...t} tone="response" name="Response rate by week" max={100} valueText={v => `${v.toFixed(0)}%`} /></div>
        <p className="mt-1 text-[11px] text-text-muted">A gap is a week with no inquiries: there is nothing to rate.</p>
        <DataTable summary="Table: response rate by week" head={weeklyHead(o)} rows={[['Inquiries', ...m.inquiries.series], ['Responded', ...m.responded_inquiries.series], ['Response rate', ...r.rateSeries.map(v => fmtPct(v, 0))]]} />
      </Tile>
      <Tile metric="inquiries" label="Inquiries" tone="response" value={fmt(shown(c, m.inquiries))} raw={shown(c, m.inquiries)} change={changeOf(c, m.inquiries)} spark={m.inquiries.series} />
      <Tile metric="responded_inquiries" label="Responded" tone="response" value={fmt(shown(c, m.responded_inquiries))} raw={shown(c, m.responded_inquiries)} change={changeOf(c, m.responded_inquiries)} spark={m.responded_inquiries.series} />
      <Tile metric="median_response_minutes" label="Median response time" tone="response" value={medianText(mdn[c.period])} raw={mdn[c.period]} spark={mdn.series}
        change={c.period === 'current' ? (mdnDelta ? <Change d={mdnDelta} lowerIsBetter /> : <span data-change className="text-xs text-text-muted">{NOT_ENOUGH} to compare</span>) : undefined} note="Median of the weekly medians; faster is better." />
      <Tile metric="new_followers" label="New followers" tone="neutral" value={fmt(shown(c, newFollowers))} raw={shown(c, newFollowers)} change={changeOf(c, newFollowers)} spark={newFollowers.series} note={<>{fmt(o.followers.end)} followers now (from {fmt(o.followers.opening)} eight weeks ago)</>} />

      <Figure className="ins-span-2" title="Median response time by week" subtitle="Minutes; a gap is a week with no answered inquiry (not enough data)."
        summary={`Weekly median response minutes: ${mdn.series.map((v, i) => `${weekLabels(o)[i]} ${v === null ? NOT_ENOUGH : v}`).join('; ')}.`}
        table={{ summary: 'Table: median response minutes by week', head: weeklyHead(o), rows: [['Median response (min)', ...mdn.series.map(v => (v === null ? NOT_ENOUGH : v))]] }}>
        <TrendChart {...tm} tone="response" name="Median response minutes" valueText={v => `${v} min`} />
      </Figure>
      <Figure className="ins-span-2" title="New followers by week" subtitle={<>Followers are the Buyers who follow the Seller. Now {fmt(o.followers.end)}.</>}
        summary={`New followers by week: ${newFollowers.series.map((v, i) => `${weekLabels(o)[i]} ${v}`).join('; ')}. Followers now ${o.followers.end}.`}
        table={{ summary: 'Table: followers by week', head: weeklyHead(o), rows: [['New followers', ...newFollowers.series], ['Followers at week end', ...o.followers.series]] }}>
        <TrendChart {...ft} tone="neutral" variant="bars" name="New followers" />
      </Figure>

      <SectionTitle>Four separate measures</SectionTitle>
      <div className="ins-span-all"><Definition>Popularity, Product ratings, Seller Service and Trust each stand on their own. No score combines them, and Likes play no part in any rating or in Trust.</Definition></div>
      <Card className="ins-span-2" data-reputation="popularity" title="Popularity (engagement)" subtitle="How much attention your content gets: Scene Likes, Saves and Shares, and Product Saves. It is not a quality rating and does not change Trust.">
        <dl className="ins-dl m-0 text-xs">
          <dt className="font-semibold text-text-muted">Measure</dt><dd className="m-0 text-right font-semibold text-text-muted">Prior 28 days</dd><dd className="m-0 text-right font-semibold text-text-muted">Current 28 days</dd>
          <Row3 label="Scene Likes" prior={fmt(likes.total.prior)} current={fmt(likes.total.current)} metric="likes" />
          <Row3 label="Scene Saves" prior={fmt(m.scene_saves.total.prior)} current={fmt(m.scene_saves.total.current)} metric="scene_saves" />
          <Row3 label="Scene Shares" prior={fmt(shares.total.prior)} current={fmt(shares.total.current)} metric="shares" />
          <Row3 label="Product Saves" prior={fmt(m.product_saves.total.prior)} current={fmt(m.product_saves.total.current)} metric="product_saves" />
        </dl>
      </Card>
      <Card className="ins-span-2" data-reputation="trust" title="Trust level" subtitle="Set by Adulis from platform evidence. Read-only: no figure on this page changes it.">
        <div className="font-display text-3xl font-semibold" data-trust-level>{trust.mvp}</div>
        <p className="mt-1 text-xs text-text-secondary">Current MVP level. A Seller at the NEW baseline has no earned Trust history yet.</p>
        {trust.note && <p data-lifecycle-note className="mt-2 rounded-lg bg-warning-bg px-3 py-2 text-xs text-text-primary">{trust.note}</p>}
      </Card>
      {!c.simulation && (
        <div className="ins-span-all"><Notice tone="info" title="Reviews and ratings are part of the internal simulation">Seller Service ratings, Product Quality ratings and the historical Trust showcase come from simulated purchased reviews, which the current MVP does not have.</Notice></div>
      )}
    </div>
  )
}

function SimReputation({ c }: { c: Ctx }) {
  const { sim } = useSim()
  const s = simulationOverview(c.a, c.sellerId)
  const rep = (OPERATIONS.seller_reputation as unknown as { seller_id: string; mvp_trust: string; historical_trust_showcase: string }[]).find(x => x.seller_id === c.sellerId)!
  const trust = trustView(rep, c.lifecycle)
  const service = starSummary(visibleReviews(sim).filter(r => r.sellerId === c.sellerId).map(r => r.stars))
  const products = Object.values(WORLD.products).filter(p => p.sellerId === c.sellerId)
  const perProduct = products.map(p => ({ id: p.id, name: productName(p.id), s: starSummary(ratingsOfProduct(sim, p.id).map(x => x.stars)) }))
  const quality = starSummary(products.flatMap(p => ratingsOfProduct(sim, p.id).map(x => x.stars)))
  const rated = perProduct.filter(p => p.s.count > 0)
  const t = trendOf(c, s.reviews.series)
  return (
    <>
      <SectionTitle badge={<SimBadge />}>Reviews, ratings and the Trust showcase</SectionTitle>
      <div className="ins-span-all" data-sim-only="reputation"><Notice tone="warning" title="Simulated purchased reviews">These come from simulated paid Orders in the internal simulation. They are not verified purchases and never change the MVP Trust level. A Seller with no reviews shows “{NOT_ENOUGH}”, never 0.</Notice></div>
      <Card className="ins-span-2 ins-sim" data-reputation="service" badge={<SimBadge />} title="Seller Service rating" subtitle="How Buyers rate the Seller's service (one rating per purchased review). It is about the Seller, never about a Product.">
        <Stars s={service} label="review" id="service" />
      </Card>
      <Card className="ins-span-2 ins-sim" data-reputation="quality" badge={<SimBadge />} title="Product Quality ratings" subtitle="How Buyers rate each Product they received (one rating per received Order line). It is about the Product, never about the Seller.">
        <Stars s={quality} label="Product rating" id="quality" />
        <div className="mt-4 text-[10px] font-semibold uppercase tracking-wider text-text-muted">By Product</div>
        <ul aria-label="Product Quality by Product" className="m-0 mt-1 flex list-none flex-col divide-y divide-border p-0 text-xs">
          {perProduct.map(p => <li key={p.id} data-pq-product={p.id} className="flex items-center justify-between gap-3 py-1.5"><span className="min-w-0 truncate">{p.name}</span><span className="flex-shrink-0 font-semibold tabular-nums">{p.s.count === 0 ? NOT_ENOUGH : `★ ${fmtStars(p.s.average)} · ${p.s.count}`}</span></li>)}
        </ul>
        {rated.length === 0 && <p className="mt-2 text-xs text-text-muted">No Product has a rating yet.</p>}
      </Card>
      <Card className="ins-span-2 ins-sim" data-reputation="showcase" badge={<SimBadge />} title="Historical Trust showcase" subtitle="A level shown for the simulation only, from the historical record. It is not the MVP Trust level above.">
        <div className="font-display text-3xl font-semibold" data-showcase-level>{trust.showcase ?? NOT_ENOUGH}</div>
        <p className="mt-1 text-xs text-text-secondary">{trust.showcase ? 'Historical showcase level' : 'No history, so no showcase level.'}</p>
      </Card>
      <Figure className="ins-span-2" title="Published reviews by week" badge={<SimBadge />} subtitle="Purchased reviews published in each week of the historical record."
        summary={`Published reviews by week: ${s.reviews.series.map((v, i) => `${weekLabels(c.o)[i]} ${v}`).join('; ')}.`}
        table={{ summary: 'Table: published reviews by week', head: weeklyHead(c.o), rows: [['Published reviews', ...s.reviews.series]] }}>
        <TrendChart {...t} tone="interest" variant="bars" name="Published reviews" />
      </Figure>
    </>
  )
}

// ---------- the panel ----------
const Pill = ({ active, onClick, children, label }: { active: boolean; onClick: () => void; children: ReactNode; label?: string }) => (
    <button type="button" aria-pressed={active} aria-label={label} onClick={onClick} className={`min-h-9 rounded-lg px-3 py-1.5 text-xs font-semibold ${active ? 'bg-surface text-text-primary shadow-sm' : 'text-text-muted'}`}>{children}</button>
)

export default function MarketplaceInsights({ sellerId, whoSees }: { sellerId: string; whoSees: Record<TabKey, string> }) {
  const a = useAnalytics()
  const { simulation } = usePrototypeMode()
  const [tab, setTab] = useState<TabKey>('overview')
  const [period, setPeriod] = useState<Period>('current')
  const [range, setRange] = useState<Range>('8w')
  const summary = (OPERATIONS.seller_summary as unknown as { seller_id: string; lifecycle: Lifecycle; opening_followers_8w: number }[]).find(s => s.seller_id === sellerId)
  const name = (SELLERS as Record<string, { name: string }>)[sellerId]?.name ?? sellerId
  const lifecycle: Lifecycle = summary?.lifecycle ?? 'ACTIVE'
  const c = useMemo<Ctx | null>(() => a && summary ? ({
    a, sellerId, name, lifecycle, o: overview(a, sellerId, summary.opening_followers_8w), history: hasHistory(a, sellerId), period, range, simulation, opening: summary.opening_followers_8w,
    scenes: sceneRows(a, sellerId), products: productRows(a, sellerId),
  }) : null, [a, sellerId, summary, name, lifecycle, period, range, simulation])

  const draft = lifecycle === 'DRAFT'
  return (
    <div className="ins-root mx-auto max-w-7xl p-8" data-insights data-insights-tab={tab} data-insights-period={period}>
      <div className="mb-5">
        <h1 className="font-display text-3xl font-semibold">Insights</h1>
        <p className="mt-1 text-sm text-text-muted">Store, Scene, Product and reputation performance for {name}.</p>
      </div>
      <div role="tablist" aria-label="Insights views" className="console-segmented mb-4 flex rounded-xl bg-surface-raised p-1">
        {TABS.map(([key, label]) => <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)} className={`rounded-lg px-4 py-2 text-xs font-semibold ${tab === key ? 'bg-surface text-text-primary shadow-sm' : 'text-text-muted'}`}>{label}</button>)}
      </div>
      {c && !draft && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-xl border border-border bg-surface px-4 py-3" data-insights-controls>
          <div className="min-w-0 text-xs text-text-secondary" data-window-note>
            <p className="m-0"><span className="font-semibold">Current 28 days</span> {fmtRange(c.o.windows.current.start, c.o.windows.current.end)} · <span className="font-semibold">Prior 28 days</span> {fmtRange(c.o.windows.prior.start, c.o.windows.prior.end)}</p>
            <p className="m-0 mt-0.5 text-text-muted">Four whole weeks each, from the eight weeks of records. Synthetic aggregate observations, not the full audience; selectable Buyer accounts are only a sample of it.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div role="group" aria-label="Period" className="flex rounded-xl bg-surface-raised p-1"><Pill active={period === 'current'} onClick={() => setPeriod('current')}>Current 28 days</Pill><Pill active={period === 'prior'} onClick={() => setPeriod('prior')}>Prior 28 days</Pill></div>
            <div role="group" aria-label="Trend range" className="flex rounded-xl bg-surface-raised p-1"><Pill active={range === '8w'} onClick={() => setRange('8w')}>8 weeks</Pill><Pill active={range === '28d'} onClick={() => setRange('28d')}>Selected 28 days</Pill></div>
          </div>
        </div>
      )}
      {!c ? <div role="status" className="rounded-2xl border border-border bg-surface p-8 text-sm text-text-muted">Loading the analytics records…</div>
        : draft ? <Empty title={`${NEW_SELLER_NOTE}`}>{name} is a Draft Seller. It has no history, so there is nothing to chart: Insights fill in once it is published and Buyers start to interact. Nothing here is zero; there are no records.</Empty>
        : (
          <>
            {lifecycle === 'SUSPENDED' && <div className="mb-4" data-lifecycle-note><Notice tone="warning" title="Suspended Seller: internal records only">{name} is suspended. Its historical records are shown to the operator side only and are never visible to Buyers. {c.history ? '' : 'It has no recorded activity in these eight weeks.'}</Notice></div>}
            {tab === 'overview' && (c.history ? <OverviewTab c={c} /> : <Empty title="No recorded activity">There is no recorded activity for these eight weeks.</Empty>)}
            {tab === 'overview' && simulation && <div className="ins-grid mt-5"><SimOverview c={c} /></div>}
            {tab === 'scenes' && (c.history ? <ScenesTab c={c} /> : <Empty title="No recorded activity">There is no recorded Scene activity for these eight weeks.</Empty>)}
            {tab === 'scenes' && simulation && <div className="ins-grid mt-5"><SimScenes c={c} /></div>}
            {tab === 'products' && (c.history ? <ProductsTab c={c} /> : <Empty title="No recorded activity">There is no recorded Product activity for these eight weeks.</Empty>)}
            {tab === 'products' && simulation && <div className="ins-grid mt-5"><SimProducts c={c} /></div>}
            {tab === 'reputation' && (c.history ? <ReputationTab c={c} /> : <ReputationEmpty c={c} />)}
            {tab === 'reputation' && simulation && <div className="ins-grid mt-5"><SimReputation c={c} /></div>}
          </>
        )}
      <p className="mt-5 text-xs text-text-muted">Who sees this view: {whoSees[tab]}. Every Insights view is read-only.</p>
      <div className="mt-3 rounded-xl bg-info-bg p-3 text-xs leading-relaxed text-info">Insights report observable outcomes only. Recommendation algorithms, ranking weights and internal eligibility calculations are not exposed.</div>
    </div>
  )
}

/** A suspended Seller with no MVP activity: the Trust level still exists, the rest is an honest empty state. */
function ReputationEmpty({ c }: { c: Ctx }) {
  const rep = (OPERATIONS.seller_reputation as unknown as { seller_id: string; mvp_trust: string; historical_trust_showcase: string }[]).find(x => x.seller_id === c.sellerId)!
  const trust = trustView(rep, c.lifecycle)
  return (
    <div className="grid gap-4">
      <Empty title="No recorded activity">There is no recorded response or follower activity for these eight weeks.</Empty>
      <Card data-reputation="trust" title="Trust level" subtitle="Set by Adulis from platform evidence. Read-only.">
        <div className="font-display text-3xl font-semibold" data-trust-level>{trust.mvp}</div>
        {trust.note && <p data-lifecycle-note className="mt-2 rounded-lg bg-warning-bg px-3 py-2 text-xs text-text-primary">{trust.note}</p>}
      </Card>
    </div>
  )
}

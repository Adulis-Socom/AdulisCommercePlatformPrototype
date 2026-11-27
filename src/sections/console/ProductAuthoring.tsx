import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { SearchInput, Textarea, TextInput } from '../../components/ui/Input'
import { ProductMediaEditor } from '../ProductMediaEditor'
import { PRODUCTS, fulfilmentOptionsAt, sellerProductsAt, type Moment, type ProductId, type SellerId } from '../../demo-data'
import { TAXONOMY, attributesFor, findTaxonomy, type TaxonomyAttribute } from '../../demo-data/taxonomy'
import { LOW_STOCK_AT, formatBirr, parseCount, parseMoney, productStock, publicationIssues, stockState, toThumbnail, useWorkspace, type Fulfilment, type WorkspaceState, type WsProduct, type WsVariant } from '../../seller-workspace'
import { Card, Check, Notice, Page, SelectField, Thumb, focusField } from './kit'

/** SC-002 / SC-003: Product authoring with drafts, category-driven attributes, options, Variants, stock and simulated publication. */

const FULFILMENT: Fulfilment[] = ['Buyer Collection', 'Seller Delivery', 'Courier Delivery']
const MAX_VARIANTS = 60
const MAX_OPTIONS = 3

function offered(state: WorkspaceState, seller: SellerId, at: Moment): Fulfilment[] {
  const setup = state.setup[seller]
  if (setup) return FULFILMENT.filter(mode => (mode === 'Buyer Collection' ? setup.collection.on : mode === 'Seller Delivery' ? setup.sellerDelivery.on : setup.courier))
  return fulfilmentOptionsAt(seller, at).map(option => option.mode as Fulfilment)
}

function blankProduct(id: string, seller: SellerId, state: WorkspaceState, at: Moment): WsProduct {
  return { id, seller, status: 'draft', name: '', description: '', category: null, attributes: {}, customAttributes: [], options: [], variants: [], price: '', stock: '', photos: [], fulfilment: offered(state, seller, at), locallyMade: false, updated: 0 }
}

function fromSeed(id: ProductId, seller: SellerId, state: WorkspaceState, at: Moment): WsProduct {
  const o = state.products[id]
  if (o) return o
  const seed = PRODUCTS[id]
  return { id, seller, seeded: true, status: 'published', name: seed.name, description: seed.description ?? '', category: null, attributes: {}, customAttributes: seed.attributes.map(a => ({ name: '', value: a })), options: [], variants: [], price: String(seed.price / 100), stock: String(seed.stock), photos: [], fulfilment: offered(state, seller, at), locallyMade: seed.locallyMade, updated: 0 }
}

/** Every combination of the options' values, keeping the price and stock already entered for a combination that still exists. */
function regenerate(options: WsProduct['options'], old: WsVariant[]): WsVariant[] {
  const usable = options.filter(o => o.name.trim() && o.values.length)
  if (!usable.length) return []
  let combos: string[][] = [[]]
  for (const option of usable) combos = combos.flatMap(c => option.values.map(v => [...c, v]))
  return combos.slice(0, MAX_VARIANTS).map(values => {
    const key = values.join('|'); const prior = old.find(v => v.key === key)
    return { key, label: values.join(' / '), price: prior?.price ?? '', stock: prior?.stock ?? '' }
  })
}

const comparable = (p: WsProduct) => JSON.stringify({ ...p, updated: 0 })

export default function ProductAuthoring({ sellerId, at }: { sellerId: SellerId; at: Moment }) {
  const [editing, setEditing] = useState<{ id: string | null } | null>(null)
  const [notice, setNotice] = useState('')
  if (editing) return <ProductEditor key={editing.id ?? 'new'} sellerId={sellerId} at={at} id={editing.id} onBack={message => { setEditing(null); if (typeof message === 'string') setNotice(message) }} />
  return <ProductList sellerId={sellerId} at={at} notice={notice} onOpen={id => { setNotice(''); setEditing({ id }) }} />
}

function ProductList({ sellerId, at, notice, onOpen }: { sellerId: SellerId; at: Moment; notice: string; onOpen: (id: string | null) => void }) {
  const { state } = useWorkspace()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'published' | 'draft' | 'out'>('all')
  const rows = useMemo(() => {
    const all = [
      ...sellerProductsAt(sellerId, at).map(id => fromSeed(id, sellerId, state, at)),
      ...Object.values(state.products).filter(p => p.seller === sellerId && !p.seeded),
    ]
    return all.map(p => {
      const stock = p.seeded && !state.products[p.id] ? PRODUCTS[p.id as ProductId].stock : productStock(p)
      const prices = p.variants.map(v => parseMoney(v.price || p.price)).filter((n): n is number => n !== null)
      const price = prices.length ? Math.min(...prices) : parseMoney(p.price)
      return { p, stock, price, state: stockState(stock) }
    }).filter(r => r.p.name.toLowerCase().includes(query.toLowerCase()) && (filter === 'all' || (filter === 'out' ? r.stock === 0 && r.p.status === 'published' : r.p.status === filter)))
  }, [state, sellerId, at, query, filter])
  return (
    <Page wide title="Products" subtitle="Create, edit and publish your Products. Publishing here is simulated: it changes this prototype session only." actions={<Button onClick={() => onOpen(null)}>Create Product</Button>}>
      {notice && <div className="mb-4"><Notice tone="success" role="status">{notice}</Notice></div>}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="w-80 max-w-full"><SearchInput value={query} onChange={event => setQuery(event.target.value)} onClear={() => setQuery('')} placeholder="Search Products" aria-label="Search Products" /></div>
        <div role="group" aria-label="Filter Products" className="flex gap-1">
          {([['all', 'All'], ['published', 'Published'], ['draft', 'Drafts'], ['out', 'Out of stock']] as const).map(([key, label]) => <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)} className={`min-h-9 rounded-full border px-3 text-xs font-semibold ${filter === key ? 'border-brand bg-brand-muted text-brand-dark' : 'border-border bg-surface text-text-secondary'}`}>{label}</button>)}
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <ul>
          {rows.map(({ p, stock, price, state: st }) => (
            <li key={p.id} className="border-t border-border first:border-t-0">
              <button type="button" onClick={() => onOpen(p.id)} className="flex w-full items-center gap-4 p-4 text-left hover:bg-surface-raised">
                <Thumb src={p.photos[0]} label={p.name || 'Untitled'} className="h-14 w-14" />
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-text-primary">{p.name || 'Untitled Product'}</span><span className="block font-mono text-[10px] text-text-muted">{p.id}{p.variants.length ? ` · ${p.variants.length} Variants` : ''}</span></span>
                <span className="w-28 text-right text-sm font-semibold max-sm:hidden">{price !== null ? formatBirr(price) : 'No price'}</span>
                <span className={`w-28 text-right text-xs font-semibold max-sm:hidden ${st === 'Available' ? 'text-text-secondary' : 'text-warning'}`}>{st === 'Out of Stock' ? 'Out of stock' : `${stock} available`}{st === 'Low Stock' ? ' · low' : ''}</span>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${p.status === 'published' ? 'bg-success-bg text-text-primary' : 'bg-surface-raised text-text-muted'}`}>{p.status === 'published' ? 'Published' : 'Draft'}</span>
              </button>
            </li>
          ))}
        </ul>
        {rows.length === 0 && <div className="p-10 text-center"><div className="font-display text-lg font-semibold">{query || filter !== 'all' ? 'No Products match' : 'No Products yet'}</div><p className="mt-1 text-sm text-text-muted">{query || filter !== 'all' ? 'Try a different search or filter.' : 'Create your first Product to start your catalogue.'}</p>{!query && filter === 'all' && <Button onClick={() => onOpen(null)} style={{ marginTop: 16 }}>Create Product</Button>}</div>}
      </div>
    </Page>
  )
}

function ProductEditor({ sellerId, at, id, onBack }: { sellerId: SellerId; at: Moment; id: string | null; onBack: (message?: string) => void }) {
  const { state, dispatch, next } = useWorkspace()
  const initial = useMemo(() => {
    if (!id) return blankProduct('', sellerId, state, at)
    if (id in PRODUCTS) return fromSeed(id as ProductId, sellerId, state, at)
    return state.products[id] ?? blankProduct('', sellerId, state, at)
  }, [])
  const [p, setP] = useState<WsProduct>(initial)
  const baseline = useRef(comparable(initial))
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [banner, setBanner] = useState('')
  const [preview, setPreview] = useState(false)
  const [confirm, setConfirm] = useState<'discard' | 'delete' | null>(null)
  const [defs, setDefs] = useState<readonly TaxonomyAttribute[] | null | 'loading'>(null)
  const summary = useRef<HTMLDivElement>(null)
  const photoRun = useRef(0)
  const noCover = useCallback(() => {}, [])
  const savedPhotos = useRef(initial.photos).current
  const set = (patch: Partial<WsProduct>) => setP(prev => ({ ...prev, ...patch }))
  const dirty = comparable(p) !== baseline.current
  const err = (field: string) => errors.find(e => e.field === field)?.message

  const taxonomy = findTaxonomy(p.category)
  useEffect(() => {
    if (!taxonomy?.sub?.attributes || !p.category) { setDefs(null); return }
    let live = true; setDefs('loading')
    attributesFor(p.category).then(list => { if (live) setDefs(list) })
    return () => { live = false }
  }, [p.category])

  const onPhotos = useCallback(async (items: { blob: Blob; src?: string }[]) => {
    const run = ++photoRun.current
    const urls = await Promise.all(items.map(item => item.src ?? toThumbnail(item.blob)))
    if (run === photoRun.current) setP(prev => ({ ...prev, photos: urls }))
  }, [])

  const stock = productStock(p)
  const live = stockState(stock)
  const issues = publicationIssues(p)

  const persist = (status: WsProduct['status'], message: string) => {
    const saved: WsProduct = { ...p, id: p.id || next('product'), status, updated: Date.now() }
    dispatch({ type: 'product', item: saved })
    setP(saved); baseline.current = comparable(saved); setErrors([]); setBanner(message)
  }
  const saveDraft = () => {
    if (p.name.trim().length < 2) { setErrors([{ field: 'name', message: 'Add a Product name to save a draft.' }]); focusField('name'); return }
    persist('draft', 'Draft saved. Nothing is visible to Buyers.')
  }
  const publish = () => {
    if (issues.length) { setErrors(issues); setBanner(''); requestAnimationFrame(() => summary.current?.focus()); return }
    persist('published', p.status === 'published' ? 'Changes saved.' : 'Published (simulated). This Product can now be tagged in Scenes and linked from Stories.')
  }
  const back = () => { if (dirty) setConfirm('discard'); else onBack() }

  const setOptions = (options: WsProduct['options']) => set({ options, variants: regenerate(options, p.variants) })
  const setVariant = (key: string, patch: Partial<WsVariant>) => set({ variants: p.variants.map(v => (v.key === key ? { ...v, ...patch } : v)) })
  const category = taxonomy?.category
  const majorId = p.category?.split('/')[0] ?? ''
  const gapNote = taxonomy && taxonomy.category && !taxonomy.category.subcategories.length
    ? (taxonomy.category.hasSubcategoryList ? '' : `No subcategories or attribute definitions have been submitted for ${taxonomy.category.name} yet. You can publish with the generic fields below; the taxonomy gap is registered for review.`)
    : ''
  const noAttrs = taxonomy?.sub && !taxonomy.sub.attributes

  return (
    <Page wide title={p.seeded ? 'Edit Product' : id ? 'Edit Product' : 'Create Product'} subtitle={`${p.id || 'New Product'} · ${p.status === 'published' ? 'Published' : 'Draft'}${p.seeded ? ' · demonstration Product' : ''}`}
      actions={<><Button variant="tertiary" onClick={back}>← Back to Products</Button><Button variant="tertiary" onClick={() => setPreview(v => !v)} aria-pressed={preview}>{preview ? 'Close preview' : 'Preview'}</Button></>}>
      {confirm === 'discard' && <div className="mb-4"><Notice tone="warning" role="alert" title="Leave without saving?"><div className="mt-2 flex gap-2"><Button size="sm" onClick={() => onBack()}>Discard changes</Button><Button size="sm" variant="tertiary" onClick={() => setConfirm(null)}>Keep editing</Button></div></Notice></div>}
      {confirm === 'delete' && <div className="mb-4"><Notice tone="danger" role="alert" title="Delete this draft?"><p>It disappears from this session. Published Products are never deleted here.</p><div className="mt-2 flex gap-2"><Button size="sm" onClick={() => { dispatch({ type: 'remove', collection: 'products', id: p.id }); onBack('Draft deleted.') }}>Delete draft</Button><Button size="sm" variant="tertiary" onClick={() => setConfirm(null)}>Cancel</Button></div></Notice></div>}
      {banner && <div className="mb-4"><Notice tone="success" role="status">{banner}</Notice></div>}
      {errors.length > 0 && (
        <div ref={summary} tabIndex={-1} role="alert" className="mb-4 rounded-xl border border-danger bg-danger-bg p-4 text-sm outline-none">
          <div className="font-semibold">{errors.length === 1 ? '1 thing to fix before publishing' : `${errors.length} things to fix before publishing`}</div>
          <ul className="mt-1 list-disc pl-5">{errors.map((e, i) => <li key={i}><button type="button" onClick={() => focusField(e.field.startsWith('variant:') ? 'variants' : e.field)} className="text-left underline">{e.message}</button></li>)}</ul>
        </div>
      )}
      <div className={`grid gap-5 ${preview ? 'grid-cols-[1.3fr_.7fr] max-lg:grid-cols-1' : 'grid-cols-1'}`}>
        <div className="flex flex-col gap-5">
          <Card step="01" title="Photos" hint="JPEG, PNG or WebP. Photos stay in this session as small previews; nothing is uploaded.">
            <div id="pf-photos" tabIndex={-1}>
              <ProductMediaEditor key="media" placeholders={p.seeded && !savedPhotos.length ? 3 : 0} saved={savedPhotos} onCover={noCover} onPhotos={onPhotos} />
            </div>
            {err('photos') && <p className="mt-1 text-xs text-danger">{err('photos')}</p>}
          </Card>
          <Card step="02" title="Core information">
            <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
              <div className="col-span-2 max-sm:col-span-1"><TextInput id="pf-name" label="Product name" value={p.name} error={err('name')} onChange={event => set({ name: event.target.value })} placeholder="e.g. Habesha Kemis" maxLength={80} /></div>
              <div className="col-span-2 max-sm:col-span-1"><Textarea id="pf-description" label="Description" value={p.description} onChange={event => set({ description: event.target.value })} rows={4} maxLength={1000} hint={`${p.description.length} / 1000. Describe only what is true of this Product.`} placeholder="Describe this Product" /></div>
              <SelectField id="pf-category" label="Category" value={majorId} placeholder="Choose a category" error={err('category')} onChange={v => set({ category: v || null, attributes: {} })} options={TAXONOMY.map(m => ({ value: m.id, label: m.name }))} />
              {majorId && <SelectField label="Subcategory" value={category?.id ?? ''} placeholder="Choose" onChange={v => set({ category: v || majorId, attributes: {} })} options={(TAXONOMY.find(m => m.id === majorId)?.categories ?? []).map(c => ({ value: c.id, label: c.name }))} />}
              {category && category.subcategories.length > 0 && <SelectField label="Type" value={taxonomy?.sub?.id ?? ''} placeholder="Choose a type" onChange={v => set({ category: v || category.id, attributes: {} })} options={category.subcategories.map(s => ({ value: s.id, label: s.name }))} />}
            </div>
            {gapNote && <div className="mt-3"><Notice tone="warning" title="Taxonomy incomplete for this category">{gapNote}</Notice></div>}
            <div className="mt-3"><Check label="Locally made in Ethiopia" checked={p.locallyMade} onChange={on => set({ locallyMade: on })} detail="Shown to Buyers only when you set it yourself." /></div>
          </Card>
          <Card step="03" title="Attributes" hint="Attributes depend on the category. The submitted taxonomy does not say which are required.">
            {defs === 'loading' && <p role="status" className="text-sm text-text-muted">Loading attributes…</p>}
            {Array.isArray(defs) && (
              <div className="grid grid-cols-3 gap-4 max-lg:grid-cols-2 max-sm:grid-cols-1">
                {(defs as readonly TaxonomyAttribute[]).map(def => <SelectField key={def.name} label={def.name} value={p.attributes[def.name] ?? ''} placeholder="Not set" onChange={v => set({ attributes: { ...p.attributes, [def.name]: v } })} options={def.values.map(v => ({ value: v, label: v }))} />)}
              </div>
            )}
            {(!p.category || !taxonomy?.category) && <p className="text-sm text-text-muted">Choose a category to see its attributes.</p>}
            {(noAttrs || (taxonomy?.category && !taxonomy.sub && !taxonomy.category.subcategories.length)) && <Notice tone="warning" title="No attribute definitions yet">Nothing has been submitted for this category, so use the generic details below.</Notice>}
            {(noAttrs || (taxonomy?.category && !category?.subcategories.length) || (!taxonomy?.category && p.seeded)) && (
              <div className="mt-3 flex flex-col gap-2">
                {p.customAttributes.map((a, i) => (
                  <div key={i} className="flex gap-2">
                    <TextInput aria-label={`Detail ${i + 1} name`} value={a.name} placeholder="e.g. Material" onChange={event => set({ customAttributes: p.customAttributes.map((x, j) => (j === i ? { ...x, name: event.target.value } : x)) })} />
                    <TextInput aria-label={`Detail ${i + 1} value`} value={a.value} placeholder="e.g. Cotton" onChange={event => set({ customAttributes: p.customAttributes.map((x, j) => (j === i ? { ...x, value: event.target.value } : x)) })} />
                    <Button variant="tertiary" size="sm" aria-label={`Remove detail ${i + 1}`} onClick={() => set({ customAttributes: p.customAttributes.filter((_, j) => j !== i) })}>×</Button>
                  </div>
                ))}
                <div><Button variant="secondary" size="sm" onClick={() => set({ customAttributes: [...p.customAttributes, { name: '', value: '' }] })}>Add a detail</Button></div>
              </div>
            )}
          </Card>
          <Card step="04" title="Options and Variants" hint="Add options such as Size or Colour. Each combination becomes a Variant with its own stock and optional price.">
            <div id="pf-variants" tabIndex={-1} className="flex flex-col gap-4">
              {p.seeded && <Notice>This demonstration Product keeps its existing options; its stock is managed as one figure below.</Notice>}
              {!p.seeded && p.options.map((option, i) => <OptionRow key={i} option={option} index={i} onChange={o => setOptions(p.options.map((x, j) => (j === i ? o : x)))} onRemove={() => setOptions(p.options.filter((_, j) => j !== i))} />)}
              {!p.seeded && p.options.length < MAX_OPTIONS && <div><Button variant="secondary" size="sm" onClick={() => set({ options: [...p.options, { name: '', values: [] }] })}>Add an option</Button></div>}
              {p.variants.length > 0 && (
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-surface-raised text-[10px] uppercase tracking-wider text-text-muted"><tr><th className="p-3">Variant</th><th className="p-3">Price (ETB)</th><th className="p-3">Stock</th><th className="p-3">Availability</th></tr></thead>
                    <tbody>{p.variants.map(v => {
                      const n = parseCount(v.stock)
                      return <tr key={v.key} className="border-t border-border">
                        <td className="p-3 font-semibold">{v.label}</td>
                        <td className="p-2"><TextInput aria-label={`${v.label} price`} value={v.price} placeholder={p.price ? `Base ${p.price}` : 'Base price'} inputMode="decimal" onChange={event => setVariant(v.key, { price: event.target.value })} /></td>
                        <td className="p-2"><TextInput aria-label={`${v.label} stock`} value={v.stock} placeholder="0" inputMode="numeric" error={v.stock !== '' && n === null ? 'Whole number' : undefined} onChange={event => setVariant(v.key, { stock: event.target.value })} /></td>
                        <td className="p-3 text-xs">{n === null ? '—' : stockState(n)}</td>
                      </tr>
                    })}</tbody>
                  </table>
                </div>
              )}
              {p.options.filter(o => o.name.trim() && o.values.length).reduce((n, o) => n * o.values.length, 1) > MAX_VARIANTS && <Notice tone="warning" role="alert">Only the first {MAX_VARIANTS} combinations are kept. Remove a value to keep them all.</Notice>}
            </div>
          </Card>
          <Card step="05" title="Price and inventory">
            <div className="grid grid-cols-3 gap-4 max-sm:grid-cols-1">
              <TextInput id="pf-price" label={p.variants.length ? 'Base price (ETB)' : 'Price (ETB)'} value={p.price} error={err('price')} inputMode="decimal" onChange={event => set({ price: event.target.value })} placeholder="e.g. 2450" hint="Whole or two-decimal birr." />
              {p.variants.length === 0
                ? <TextInput id="pf-stock" label="Available quantity" value={p.stock} error={err('stock')} inputMode="numeric" onChange={event => set({ stock: event.target.value })} placeholder="0" hint="0 means out of stock." />
                : <div><div className="mb-1 text-xs font-semibold text-text-secondary">Total stock</div><div className="flex h-11 items-center text-sm font-semibold">{stock}</div></div>}
              <div><div className="mb-1 text-xs font-semibold text-text-secondary">Availability</div><div className={`flex h-11 items-center text-sm font-semibold ${live === 'Available' ? 'text-success' : 'text-warning'}`}>{live}</div></div>
            </div>
            {live !== 'Available' && <div className="mt-3"><Notice tone="warning">{live === 'Out of Stock' ? 'Out of stock: this Product stays viewable but can’t be newly tagged in a Scene or linked from a Story. A Scene whose tagged Products are all unavailable becomes Private until one is back in stock.' : `Low stock (${LOW_STOCK_AT} or fewer). This threshold is a prototype default.`}</Notice></div>}
          </Card>
          <Card step="06" title="Fulfilment" hint="Methods you offer for this Product. Courier Delivery needs an approved Courier.">
            <div id="pf-fulfilment" tabIndex={-1} className="grid grid-cols-3 gap-3 max-sm:grid-cols-1">
              {FULFILMENT.map(mode => <Check key={mode} label={mode} checked={p.fulfilment.includes(mode)} onChange={on => set({ fulfilment: on ? [...p.fulfilment, mode] : p.fulfilment.filter(m => m !== mode) })} />)}
            </div>
            {err('fulfilment') && <p className="mt-1 text-xs text-danger">{err('fulfilment')}</p>}
          </Card>
          <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center gap-2 border-t border-border bg-background/95 px-1 py-3 backdrop-blur">
            {p.status === 'draft' && <><Button variant="secondary" onClick={saveDraft}>Save draft</Button><Button onClick={publish}>Publish Product</Button></>}
            {p.status === 'published' && <><Button onClick={publish} disabled={!dirty}>Save changes</Button><Button variant="tertiary" onClick={() => persist('draft', 'Returned to draft. Buyers no longer see this Product.')}>Return to draft</Button></>}
            {!p.seeded && p.id && p.status === 'draft' && <Button variant="tertiary" onClick={() => setConfirm('delete')}>Delete draft</Button>}
            <span className="text-xs text-text-muted" role="status">{dirty ? 'Unsaved changes' : p.id ? 'All changes saved' : ''}</span>
          </div>
        </div>
        {preview && <ProductPreview p={p} stock={stock} />}
      </div>
    </Page>
  )
}

function OptionRow({ option, index, onChange, onRemove }: { option: { name: string; values: string[] }; index: number; onChange: (o: { name: string; values: string[] }) => void; onRemove: () => void }) {
  const [draft, setDraft] = useState('')
  const add = () => {
    const value = draft.trim()
    if (!value || option.values.some(v => v.toLowerCase() === value.toLowerCase())) { setDraft(''); return }
    onChange({ ...option, values: [...option.values, value] }); setDraft('')
  }
  return (
    <div className="rounded-xl border border-border p-3">
      <div className="flex items-end gap-2">
        <div className="w-48"><TextInput label={`Option ${index + 1} name`} value={option.name} placeholder="e.g. Size" maxLength={30} onChange={event => onChange({ ...option, name: event.target.value })} /></div>
        <div className="flex-1"><TextInput label="Add a value" value={draft} placeholder="e.g. Medium, then Enter" maxLength={30} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); add() } }} /></div>
        <Button variant="secondary" size="sm" onClick={add}>Add</Button>
        <Button variant="tertiary" size="sm" aria-label={`Remove option ${index + 1}`} onClick={onRemove}>×</Button>
      </div>
      <ul className="mt-2 flex flex-wrap gap-1.5">{option.values.map(v => <li key={v}><button type="button" aria-label={`Remove ${v}`} onClick={() => onChange({ ...option, values: option.values.filter(x => x !== v) })} className="min-h-8 rounded-full bg-brand-muted px-3 text-xs font-semibold text-brand-dark">{v} ×</button></li>)}</ul>
    </div>
  )
}

function ProductPreview({ p, stock }: { p: WsProduct; stock: number }) {
  const prices = p.variants.map(v => parseMoney(v.price || p.price)).filter((n): n is number => n !== null)
  const price = prices.length ? Math.min(...prices) : parseMoney(p.price)
  const label = findTaxonomy(p.category)?.label
  return (
    <aside aria-label="Product preview" className="h-fit rounded-2xl border border-border bg-surface p-4 lg:sticky lg:top-4">
      <div className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-text-muted">Buyer preview · simulated</div>
      <div className="overflow-hidden rounded-xl bg-surface-raised">{p.photos[0] ? <img src={p.photos[0]} alt={p.name ? `Preview of ${p.name}` : 'Product photo preview'} className="aspect-square w-full object-cover" /> : <div className="flex aspect-square items-center justify-center bg-gradient-to-br from-brand-muted to-warning-bg text-xs text-text-muted">No photo yet</div>}</div>
      {p.photos.length > 1 && <div className="mt-2 flex gap-1.5">{p.photos.slice(1).map((src, i) => <img key={i} src={src} alt="" className="h-12 w-12 rounded-lg object-cover" />)}</div>}
      <h3 className="mt-3 font-display text-xl font-semibold">{p.name || 'Untitled Product'}</h3>
      <div className="text-sm text-text-muted">{label ?? 'No category yet'}</div>
      <div className="mt-2 text-lg font-bold">{price !== null ? `${p.variants.length && prices.length > 1 ? 'From ' : ''}${formatBirr(price)}` : 'Price not set'}</div>
      <div className={`text-xs font-semibold ${stockState(stock) === 'Available' ? 'text-success' : 'text-warning'}`}>{stockState(stock)}</div>
      {p.options.filter(o => o.values.length).map(o => <div key={o.name} className="mt-2 text-xs"><span className="font-semibold">{o.name || 'Option'}:</span> {o.values.join(', ')}</div>)}
      {p.description && <p className="mt-3 text-sm leading-relaxed text-text-secondary">{p.description}</p>}
      {Object.entries(p.attributes).filter(([, v]) => v).length > 0 && <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">{Object.entries(p.attributes).filter(([, v]) => v).map(([k, v]) => <div key={k} className="contents"><dt className="text-text-muted">{k}</dt><dd className="font-semibold">{v}</dd></div>)}</dl>}
      <div className="mt-3 text-[11px] text-text-muted">{p.fulfilment.join(' · ') || 'No fulfilment chosen'}</div>
    </aside>
  )
}

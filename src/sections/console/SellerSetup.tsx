import { useMemo, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Textarea, TextInput } from '../../components/ui/Input'
import { SELLERS, type Moment, type SellerId } from '../../demo-data'
import { COVERAGE_AREAS, blankSetup, defaultSetup, linkableProducts, readiness, useWorkspace, type WsSetup } from '../../seller-workspace'
import { Card, Check, Notice, Page } from './kit'

/** SC-001: Seller onboarding and readiness. Store profile, Seller information, service coverage, fulfilment, catalogue readiness. */
export default function SellerSetup({ sellerId, at, onNavigate }: { sellerId: SellerId; at: Moment; onNavigate: (key: 'products') => void }) {
  const { state, dispatch } = useWorkspace()
  const saved = state.setup[sellerId] ?? defaultSetup(sellerId)
  const [form, setForm] = useState<WsSetup>(saved)
  const [attempted, setAttempted] = useState(false)
  const [banner, setBanner] = useState('')
  const published = useMemo(() => linkableProducts(state, sellerId, at, true).length, [state, sellerId, at])
  const items = readiness(form, published)
  const savedItems = readiness(saved, published)
  const ready = savedItems.every(i => i.done)
  const set = (patch: Partial<WsSetup>) => setForm(prev => ({ ...prev, ...patch }))
  const problems = (key: string) => (attempted ? items.find(i => i.key === key)?.problems ?? [] : [])
  const dirty = JSON.stringify(form) !== JSON.stringify(saved)
  const done = savedItems.filter(i => i.done).length

  const save = () => {
    setAttempted(true)
    dispatch({ type: 'setup', seller: sellerId, setup: { ...form, blank: false } })
    const remaining = items.filter(i => !i.done)
    setBanner(remaining.length ? `Saved. ${remaining.length} of ${items.length} items still need attention.` : 'Saved. Your store is ready to publish.')
  }
  const reset = (setup: WsSetup, message: string) => { setForm(setup); dispatch({ type: 'setup', seller: sellerId, setup }); setAttempted(false); setBanner(message) }
  const jump = (key: string) => { const el = document.getElementById(`setup-${key}`); el?.scrollIntoView({ block: 'start' }); el?.focus() }
  const err = (key: string) => problems(key).length > 0 && <ul className="mt-2 list-disc pl-5 text-xs text-danger" role="alert">{problems(key).map(p => <li key={p}>{p}</li>)}</ul>

  return (
    <Page title="Store setup" subtitle={`${SELLERS[sellerId].name} · Market: Ethiopia. Finish these steps before your storefront and Stories can be published.`}
      actions={<><Button variant="tertiary" onClick={() => reset(blankSetup(), 'Started from a blank store (demonstration).')}>Start from a blank store</Button><Button variant="tertiary" onClick={() => reset(defaultSetup(sellerId), 'Restored the sample details.')}>Use sample details</Button></>}>
      {banner && <div className="mb-4"><Notice tone="success" role="status">{banner}</Notice></div>}
      <section aria-label="Readiness" className="mb-6 rounded-2xl border border-brand/20 bg-brand-muted p-5">
        <div className="flex items-center justify-between gap-4">
          <div><div className="text-xs font-semibold uppercase tracking-wider text-brand-dark">Publication readiness</div><div className="mt-1 font-display text-2xl font-semibold">{done} of {savedItems.length} steps complete</div><p className="mt-1 text-xs text-text-secondary">{ready ? 'Everything required is in place. Your storefront can be published (simulated).' : 'Based on your saved details. Fix the steps below, then save.'}</p></div>
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface font-mono text-sm font-bold text-brand-text" aria-label={`${Math.round((done / savedItems.length) * 100)} percent complete`}>{Math.round((done / savedItems.length) * 100)}%</div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface"><div className="h-full rounded-full bg-brand" style={{ width: `${(done / savedItems.length) * 100}%` }} /></div>
        <ul className="mt-4 grid grid-cols-5 gap-2 max-lg:grid-cols-2 max-sm:grid-cols-1">
          {savedItems.map(item => (
            <li key={item.key}>
              <button type="button" onClick={() => (item.key === 'catalogue' ? onNavigate('products') : jump(item.key))} className="flex min-h-14 w-full flex-col items-start rounded-xl border border-border bg-surface p-3 text-left">
                <span className={`text-[11px] font-semibold ${item.done ? 'text-success' : 'text-warning'}`}>{item.done ? '✓ Complete' : 'Needs attention'}</span>
                <span className="text-sm font-semibold text-text-primary">{item.title}</span>
                {!item.done && <span className="text-[11px] text-text-muted">{item.problems[0]}</span>}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <div className="flex flex-col gap-5">
        <Card step="01" title="Store profile" hint="What Buyers see on your public storefront.">
          <div id="setup-profile" tabIndex={-1} className="grid grid-cols-2 gap-4 outline-none max-sm:grid-cols-1">
            <TextInput label="Store name" value={form.storeName} onChange={e => set({ storeName: e.target.value })} maxLength={60} />
            <TextInput label="Handle" value={form.handle} onChange={e => set({ handle: e.target.value })} placeholder="@yourstore" hint="3 to 30 letters, numbers, dots or underscores." maxLength={31} />
            <div className="col-span-2 max-sm:col-span-1"><Textarea label="About your store" value={form.about} onChange={e => set({ about: e.target.value })} rows={3} maxLength={400} hint={`${form.about.length} / 400. At least 20 characters.`} /></div>
          </div>
          {err('profile')}
        </Card>
        <Card step="02" title="Seller information" hint="Used by Adulis to contact you. Adulis does not ask for a government ID here.">
          <div id="setup-seller" tabIndex={-1} className="grid grid-cols-2 gap-4 outline-none max-sm:grid-cols-1">
            <TextInput label="Owner name" value={form.ownerName} onChange={e => set({ ownerName: e.target.value })} maxLength={60} />
            <TextInput label="Mobile number" value={form.contactPhone} onChange={e => set({ contactPhone: e.target.value })} placeholder="0912 345 678" inputMode="tel" hint="Ethiopian mobile number." />
          </div>
          {err('seller')}
        </Card>
        <Card step="03" title="Service coverage" hint="Ethiopia is the active Market. Choose where you actually serve: Adulis does not promise courier service to every address.">
          <div id="setup-coverage" tabIndex={-1} className="grid grid-cols-3 gap-3 outline-none max-lg:grid-cols-2 max-sm:grid-cols-1">
            {COVERAGE_AREAS.map(area => <Check key={area} label={area} checked={form.coverage.includes(area)} onChange={on => set({ coverage: on ? [...form.coverage, area] : form.coverage.filter(a => a !== area) })} />)}
          </div>
          {err('coverage')}
        </Card>
        <Card step="04" title="Fulfilment" hint="How Buyers can receive what they order once ordering opens. Payment setup is not needed to publish your store in this release.">
          <div id="setup-fulfilment" tabIndex={-1} className="flex flex-col gap-3 outline-none">
            <Check label="Buyer Collection" checked={form.collection.on} onChange={on => set({ collection: { ...form.collection, on } })} />
            {form.collection.on && <div className="ml-7 max-w-md"><TextInput label="Collection place" value={form.collection.place} onChange={e => set({ collection: { ...form.collection, place: e.target.value } })} placeholder="e.g. Bole studio, near Edna Mall" /></div>}
            <Check label="Seller Delivery" checked={form.sellerDelivery.on} onChange={on => set({ sellerDelivery: { ...form.sellerDelivery, on } })} />
            {form.sellerDelivery.on && <div className="ml-7 max-w-xs"><TextInput label="Delivery charge (ETB)" value={form.sellerDelivery.fee} onChange={e => set({ sellerDelivery: { ...form.sellerDelivery, fee: e.target.value } })} inputMode="decimal" hint="0 for free delivery." /></div>}
            <Check label="Courier Delivery" checked={form.courier} onChange={on => set({ courier: on })} detail="Needs at least one approved Courier. Manage Couriers in the Couriers section." />
          </div>
          {err('fulfilment')}
        </Card>
        <Card step="05" title="Catalogue" hint="Your storefront needs at least one published Product.">
          <div id="setup-catalogue" tabIndex={-1} className="flex items-center justify-between gap-4 outline-none">
            <p className="text-sm">{published > 0 ? `${published} published Product${published === 1 ? '' : 's'}.` : 'No published Products yet.'}</p>
            <Button variant="secondary" onClick={() => onNavigate('products')}>{published > 0 ? 'Manage Products' : 'Add your first Product'}</Button>
          </div>
          {err('catalogue')}
        </Card>
        <div className="sticky bottom-0 z-10 flex items-center gap-3 border-t border-border bg-background/95 py-3 backdrop-blur">
          <Button onClick={save}>Save setup</Button>
          <span role="status" className="text-xs text-text-muted">{dirty ? 'Unsaved changes' : 'All changes saved'}</span>
        </div>
      </div>
    </Page>
  )
}

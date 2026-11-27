import { useId, type ReactNode } from 'react'

/** Small presentational pieces shared by the Seller Console authoring screens (Setup, Products, Scenes, Stories). */

export function Page({ title, subtitle, actions, children, wide }: { title: string; subtitle?: string; actions?: ReactNode; children: ReactNode; wide?: boolean }) {
  return (
    <div className={`mx-auto ${wide ? 'max-w-7xl' : 'max-w-5xl'} p-8 max-sm:p-4`}>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="font-display text-3xl font-semibold text-text-primary">{title}</h1>{subtitle && <p className="mt-1 max-w-2xl text-sm text-text-muted">{subtitle}</p>}</div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  )
}

export function Card({ step, title, hint, children }: { step?: string; title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5 max-sm:p-4">
      <div className="mb-4 flex items-start gap-3">
        {step && <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-brand-muted font-mono text-[11px] font-bold text-brand-dark">{step}</span>}
        <div><h2 className="font-display text-lg font-semibold text-text-primary">{title}</h2>{hint && <p className="mt-0.5 text-xs text-text-muted">{hint}</p>}</div>
      </div>
      {children}
    </section>
  )
}

/** A native select with a visible label and an error line; the control keeps the console's input styling. */
export function SelectField({ label, value, onChange, options, placeholder, error, id, disabled }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; placeholder?: string; error?: string; id?: string; disabled?: boolean }) {
  const auto = useId(); const sid = id ?? auto
  return (
    <div>
      <label htmlFor={sid} className="mb-1 block text-xs font-semibold text-text-secondary">{label}</label>
      <select id={sid} value={value} disabled={disabled} onChange={event => onChange(event.target.value)} aria-invalid={!!error} aria-describedby={error ? `${sid}-err` : undefined} className={`block h-11 w-full rounded-lg border bg-surface px-3 text-sm text-text-primary disabled:opacity-60 ${error ? 'border-danger' : 'border-border'}`}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      {error && <p id={`${sid}-err`} className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  )
}

export function Check({ label, checked, onChange, detail, disabled }: { label: string; checked: boolean; onChange: (on: boolean) => void; detail?: string; disabled?: boolean }) {
  return (
    <label className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border p-3 ${checked ? 'border-brand bg-brand-muted' : 'border-border bg-surface'} ${disabled ? 'opacity-60' : ''}`}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={event => onChange(event.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--color-brand)]" />
      <span><span className="block text-sm font-semibold text-text-primary">{label}</span>{detail && <span className="block text-xs text-text-muted">{detail}</span>}</span>
    </label>
  )
}

export function Notice({ tone = 'info', title, children, role }: { tone?: 'info' | 'warning' | 'success' | 'danger'; title?: string; children?: ReactNode; role?: 'alert' | 'status' }) {
  const cls = { info: 'bg-info-bg text-info', warning: 'bg-warning-bg text-text-primary', success: 'bg-success-bg text-text-primary', danger: 'bg-danger-bg text-text-primary' }[tone]
  return <div role={role} className={`rounded-xl p-3 text-xs leading-relaxed ${cls}`}>{title && <div className="mb-0.5 text-sm font-semibold">{title}</div>}{children}</div>
}

export function Thumb({ src, label, className = 'h-12 w-12' }: { src?: string | null; label: string; className?: string }) {
  return src
    ? <img src={src} alt="" className={`${className} flex-shrink-0 rounded-lg border border-border object-cover`} />
    : <span role="img" aria-label={`${label}: no photo`} className={`${className} flex-shrink-0 rounded-lg bg-gradient-to-br from-brand-muted to-warning-bg`} />
}

export const focusField = (field: string) => { const el = document.getElementById(`pf-${field}`); if (el) { el.scrollIntoView({ block: 'center' }); (el as HTMLElement).focus() } }

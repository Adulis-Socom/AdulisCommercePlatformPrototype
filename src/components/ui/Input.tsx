import { type InputHTMLAttributes, type TextareaHTMLAttributes, type ReactNode, useId, useState, useRef } from 'react'

/* ═══════════════════════════════════════════════
   INPUT COMPONENTS — All Adulis input types
═══════════════════════════════════════════════ */

export type InputState = 'default' | 'focused' | 'filled' | 'error' | 'disabled' | 'readonly'

interface BaseInputProps {
  label?: string
  hint?: string
  error?: string
  prefix?: ReactNode
  suffix?: ReactNode
  state?: InputState
}

function FieldWrapper({ label, hint, error, children, required, inputId, helperId }: {
  label?: string; hint?: string; error?: string; children: ReactNode; required?: boolean; inputId?: string; helperId?: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <label htmlFor={inputId} style={{
          fontFamily: 'var(--font-body)',
          fontSize: 12,
          fontWeight: 600,
          color: error ? 'var(--color-danger)' : 'var(--color-text-secondary)',
          display: 'flex', gap: 4, alignItems: 'center',
        }}>
          {label}
          {required && <span style={{ color: 'var(--color-danger)' }}>*</span>}
        </label>
      )}
      {children}
      {(hint || error) && (
        <div id={helperId} role={error ? 'alert' : undefined} style={{
          fontSize: 11,
          color: error ? 'var(--color-danger)' : 'var(--color-text-muted)',
          fontFamily: 'var(--font-body)',
          display: 'flex', gap: 4, alignItems: 'center',
        }}>
          {error && <span aria-hidden="true">!</span>}
          {error ? `Error: ${error}` : hint}
        </div>
      )}
    </div>
  )
}

function inputStyle(focused: boolean, error?: string, disabled?: boolean, readonly?: boolean): React.CSSProperties {
  return {
    width: '100%',
    height: 44,
    paddingLeft: 14,
    paddingRight: 14,
    fontFamily: 'var(--font-body)',
    fontSize: 15,
    color: disabled ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
    background: disabled ? 'var(--color-surface-raised)' : readonly ? 'var(--color-surface-raised)' : 'var(--color-surface)',
    border: `1.5px solid ${
      error ? 'var(--color-danger)' :
      focused ? 'var(--color-brand)' :
      'var(--color-border)'
    }`,
    borderRadius: 'var(--radius-md)',
    outline: 'none',
    boxShadow: focused && !error ? `0 0 0 3px ${error ? 'var(--color-danger)' : 'var(--color-brand)'}20` : 'none',
    transition: 'border-color 0.12s, box-shadow 0.12s',
    cursor: disabled ? 'not-allowed' : readonly ? 'default' : 'text',
    appearance: 'none' as const,
  }
}

/* ── Text Input ── */
interface TextInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix' | 'suffix'>, BaseInputProps {
  type?: 'text' | 'email' | 'password' | 'url'
}

export function TextInput({ label, hint, error, prefix, suffix, state, className, style, ...rest }: TextInputProps) {
  const [focused, setFocused] = useState(false)
  const generatedId = useId()
  const inputId = rest.id ?? generatedId
  const helperId = `${inputId}-help`
  const isDisabled = state === 'disabled' || rest.disabled
  const isReadonly = state === 'readonly' || rest.readOnly

  return (
    <FieldWrapper label={label} hint={hint} error={error} inputId={inputId} helperId={(hint || error) ? helperId : undefined}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {prefix && (
          <div style={{ position: 'absolute', left: 12, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', pointerEvents: 'none', zIndex: 1 }}>
            {prefix}
          </div>
        )}
        <input
          {...rest}
          id={inputId}
          disabled={isDisabled}
          readOnly={isReadonly}
          aria-invalid={Boolean(error)}
          aria-describedby={(hint || error) ? helperId : rest['aria-describedby']}
          onFocus={e => { setFocused(true); rest.onFocus?.(e) }}
          onBlur={e => { setFocused(false); rest.onBlur?.(e) }}
          style={{
            ...inputStyle(focused, error, isDisabled, isReadonly),
            paddingLeft: prefix ? 40 : 14,
            paddingRight: suffix ? 40 : 14,
          }}
        />
        {suffix && (
          <div style={{ position: 'absolute', right: 12, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', zIndex: 1 }}>
            {suffix}
          </div>
        )}
      </div>
    </FieldWrapper>
  )
}

/* ── Phone Input ── */
interface PhoneInputProps extends BaseInputProps {
  countryCode?: string
  value?: string
  onChange?: (value: string) => void
  disabled?: boolean
}

export function PhoneInput({ label, hint, error, countryCode = '+251', value, onChange, disabled, state }: PhoneInputProps) {
  const [focused, setFocused] = useState(false)
  const inputId = useId()
  const helperId = `${inputId}-help`
  const isDisabled = state === 'disabled' || disabled

  return (
    <FieldWrapper label={label ?? 'Phone number'} hint={hint} error={error} inputId={inputId} helperId={(hint || error) ? helperId : undefined}>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '0 12px',
          height: 44,
          background: 'var(--color-surface-raised)',
          border: '1.5px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          fontSize: 15,
          fontFamily: 'var(--font-body)',
          color: 'var(--color-text-secondary)',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 16 }}>🇪🇹</span>
          <span>{countryCode}</span>
        </div>
        <input
          id={inputId}
          type="tel"
          value={value}
          onChange={e => onChange?.(e.target.value)}
          disabled={isDisabled}
          placeholder="9 XX XX XX XX"
          aria-invalid={Boolean(error)}
          aria-describedby={(hint || error) ? helperId : undefined}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{ ...inputStyle(focused, error, isDisabled), flex: 1 }}
        />
      </div>
    </FieldWrapper>
  )
}

/* ── Search Input ── */
interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix' | 'suffix'>, BaseInputProps {
  onClear?: () => void
}

export function SearchInput({ label, hint, error, onClear, value, prefix: _p, suffix: _s, state: _st, ...rest }: SearchInputProps) {
  const [focused, setFocused] = useState(false)
  const generatedId = useId()
  const inputId = rest.id ?? generatedId
  const helperId = `${inputId}-help`

  return (
    <FieldWrapper label={label} hint={hint} error={error} inputId={inputId} helperId={(hint || error) ? helperId : undefined}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <svg
          width="16" height="16" viewBox="0 0 16 16" fill="none"
          style={{ position: 'absolute', left: 12, color: 'var(--color-text-muted)', pointerEvents: 'none', zIndex: 1 }}
          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
        >
          <circle cx="7" cy="7" r="4.5"/><path d="M11 11l2.5 2.5"/>
        </svg>
        <input
          {...rest}
          id={inputId}
          value={value}
          type="search"
          aria-invalid={Boolean(error)}
          aria-describedby={(hint || error) ? helperId : rest['aria-describedby']}
          onFocus={e => { setFocused(true); rest.onFocus?.(e) }}
          onBlur={e => { setFocused(false); rest.onBlur?.(e) }}
          style={{ ...inputStyle(focused, error), paddingLeft: 38, paddingRight: value ? 38 : 14 }}
        />
        {value && onClear && (
          <button
            onClick={onClear}
            type="button"
            aria-label="Clear search"
            style={{
              position: 'absolute', right: 10,
              background: 'var(--color-surface-raised)', border: 'none',
              borderRadius: '50%', width: 22, height: 22,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: 12,
              zIndex: 1,
            }}
          >✕</button>
        )}
      </div>
    </FieldWrapper>
  )
}

/* ── Textarea ── */
interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'prefix' | 'suffix'>, BaseInputProps {
  rows?: number
}

export function Textarea({ label, hint, error, state, rows = 4, prefix: _p, suffix: _s, ...rest }: TextareaProps) {
  const [focused, setFocused] = useState(false)
  const generatedId = useId()
  const inputId = rest.id ?? generatedId
  const helperId = `${inputId}-help`
  const isDisabled = state === 'disabled' || rest.disabled

  return (
    <FieldWrapper label={label} hint={hint} error={error} inputId={inputId} helperId={(hint || error) ? helperId : undefined}>
      <textarea
        {...rest}
        id={inputId}
        rows={rows}
        disabled={isDisabled}
        aria-invalid={Boolean(error)}
        aria-describedby={(hint || error) ? helperId : rest['aria-describedby']}
        onFocus={e => { setFocused(true); rest.onFocus?.(e) }}
        onBlur={e => { setFocused(false); rest.onBlur?.(e) }}
        style={{
          ...inputStyle(focused, error, isDisabled),
          height: 'auto',
          paddingTop: 12,
          paddingBottom: 12,
          resize: 'vertical',
          minHeight: rows * 24,
        }}
      />
    </FieldWrapper>
  )
}

/* ── Select ── */
interface SelectProps extends BaseInputProps {
  options: { value: string; label: string }[]
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
}

export function Select({ label, hint, error, options, value, onChange, placeholder, disabled, state }: SelectProps) {
  const [focused, setFocused] = useState(false)
  const inputId = useId()
  const helperId = `${inputId}-help`
  const isDisabled = state === 'disabled' || disabled

  return (
    <FieldWrapper label={label} hint={hint} error={error} inputId={inputId} helperId={(hint || error) ? helperId : undefined}>
      <div style={{ position: 'relative' }}>
        <select
          id={inputId}
          value={value ?? ''}
          onChange={e => onChange?.(e.target.value)}
          disabled={isDisabled}
          aria-invalid={Boolean(error)}
          aria-describedby={(hint || error) ? helperId : undefined}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{ ...inputStyle(focused, error, isDisabled), paddingRight: 36, cursor: isDisabled ? 'not-allowed' : 'pointer' }}
        >
          {placeholder && <option value="" disabled>{placeholder}</option>}
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <svg
          width="14" height="14" viewBox="0 0 14 14" fill="none"
          style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--color-text-muted)' }}
          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
        >
          <path d="M3 5l4 4 4-4"/>
        </svg>
      </div>
    </FieldWrapper>
  )
}

/* ── Quantity stepper ── */
interface QuantityProps {
  label?: string
  value: number
  min?: number
  max?: number
  onChange: (v: number) => void
  disabled?: boolean
}

export function QuantityInput({ label, value, min = 1, max = 99, onChange, disabled }: QuantityProps) {
  return (
    <FieldWrapper label={label}>
      <div style={{ display: 'inline-flex', alignItems: 'center', height: 44, borderRadius: 'var(--radius-md)', border: '1.5px solid var(--color-border)', background: 'var(--color-surface)', overflow: 'hidden' }}>
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={disabled || value <= min}
          style={{
            width: 44, height: '100%', border: 'none', borderRight: '1px solid var(--color-border)',
            background: 'var(--color-surface-raised)', cursor: disabled || value <= min ? 'not-allowed' : 'pointer',
            fontSize: 18, color: value <= min ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >−</button>
        <span style={{ minWidth: 48, textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)' }}>
          {value}
        </span>
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={disabled || value >= max}
          style={{
            width: 44, height: '100%', border: 'none', borderLeft: '1px solid var(--color-border)',
            background: 'var(--color-surface-raised)', cursor: disabled || value >= max ? 'not-allowed' : 'pointer',
            fontSize: 18, color: value >= max ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >+</button>
      </div>
    </FieldWrapper>
  )
}

/* ── Price Input ── */
interface PriceInputProps extends BaseInputProps {
  currency?: string
  value?: string
  onChange?: (v: string) => void
  disabled?: boolean
}

export function PriceInput({ label, hint, error, currency = 'ETB', value, onChange, disabled, state }: PriceInputProps) {
  const [focused, setFocused] = useState(false)
  const isDisabled = state === 'disabled' || disabled

  return (
    <FieldWrapper label={label ?? 'Price'} hint={hint} error={error}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <span style={{ position: 'absolute', left: 14, fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--color-text-muted)', pointerEvents: 'none', zIndex: 1 }}>
          {currency}
        </span>
        <input
          type="number"
          value={value}
          onChange={e => onChange?.(e.target.value)}
          disabled={isDisabled}
          min={0}
          step={0.01}
          placeholder="0.00"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{ ...inputStyle(focused, error, isDisabled), paddingLeft: currency.length * 8 + 20, textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600 }}
        />
      </div>
    </FieldWrapper>
  )
}

/* ── OTP Input ── */
interface OTPInputProps {
  label?: string
  hint?: string
  error?: string
  length?: number
  value: string[]
  onChange: (v: string[]) => void
}

export function OTPInput({ label, hint, error, length = 6, value, onChange }: OTPInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([])

  function handleKey(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    const char = e.key
    if (char === 'Backspace') {
      const next = [...value]
      next[index] = ''
      onChange(next)
      if (index > 0) refs.current[index - 1]?.focus()
    } else if (/^\d$/.test(char)) {
      const next = [...value]
      next[index] = char
      onChange(next)
      if (index < length - 1) refs.current[index + 1]?.focus()
    }
  }

  return (
    <FieldWrapper label={label ?? 'Verification code'} hint={hint} error={error}>
      <div style={{ display: 'flex', gap: 8 }}>
        {Array.from({ length }).map((_, i) => (
          <input
            key={i}
            ref={el => { refs.current[i] = el }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={value[i] ?? ''}
            onKeyDown={e => handleKey(i, e)}
            onChange={() => {}}
            style={{
              width: 44, height: 56,
              textAlign: 'center',
              fontFamily: 'var(--font-mono)',
              fontSize: 22, fontWeight: 700,
              color: error ? 'var(--color-danger)' : 'var(--color-text-primary)',
              background: 'var(--color-surface)',
              border: `2px solid ${error ? 'var(--color-danger)' : value[i] ? 'var(--color-brand)' : 'var(--color-border)'}`,
              borderRadius: 'var(--radius-md)',
              outline: 'none',
              caretColor: 'var(--color-brand)',
            }}
          />
        ))}
      </div>
    </FieldWrapper>
  )
}

/* ── Multi-select chips ── */
interface MultiSelectProps {
  label?: string
  hint?: string
  error?: string
  options: { value: string; label: string }[]
  value: string[]
  onChange: (v: string[]) => void
}

export function MultiSelect({ label, hint, error, options, value, onChange }: MultiSelectProps) {
  function toggle(opt: string) {
    onChange(value.includes(opt) ? value.filter(v => v !== opt) : [...value, opt])
  }

  return (
    <FieldWrapper label={label} hint={hint} error={error}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {options.map(o => {
          const selected = value.includes(o.value)
          return (
            <button
              key={o.value}
              onClick={() => toggle(o.value)}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-full)',
                border: `1.5px solid ${selected ? 'var(--color-brand)' : 'var(--color-border)'}`,
                background: selected ? 'var(--color-brand-muted)' : 'var(--color-surface)',
                color: selected ? 'var(--color-brand-dark)' : 'var(--color-text-secondary)',
                fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-body)',
                cursor: 'pointer', transition: 'all 0.12s',
              }}
            >
              {selected && <span style={{ marginRight: 4 }}>✓</span>}
              {o.label}
            </button>
          )
        })}
      </div>
    </FieldWrapper>
  )
}

/* ── Structured Location Input ── */
export function LocationInput({ label, hint, error, state }: BaseInputProps) {
  const [focused, setFocused] = useState(false)
  const isDisabled = state === 'disabled'

  return (
    <FieldWrapper label={label ?? 'Location'} hint={hint ?? 'Start typing to search for an address'} error={error}>
      <div style={{ position: 'relative' }}>
        <svg
          width="16" height="16" viewBox="0 0 16 16" fill="none"
          style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-brand-text)', pointerEvents: 'none', zIndex: 1 }}
          stroke="currentColor" strokeWidth="1.5"
        >
          <path d="M8 9.5A2.5 2.5 0 1 0 8 4.5a2.5 2.5 0 0 0 0 5Z"/>
          <path d="M8 1.5C5.24 1.5 3 3.74 3 6.5c0 3.75 5 8 5 8s5-4.25 5-8c0-2.76-2.24-5-5-5Z" strokeLinejoin="round"/>
        </svg>
        <input
          type="text"
          placeholder="Search for a location…"
          disabled={isDisabled}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{ ...inputStyle(focused, error, isDisabled), paddingLeft: 40 }}
        />
        <button style={{
          position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
          fontSize: 11, padding: '4px 8px', borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--color-border)', background: 'var(--color-surface-raised)',
          color: 'var(--color-brand-text)', fontFamily: 'var(--font-body)', fontWeight: 600,
          cursor: 'pointer', zIndex: 1,
        }}>
          Use current
        </button>
      </div>
    </FieldWrapper>
  )
}

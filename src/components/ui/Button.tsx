import { type ButtonHTMLAttributes, type ReactNode } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'text' | 'destructive' | 'icon'
export type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: ReactNode
  iconPosition?: 'left' | 'right'
  children?: ReactNode
}

const STYLES: Record<ButtonVariant, {
  bg: string; color: string; border: string;
  hoverBg: string; activeBg: string;
  disabledBg: string; disabledColor: string;
}> = {
  primary: {
    bg: 'var(--color-brand)',
    color: 'var(--color-text-inverse)',
    border: 'transparent',
    hoverBg: 'var(--color-brand-light)',
    activeBg: 'var(--color-brand-dark)',
    disabledBg: 'var(--color-border)',
    disabledColor: 'var(--color-text-muted)',
  },
  secondary: {
    bg: 'transparent',
    color: 'var(--color-brand)',
    border: 'var(--color-brand)',
    hoverBg: 'var(--color-brand-muted)',
    activeBg: 'var(--color-brand-muted)',
    disabledBg: 'transparent',
    disabledColor: 'var(--color-text-muted)',
  },
  tertiary: {
    bg: 'var(--color-surface-raised)',
    color: 'var(--color-text-secondary)',
    border: 'var(--color-border)',
    hoverBg: 'var(--color-border)',
    activeBg: 'var(--color-border-strong)',
    disabledBg: 'var(--color-surface-raised)',
    disabledColor: 'var(--color-text-muted)',
  },
  text: {
    bg: 'transparent',
    color: 'var(--color-brand)',
    border: 'transparent',
    hoverBg: 'var(--color-brand-muted)',
    activeBg: 'var(--color-brand-muted)',
    disabledBg: 'transparent',
    disabledColor: 'var(--color-text-muted)',
  },
  destructive: {
    bg: 'var(--color-danger)',
    color: '#fff',
    border: 'transparent',
    hoverBg: '#D94040',
    activeBg: '#A02020',
    disabledBg: 'var(--color-border)',
    disabledColor: 'var(--color-text-muted)',
  },
  icon: {
    bg: 'var(--color-surface-raised)',
    color: 'var(--color-text-secondary)',
    border: 'var(--color-border)',
    hoverBg: 'var(--color-border)',
    activeBg: 'var(--color-border-strong)',
    disabledBg: 'var(--color-surface-raised)',
    disabledColor: 'var(--color-text-muted)',
  },
}

const SIZE_STYLES: Record<ButtonSize, { px: number; py: number; fontSize: number; radius: string; height: number; gap: number }> = {
  sm: { px: 12, py: 6,  fontSize: 12, radius: 'var(--radius-md)', height: 32, gap: 4 },
  md: { px: 16, py: 10, fontSize: 14, radius: 'var(--radius-md)', height: 40, gap: 6 },
  lg: { px: 20, py: 13, fontSize: 15, radius: 'var(--radius-lg)', height: 48, gap: 8 },
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  children,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const s = STYLES[variant]
  const sz = SIZE_STYLES[size]
  const isDisabled = disabled || loading
  const isIcon = variant === 'icon' && !children

  // Keyboard focus shows the app-wide :focus-visible outline in src/index.css, so the button sets no outline of its own.
  return (
    <button
      disabled={isDisabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: sz.gap,
        paddingLeft:  isIcon ? sz.py : sz.px,
        paddingRight: isIcon ? sz.py : sz.px,
        paddingTop: sz.py,
        paddingBottom: sz.py,
        height: sz.height,
        width: isIcon ? sz.height : undefined,
        fontFamily: 'var(--font-body)',
        fontSize: sz.fontSize,
        fontWeight: 600,
        lineHeight: 1,
        letterSpacing: '0.01em',
        borderRadius: sz.radius,
        border: `1.5px solid ${isDisabled ? 'transparent' : s.border}`,
        background: isDisabled ? s.disabledBg : s.bg,
        color: isDisabled ? s.disabledColor : s.color,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        transition: 'background 0.12s, color 0.12s, opacity 0.12s, transform 0.08s',
        flexShrink: 0,
        opacity: isDisabled ? 0.6 : 1,
        ...style,
      }}
      onMouseEnter={e => {
        if (!isDisabled) (e.currentTarget as HTMLButtonElement).style.background = s.hoverBg
      }}
      onMouseLeave={e => {
        if (!isDisabled) (e.currentTarget as HTMLButtonElement).style.background = isDisabled ? s.disabledBg : s.bg
      }}
      onMouseDown={e => {
        if (!isDisabled) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)'
      }}
      onMouseUp={e => {
        (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'
      }}
      {...rest}
    >
      {loading && <Spinner size={sz.fontSize} />}
      {!loading && icon && iconPosition === 'left' && icon}
      {children && <span>{children}</span>}
      {!loading && icon && iconPosition === 'right' && icon}
    </button>
  )
}

function Spinner({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      style={{ animation: 'spin 0.75s linear infinite' }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeOpacity="0.25" />
      <path d="M8 2a6 6 0 0 1 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

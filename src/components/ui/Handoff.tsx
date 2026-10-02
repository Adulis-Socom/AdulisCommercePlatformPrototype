import { type ReactNode, useState, useEffect } from 'react'
import { OTPInput } from './Input'

/* ═══════════════════════════════════════════════
   HANDOFF COMPONENTS
   QR Display, QR Scanner, OTP, Verification states
═══════════════════════════════════════════════ */

/* ── QR Display (Courier shows / Seller shows) ── */
export function QRDisplay({
  title,
  subtitle,
  context,
  expiresIn = 90,
  onExpired,
}: {
  title: string
  subtitle?: string
  context?: string
  expiresIn?: number
  onExpired?: () => void
}) {
  const [timeLeft, setTimeLeft] = useState(expiresIn)

  useEffect(() => {
    if (timeLeft <= 0) { onExpired?.(); return }
    const t = setTimeout(() => setTimeLeft(t => t - 1), 1000)
    return () => clearTimeout(t)
  }, [timeLeft, onExpired])

  const pct = (timeLeft / expiresIn) * 100
  const isUrgent = timeLeft < 20

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
      padding: 28, background: 'var(--color-surface)',
      borderRadius: 'var(--radius-2xl)', boxShadow: 'var(--shadow-md)',
      border: '1px solid var(--color-border)',
      textAlign: 'center',
    }}>
      {context && (
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {context}
        </div>
      )}

      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, margin: 0, color: 'var(--color-text-primary)' }}>
        {title}
      </h3>

      {subtitle && (
        <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5 }}>{subtitle}</p>
      )}

      {/* QR Code placeholder */}
      <div style={{
        width: 200, height: 200,
        background: 'var(--color-surface-raised)',
        borderRadius: 'var(--radius-xl)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: '2px solid var(--color-border)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* QR grid simulation */}
        <QRPattern />
        {/* Center logo */}
        <div style={{
          position: 'absolute',
          width: 40, height: 40,
          background: 'var(--color-brand)',
          borderRadius: 'var(--radius-md)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '3px solid white',
        }}>
          <span style={{ fontSize: 20 }}>A</span>
        </div>
      </div>

      {/* Timer */}
      <div style={{ width: '100%', maxWidth: 200 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Code expires in</span>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700,
            color: isUrgent ? 'var(--color-danger)' : 'var(--color-text-primary)',
          }}>
            {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
          </span>
        </div>
        <div style={{ height: 4, background: 'var(--color-border)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 'var(--radius-full)',
            background: isUrgent ? 'var(--color-danger)' : 'var(--color-brand)',
            width: `${pct}%`, transition: 'width 1s linear',
          }} />
        </div>
      </div>

      <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>
        This code is short-lived and refreshes automatically.
      </p>
    </div>
  )
}

function QRPattern() {
  const grid = 9
  return (
    <svg width="160" height="160" viewBox="0 0 160 160" style={{ position: 'absolute' }}>
      {Array.from({ length: grid * grid }, (_, i) => {
        const x = (i % grid) * 18 + 1
        const y = Math.floor(i / grid) * 18 + 1
        const filled = Math.random() > 0.45
        return filled ? <rect key={i} x={x} y={y} width="15" height="15" rx="2" fill="var(--color-text-primary)" opacity={0.85} /> : null
      })}
      {/* Corner finders */}
      {[[1,1],[1,127],[127,1]].map(([cx,cy], i) => (
        <g key={i}>
          <rect x={cx} y={cy} width="33" height="33" rx="4" fill="var(--color-text-primary)" opacity={0.9}/>
          <rect x={cx+4} y={cy+4} width="25" height="25" rx="2" fill="white"/>
          <rect x={cx+8} y={cy+8} width="17" height="17" rx="2" fill="var(--color-text-primary)" opacity={0.9}/>
        </g>
      ))}
    </svg>
  )
}

/* ── QR Scanner Frame (Courier scans / Buyer scans) ── */
export function QRScannerFrame({
  label,
  hint,
  scanning = true,
}: {
  label?: string
  hint?: string
  scanning?: boolean
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '24px 16px' }}>
      {label && (
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, margin: 0, color: 'var(--color-text-primary)', textAlign: 'center' }}>
          {label}
        </h3>
      )}

      {/* Viewfinder */}
      <div style={{
        width: 260, height: 260,
        background: 'rgba(26,21,18,0.85)',
        borderRadius: 'var(--radius-xl)',
        position: 'relative',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
      }}>
        {/* Corner brackets */}
        {[
          { top: 16, left: 16 },
          { top: 16, right: 16 },
          { bottom: 16, left: 16 },
          { bottom: 16, right: 16 },
        ].map((pos, i) => {
          const isLeft = 'left' in pos
          const isTop = 'top' in pos
          return (
            <div key={i} style={{
              position: 'absolute', ...pos,
              width: 28, height: 28,
              borderTop: isTop ? '3px solid white' : 'none',
              borderBottom: !isTop ? '3px solid white' : 'none',
              borderLeft: isLeft ? '3px solid white' : 'none',
              borderRight: !isLeft ? '3px solid white' : 'none',
              borderTopLeftRadius: isTop && isLeft ? 4 : 0,
              borderTopRightRadius: isTop && !isLeft ? 4 : 0,
              borderBottomLeftRadius: !isTop && isLeft ? 4 : 0,
              borderBottomRightRadius: !isTop && !isLeft ? 4 : 0,
            }}/>
          )
        })}

        {/* Scan line */}
        {scanning && (
          <div style={{
            position: 'absolute', left: 24, right: 24, height: 2,
            background: 'linear-gradient(90deg, transparent, var(--color-brand), transparent)',
            animation: 'scanline 2s ease-in-out infinite',
          }} />
        )}

        <style>{`@keyframes scanline { 0%,100% { top: 24px } 50% { top: calc(100% - 26px) } }`}</style>

        {!scanning && (
          <div style={{ color: 'white', fontSize: 14, textAlign: 'center', padding: 24 }}>
            Camera access required
          </div>
        )}
      </div>

      {hint && (
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', textAlign: 'center', margin: 0, lineHeight: 1.5, maxWidth: 280 }}>{hint}</p>
      )}
    </div>
  )
}

/* ── Verifying State ── */
export function VerifyingState({ message = 'Verifying…' }: { message?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: 32, textAlign: 'center' }}>
      <div style={{
        width: 64, height: 64,
        borderRadius: '50%',
        border: '3px solid var(--color-border)',
        borderTop: '3px solid var(--color-brand)',
        animation: 'spin 0.8s linear infinite',
      }}/>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <p style={{ fontSize: 16, fontWeight: 500, color: 'var(--color-text-primary)', margin: 0 }}>{message}</p>
    </div>
  )
}

/* ── Verification Success ── */
export function VerificationSuccess({ title, subtitle, detail, onContinue }: {
  title: string; subtitle?: string; detail?: string; onContinue?: () => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: 32, textAlign: 'center' }}>
      <div style={{
        width: 72, height: 72, borderRadius: '50%',
        background: 'var(--color-success-bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: '2px solid var(--color-success)',
      }}>
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="var(--color-success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 16l8 8L26 8"/>
        </svg>
      </div>
      <div>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, margin: '0 0 8px', color: 'var(--color-text-primary)' }}>{title}</h3>
        {subtitle && <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: 0 }}>{subtitle}</p>}
      </div>
      {detail && (
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', background: 'var(--color-surface-raised)', padding: '6px 12px', borderRadius: 'var(--radius-md)' }}>
          {detail}
        </div>
      )}
      {onContinue && (
        <button
          onClick={onContinue}
          style={{ marginTop: 8, padding: '11px 28px', borderRadius: 'var(--radius-md)', background: 'var(--color-success)', border: 'none', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}
        >
          Continue
        </button>
      )}
    </div>
  )
}

/* ── Verification Failed ── */
export function VerificationFailed({ title = 'Verification failed', message, onRetry, onFallback }: {
  title?: string; message?: string; onRetry?: () => void; onFallback?: () => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: 32, textAlign: 'center' }}>
      <div style={{
        width: 72, height: 72, borderRadius: '50%',
        background: 'var(--color-danger-bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: '2px solid var(--color-danger)',
      }}>
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="var(--color-danger)" strokeWidth="2.5" strokeLinecap="round">
          <path d="M8 8l16 16M24 8L8 24"/>
        </svg>
      </div>
      <div>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, margin: '0 0 8px', color: 'var(--color-text-primary)' }}>{title}</h3>
        {message && <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: 0 }}>{message}</p>}
      </div>
      <div style={{ display: 'flex', gap: 10, flexDirection: 'column', width: '100%', maxWidth: 280 }}>
        {onRetry && (
          <button onClick={onRetry} style={{ padding: '11px', borderRadius: 'var(--radius-md)', background: 'var(--color-brand)', border: 'none', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
            Try again
          </button>
        )}
        {onFallback && (
          <button onClick={onFallback} style={{ padding: '11px', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-secondary)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
            Having trouble scanning? Use verification code
          </button>
        )}
      </div>
    </div>
  )
}

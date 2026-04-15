import { useState, useEffect, useRef, useCallback } from 'react'
import { useApp } from '../lib/AppContext'
import { DEMO_MODE } from '../lib/supabase'
import { SUB_PLANS, LAYOUT_PRESETS, computeShifts, AMENITY_PRESETS } from '../lib/constants'

// ── Helpers ───────────────────────────────────────────────────
export const e = s => String(s ?? '')
export const fmtDate = d => {
  if (!d) return '—'
  try { return new Date(d.includes('T') ? d : d + 'T00:00:00').toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) }
  catch { return d }
}
export const initials = n => (n || '').split(' ').map(w => w[0] || '').join('').toUpperCase().slice(0, 2) || '?'

// ── Toast ─────────────────────────────────────────────────────
let _toastTimer
export function toast(msg, type = 'success') {
  const el = document.getElementById('toast')
  if (!el) return
  el.textContent = msg
  el.className = 'show ' + type
  clearTimeout(_toastTimer)
  _toastTimer = setTimeout(() => { el.className = '' }, 3800)
}

// ── Nav ───────────────────────────────────────────────────────
export function Nav() {
  const { S, set, go, fetchLibraries, fetchMyBookings, fetchMySubscriptions, fetchOwnerData } = useApp()
  const u = S.profile
  return (
    <nav id="nav">
      <div className="logo" onClick={() => go('landing')}>📖 StudySpace</div>
      <div className="nav-links">
        {DEMO_MODE && <span className="nav-mode-badge">DEMO</span>}
        <button className="nav-ghost" onClick={async () => { await fetchLibraries(); go('browse') }}>Explore</button>
        {u ? <>
          <button className="nav-ghost" onClick={async () => {
            if (u.role === 'owner') { await fetchOwnerData(); go('owner-dash') }
            else { await fetchMyBookings(); await fetchMySubscriptions(); go('student-dash') }
          }}>{u.role === 'owner' ? 'Dashboard' : 'My Bookings'}</button>
          <button className="nav-ghost" onClick={() => go('profile')}>⚙</button>
          <div className="nav-avatar" onClick={() => go('profile')}>{initials(u.full_name)}</div>
        </> : <>
          <button className="nav-ghost" onClick={() => set({ authModal: true, authMode: 'login' })}>Sign In</button>
          <button className="nav-pill" onClick={() => set({ authModal: true, authMode: 'signup' })}>Get Started Free</button>
        </>}
      </div>
    </nav>
  )
}

// ── Auth Modal ─────────────────────────────────────────────────
export function AuthModal() {
  const { S, set, demoLogin } = useApp()
  if (!S.authModal) return null
  const { authMode: mode, authRole: role } = S
  const isForgot = mode === 'forgot', isLogin = mode === 'login'

  const handleSubmit = async e => {
    e.preventDefault()
    if (DEMO_MODE) { demoLogin(role); return }
    // Real auth omitted for brevity — same as original
  }

  return (
    <div className="overlay" id="ov-a" onClick={ev => ev.target.id === 'ov-a' && set({ authModal: false })}>
      <div className="modal">
        <button className="modal-close" onClick={() => set({ authModal: false })}>✕</button>
        <h2>{isForgot ? 'Reset Password' : isLogin ? 'Welcome Back' : 'Join StudySpace'}</h2>
        <p className="modal-sub">{isForgot ? 'Enter your email for a reset link.' : isLogin ? 'Sign in to continue.' : DEMO_MODE ? 'Choose a role to explore:' : 'Create your free account.'}</p>

        {mode === 'signup' && (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--mutedl)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.5px' }}>I am a...</div>
            <div className="role-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
              {['student','owner'].map(r => (
                <div key={r} onClick={() => set({ authRole: r })}
                  style={{ padding: '16px 14px', borderRadius: 12, border: `1px solid ${role === r ? 'var(--red)' : 'var(--border)'}`, cursor: 'pointer', textAlign: 'center', background: role === r ? 'rgba(200,54,74,.07)' : 'var(--surface)' }}>
                  <span style={{ fontSize: 28, display: 'block', marginBottom: 8 }}>{r === 'student' ? '📚' : '🏛️'}</span>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{r === 'student' ? 'Student' : 'Library Owner'}</div>
                </div>
              ))}
            </div>
          </>
        )}

        <form onSubmit={handleSubmit}>
          {DEMO_MODE ? (
            <div style={{ background: 'rgba(200,54,74,.06)', border: '1px solid rgba(200,54,74,.15)', borderRadius: 12, padding: 20, textAlign: 'center' }}>
              <p style={{ color: 'var(--mutedl)', fontSize: 14, marginBottom: 16 }}>Select a role to explore the full app:</p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button type="button" className="btn-red btn-sm" onClick={() => demoLogin('student')}>📚 Enter as Student</button>
                <button type="button" className="btn-outline btn-sm" style={{ padding: '8px 16px', fontSize: 12 }} onClick={() => demoLogin('owner')}>🏛️ Enter as Owner</button>
              </div>
            </div>
          ) : (
            <>
              {mode === 'signup' && <div className="form-group"><label>Full Name</label><input className="form-input" type="text" placeholder="Your full name" required /></div>}
              <div className="form-group"><label>Email</label><input className="form-input" type="email" placeholder="you@example.com" required /></div>
              {!isForgot && <div className="form-group"><label>Password</label><input className="form-input" type="password" placeholder={isLogin ? 'Your password' : 'Min. 6 characters'} required /></div>}
              <button className="btn-red btn-block" type="submit">{isForgot ? 'Send Reset Link' : isLogin ? 'Sign In' : 'Create Account'}</button>
            </>
          )}
        </form>

        {!DEMO_MODE && (
          <div className="modal-foot" style={{ marginTop: 14 }}>
            {isForgot ? <a onClick={() => set({ authMode: 'login' })}>← Back to Sign In</a>
              : isLogin ? <><span style={{ float: 'left' }}><a onClick={() => set({ authMode: 'forgot' })}>Forgot password?</a></span><span>New here? <a onClick={() => set({ authMode: 'signup' })}>Sign up free</a></span></>
              : <>Already have an account? <a onClick={() => set({ authMode: 'login' })}>Sign in</a></>}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Review Modal ───────────────────────────────────────────────
export function ReviewModal() {
  const { S, set, submitReview } = useApp()
  if (!S.reviewModal) return null
  return (
    <div className="overlay" id="ov-r" onClick={ev => ev.target.id === 'ov-r' && set({ reviewModal: null, reviewRating: 0, reviewText: '' })}>
      <div className="modal" style={{ maxWidth: 400 }}>
        <button className="modal-close" onClick={() => set({ reviewModal: null, reviewRating: 0, reviewText: '' })}>✕</button>
        <h2 style={{ fontSize: 28 }}>Leave a Review</h2>
        <p className="modal-sub">{e(S.reviewModal.lib_name)}</p>
        <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
          {[1,2,3,4,5].map(i => (
            <button key={i} style={{ fontSize: 32, background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}
              onClick={() => set({ reviewRating: i })}>{i <= S.reviewRating ? '★' : '☆'}</button>
          ))}
        </div>
        <p style={{ color: 'var(--mutedl)', fontSize: 13, marginBottom: 18, height: 18 }}>
          {['','Poor','Fair','Good','Very Good','Excellent'][S.reviewRating] || 'Tap a star to rate'}
        </p>
        <div className="form-group"><label>Your Comment (optional)</label>
          <textarea placeholder="How was your experience?" value={S.reviewText} onChange={ev => set({ reviewText: ev.target.value })} />
        </div>
        <button className="btn-red btn-block" onClick={async () => { const ok = await submitReview(); if (ok) toast('✅ Review submitted!'); else toast('Please select a rating', 'error') }}>
          Submit Review
        </button>
      </div>
    </div>
  )
}

// ── Seat Layout (student-facing) ───────────────────────────────
export function SeatLayout({ seats, layoutConfig, blockedSeats, selectedSeats, onSelect }) {
  const blocked = new Set(blockedSeats || [])
  const hasGrid = seats.length && seats[0].grid_r !== undefined

  if (hasGrid) {
    const maxR = Math.max(...seats.map(s => s.grid_r)) + 1
    const maxC = Math.max(...seats.map(s => s.grid_c)) + 1
    const sm = {}; seats.forEach(s => { sm[s.grid_r + ',' + s.grid_c] = s })
    return (
      <div className="sg-student" style={{ gridTemplateColumns: `repeat(${maxC},36px)` }}>
        {Array.from({ length: maxR }, (_, r) =>
          Array.from({ length: maxC }, (_, c) => {
            const s = sm[r + ',' + c]
            if (!s) return <div key={r+','+c} className="sgc-s empty" />
            const isSel = selectedSeats.some(x => x.id === s.id)
            const cls = s.status === 'booked' ? 'bk' : s.status === 'maintenance' ? 'mt' : isSel ? 'sl' : 'av'
            return <button key={s.id} className={`sgc-s ${cls}`} disabled={s.status === 'booked' || s.status === 'maintenance'} onClick={() => onSelect(s)}>{e(s.label || '')}</button>
          })
        )}
      </div>
    )
  }

  const rowDefs = layoutConfig || [...new Set(seats.map(s => s.row_label))].sort().map(l => ({ label: l, count: seats.filter(s => s.row_label === l).length, gap: 0 }))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {rowDefs.map((rowDef, ri) => {
        const rs = seats.filter(s => s.row_label === rowDef.label).sort((a, b) => a.seat_number - b.seat_number)
        const gap = rowDef.gap || 0
        return (
          <div key={rowDef.label}>
            {ri > 0 && ri % 2 === 0 && layoutConfig && <div style={{ height: 6, borderTop: '2px dashed var(--border)', margin: '2px 0 4px 28px', opacity: .4 }} />}
            <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
              <span style={{ color: 'var(--muted)', fontSize: 11, fontWeight: 700, width: 24, textAlign: 'center', flexShrink: 0 }}>{rowDef.label}</span>
              <div style={{ display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'nowrap' }}>
                {rs.map(s => {
                  if (blocked.has(`${s.row_label}-${s.seat_number}`)) return <div key={s.id} style={{ width: 36, height: 36, borderRadius: 7, border: '1.5px dashed var(--muted)', opacity: .25 }} />
                  const isSel = selectedSeats.some(x => x.id === s.id)
                  const cls = s.status === 'booked' ? 'bk' : isSel ? 'sl' : 'av'
                  return (
                    <span key={s.id}>
                      <button className={`sgc-s ${cls}`} disabled={s.status === 'booked'} onClick={() => onSelect(s)}>{s.seat_number}</button>
                      {gap > 0 && s.seat_number === gap && <span style={{ display: 'inline-block', width: 14 }} />}
                    </span>
                  )
                })}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Amenity Tag Input ──────────────────────────────────────────
export function AmenityInput({ amenities, setAmenities }) {
  // presets loaded from import at top
  const available = AMENITY_PRESETS.filter(p => !amenities.includes(p))
  const add = val => { const v = (val || '').trim().replace(/,$/, '').trim(); if (v && !amenities.includes(v)) setAmenities([...amenities, v]) }
  const remove = val => setAmenities(amenities.filter(a => a !== val))

  return (
    <>
      <div className="tag-wrap" onClick={ev => ev.currentTarget.querySelector('input')?.focus()}>
        {amenities.map(a => (
          <span key={a} className="tag-badge">{a}<button type="button" onClick={() => remove(a)}>×</button></span>
        ))}
        <input className="tag-bare" placeholder={amenities.length ? 'Add more...' : 'Type and press Enter'} onKeyDown={ev => {
          if (ev.key === 'Enter' || ev.key === ',') { ev.preventDefault(); add(ev.target.value); ev.target.value = '' }
          else if (ev.key === 'Backspace' && !ev.target.value && amenities.length) remove(amenities[amenities.length - 1])
        }} />
      </div>
      <p className="form-hint">Press Enter or comma to add. Click × to remove.</p>
      <div className="preset-chips" style={{ marginTop: 10 }}>
        {available.slice(0, 14).map(p => (
          <button key={p} type="button" className="preset" onClick={() => add(p)}>+ {p}</button>
        ))}
      </div>
    </>
  )
}

import { useState, useEffect, useRef } from 'react'
import { useApp } from '../lib/AppContext'
import { DEMO_MODE } from '../lib/supabase'
import { SUB_PLANS, LAYOUT_PRESETS, computeShifts, DEMO_REVIEWS } from '../lib/constants'
import { e, fmtDate, initials, toast, SeatLayout, AmenityInput } from '../components/shared'

// ── LANDING ───────────────────────────────────────────────────
export function Landing() {
  const { S, set, go, fetchLibraries } = useApp()
  return (
    <>
      <section className="hero">
        <div className="hero-badge">INDIA'S STUDY SPACE NETWORK</div>
        <h1>Your Perfect Study Space,<br />One Tap Away</h1>
        <p className="hero-sub">Discover and book premium study spaces across India. No queues — pick your seat, choose your slot, and get to work.</p>
        <div className="hero-btns">
          <button className="btn-red" onClick={async () => { await fetchLibraries(); go('browse') }}>Find a Space →</button>
          {!S.user && <button className="btn-outline" onClick={() => set({ authModal: true, authMode: 'signup' })}>Sign Up Free</button>}
        </div>
        <div className="hero-stats">
          {[['1,200+','Study Spaces'],['45,000+','Active Students'],['98%','Satisfaction'],['15+','Cities']].map(([n,l]) => (
            <div key={l} style={{ textAlign: 'center' }}><div className="stat-n">{n}</div><div style={{ fontSize: 13, color: 'var(--mutedl)', marginTop: 4 }}>{l}</div></div>
          ))}
        </div>
      </section>

      <section className="lp-sec">
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <h2 className="sec-title">Built for Serious Learners</h2>
          <p className="sec-sub">Everything you need. Nothing you don't.</p>
          <div className="feat-grid">
            {[['🗺️','Smart Discovery','Filter by price, amenities, and ratings.'],['💺','Shift Booking','Book full shifts — not just hours — with live availability.'],['📅','Flexible Plans','Per-shift or subscription. Your choice.'],['📊','Progress Dashboard','Track study hours, bookings, and spending.']].map(([fi,h,p]) => (
              <div key={h} className="card feat-card"><span className="fi">{fi}</span><h3>{h}</h3><p>{p}</p></div>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-sec alt">
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <h2 className="sec-title">How It Works</h2>
          <p className="sec-sub">From search to seat in under 60 seconds.</p>
          <div className="steps-grid">
            {[['01','Search','Find spaces near you.'],['02','Pick a Shift','Choose your time slot.'],['03','Pay Instantly','UPI, card, or wallet.'],['04','Study!','Show QR at entrance.']].map(([n,h,p]) => (
              <div key={n} className="step"><div className="step-n">{n}</div><h3>{h}</h3><p>{p}</p></div>
            ))}
          </div>
        </div>
      </section>

      <section className="cta-band lp-sec alt">
        <h2>Ready to find your<br /><em>focus zone?</em></h2>
        <p>Join 45,000+ students already booking smarter with StudySpace.</p>
        <button className="btn-red" style={{ fontSize: 17, padding: '16px 52px', borderRadius: 14 }}
          onClick={async () => { if (S.user) { await fetchLibraries(); go('browse') } else set({ authModal: true, authMode: 'signup' }) }}>
          {S.user ? 'Browse Libraries →' : 'Get Started Free →'}
        </button>
      </section>
    </>
  )
}

// ── BROWSE ─────────────────────────────────────────────────────
export function Browse() {
  const { S, set, go, fetchLibraries, fetchLibReviews } = useApp()
  const [q, setQ] = useState(S.searchQ)
  const timer = useRef()

  const handleSearch = val => {
    setQ(val)
    clearTimeout(timer.current)
    timer.current = setTimeout(async () => { set({ searchQ: val }); await fetchLibraries() }, 400)
  }

  const openLib = async lib => {
    set({ selectedLib: lib, selectedSeats: [], selectedSlot: null, selectedPlan: 'hourly' })
    await fetchLibReviews(lib.id)
    go('library')
  }

  return (
    <div className="container">
      <h1 style={{ fontFamily: '"Cormorant Garamond",serif', fontSize: 36, marginBottom: 6 }}>Find a Study Space</h1>
      <p style={{ color: 'var(--mutedl)', marginBottom: 28 }}>{S.libraries.length} spaces found near you</p>
      <div className="search-bar">
        <input className="search-inp" placeholder="Search by name or area..." value={q} onChange={ev => handleSearch(ev.target.value)} />
        {['All','PREMIUM','STANDARD','BUDGET'].map(f => (
          <button key={f} className={`ftag ${S.filterTag === f ? 'on' : ''}`} onClick={async () => { set({ filterTag: f }); await fetchLibraries() }}>{f}</button>
        ))}
      </div>
      <div className="libs-grid">
        {S.loading ? <div className="loader" style={{ gridColumn: '1/-1' }}><div className="spinner" /><p>Loading spaces...</p></div>
          : !S.libraries.length ? <div className="empty-s" style={{ gridColumn: '1/-1' }}><span style={{ fontSize: 52 }}>🔍</span><p>No libraries found.</p></div>
          : S.libraries.map(lib => (
            <div key={lib.id} className="card lib-card" onClick={() => openLib(lib)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <span className="ltag" style={{ background: lib.tag_color + '22', color: lib.tag_color }}>{lib.tag}</span>
                <span style={{ color: 'var(--mutedl)', fontSize: 13 }}>⭐ {lib.rating} <span style={{ color: 'var(--muted)' }}>({lib.reviews_count})</span></span>
              </div>
              <h3>{lib.name}</h3>
              <p className="lib-loc">📍 {lib.location}</p>
              <div className="chips">
                {(lib.amenities || []).slice(0, 3).map(a => <span key={a} className="chip">{a}</span>)}
                {(lib.amenities || []).length > 3 && <span className="chip">+{lib.amenities.length - 3}</span>}
              </div>
              <div className="lib-foot">
                <div><span className="lib-price">₹{lib.price_per_hour}</span><span style={{ color: 'var(--mutedl)', fontSize: 13 }}>/shift</span></div>
                <span style={{ color: 'var(--green)', fontSize: 13 }}>{lib.total_seats} seats</span>
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}

// ── LIBRARY DETAIL ─────────────────────────────────────────────
export function LibraryDetail() {
  const { S, set, go, fetchSeats } = useApp()
  const lib = S.selectedLib
  if (!lib) return <div className="container"><p>Library not found.</p></div>

  const photos = (lib.photos || []).filter(p => p?.trim())
  const plans = SUB_PLANS.filter(p => p.id === 'hourly' ? lib.price_per_hour > 0 : (lib[p.field] || 0) > 0)
  const selectedPlanObj = SUB_PLANS.find(p => p.id === S.selectedPlan) || SUB_PLANS[0]
  const selectedPrice = S.selectedPlan === 'hourly' ? lib.price_per_hour : (lib[selectedPlanObj.field] || 0)
  const reviews = DEMO_REVIEWS[lib.id] || S.libReviews || []

  return (
    <div className="container-sm">
      <button className="back-link" onClick={() => go('browse')}>← Back to results</button>

      <div className="card det-hero">
        <div style={{ position: 'absolute', top: -60, right: -60, width: 260, height: 260, borderRadius: '50%', background: `radial-gradient(circle,${lib.tag_color}22 0%,transparent 70%)`, pointerEvents: 'none' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span className="ltag" style={{ background: lib.tag_color + '22', color: lib.tag_color }}>{lib.tag}</span>
            <h1 style={{ fontFamily: '"Cormorant Garamond",serif', fontSize: 36, margin: '12px 0 8px', lineHeight: 1.15 }}>{lib.name}</h1>
            <p style={{ color: 'var(--mutedl)', fontSize: 14, marginTop: 4 }}>🕐 {lib.hours}</p>
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ color: 'var(--mutedl)', fontSize: 14 }}>📍 {lib.location}</span>
              {lib.maps_url && <a href={lib.maps_url} target="_blank" rel="noopener" className="map-link">📍 View on Google Maps →</a>}
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <span className="price-big">₹{lib.price_per_hour}<span style={{ fontSize: 16, color: 'var(--mutedl)', fontFamily: '"DM Sans",sans-serif' }}>/shift</span></span>
            <p style={{ color: 'var(--green)', fontSize: 14, marginTop: 8 }}>{lib.total_seats} total seats</p>
          </div>
        </div>
        <p style={{ marginTop: 22, lineHeight: 1.85, color: 'var(--mutedl)', fontSize: 15 }}>{lib.description}</p>
      </div>

      {photos.length > 0 && (
        <div className="card" style={{ padding: 28, marginBottom: 18 }}>
          <h2 style={{ fontFamily: '"Cormorant Garamond",serif', fontSize: 22, marginBottom: 16 }}>Gallery</h2>
          <div className="gallery-grid">
            {photos.map(url => (
              <img key={url} className="gallery-img" src={url} alt="Library" onClick={() => set({ lightboxUrl: url })} onError={ev => ev.target.style.display = 'none'} />
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 28, marginBottom: 18 }}>
        <h2 style={{ fontFamily: '"Cormorant Garamond",serif', fontSize: 22, marginBottom: 6 }}>Choose a Plan</h2>
        <p style={{ color: 'var(--mutedl)', fontSize: 13, marginBottom: 18 }}>Pick how you'd like to access this library.</p>
        <div className="plan-grid">
          {plans.map(p => {
            const price = p.id === 'hourly' ? lib.price_per_hour : (lib[p.field] || 0)
            const isOn = S.selectedPlan === p.id
            return (
              <div key={p.id} className={`plan-card ${isOn ? 'on' : ''}`} onClick={() => set({ selectedPlan: p.id })}>
                {p.saveLabel && <span className="plan-save">{p.saveLabel}</span>}
                <div className="plan-label">{p.label}</div>
                <div className="plan-price">₹{price.toLocaleString('en-IN')}</div>
                <div className="plan-per">{p.perLabel}</div>
              </div>
            )
          })}
        </div>
        <p style={{ color: 'var(--mutedl)', fontSize: 13 }}>
          {S.selectedPlan === 'hourly' ? "📌 You'll select your specific seat and shift on the next screen." : "📌 Subscription gives you unlimited access during opening hours."}
        </p>
      </div>

      <div className="card" style={{ padding: 28, marginBottom: 18 }}>
        <h2 style={{ fontFamily: '"Cormorant Garamond",serif', fontSize: 22, marginBottom: 18 }}>Amenities</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {(lib.amenities || []).map(a => <span key={a} className="amen-pill">✓ {a}</span>)}
        </div>
      </div>

      <div className="card" style={{ padding: 28, marginBottom: 28 }}>
        <h2 style={{ fontFamily: '"Cormorant Garamond",serif', fontSize: 22, marginBottom: 16 }}>Student Reviews</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ fontFamily: '"Cormorant Garamond",serif', fontSize: 48, fontWeight: 700, color: 'var(--red)', lineHeight: 1 }}>{lib.rating}</div>
          <div><div style={{ color: 'var(--yellow)', fontSize: 20 }}>{'★'.repeat(Math.floor(lib.rating))}{'☆'.repeat(5 - Math.floor(lib.rating))}</div><div style={{ color: 'var(--mutedl)', fontSize: 13, marginTop: 3 }}>{lib.reviews_count} reviews</div></div>
        </div>
        {reviews.map(r => (
          <div key={r.id} className="rev-item">
            <div className="rev-head" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'white', flexShrink: 0 }}>{initials(r.student?.full_name)}</div>
                <strong>{r.student?.full_name || 'Student'}</strong>
              </div>
              <span style={{ color: 'var(--yellow)', fontSize: 14 }}>{'★'.repeat(r.rating)}{'☆'.repeat(5-r.rating)}</span>
            </div>
            {r.comment && <p style={{ color: 'var(--mutedl)', lineHeight: 1.75, fontSize: 14 }}>{r.comment}</p>}
          </div>
        ))}
        {!reviews.length && <p style={{ color: 'var(--mutedl)', fontSize: 14 }}>No reviews yet.</p>}
      </div>

      <button className="btn-red btn-block" onClick={async () => {
        if (!S.user) { set({ authModal: true, authMode: 'login' }); return }
        if (S.selectedPlan === 'hourly') { set({ loading: true }); await fetchSeats(lib.id); set({ loading: false }); go('seats') }
        else go('booking')
      }}>
        {S.selectedPlan === 'hourly' ? 'Select Your Seat →' : `Subscribe — ₹${selectedPrice.toLocaleString('en-IN')} / ${selectedPlanObj.perLabel} →`}
      </button>

      {S.lightboxUrl && (
        <div className="gallery-lightbox" onClick={() => set({ lightboxUrl: null })}>
          <button className="gallery-close" onClick={() => set({ lightboxUrl: null })} style={{ position: 'absolute', top: 18, right: 22, color: 'white', fontSize: 28, background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
          <img src={S.lightboxUrl} alt="Photo" />
        </div>
      )}
    </div>
  )
}

// ── SEAT SELECTION ─────────────────────────────────────────────
export function Seats() {
  const { S, set, go, fetchSeats } = useApp()
  const lib = S.selectedLib
  const can = S.selectedSeats.length > 0 && S.selectedSlot
  const total = S.selectedSeats.length * (lib?.price_per_hour || 0) * 3
  const shifts = lib ? computeShifts(lib) : []

  const toggleSeat = seat => {
    const already = S.selectedSeats.find(s => s.id === seat.id)
    set({ selectedSeats: already ? S.selectedSeats.filter(s => s.id !== seat.id) : [...S.selectedSeats, seat] })
  }

  return (
    <div className="container-sm">
      <button className="back-link" onClick={() => go('library')}>← Back to library</button>
      <h1 style={{ fontFamily: '"Cormorant Garamond",serif', fontSize: 32, marginBottom: 6 }}>Select Your Seat</h1>
      <p style={{ color: 'var(--mutedl)', marginBottom: 28 }}>{lib?.name} · Live availability</p>

      <div className="card" style={{ padding: 24, marginBottom: 18 }}>
        <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--mutedl)', letterSpacing: '.5px', textTransform: 'uppercase', marginBottom: 14 }}>1. Pick a Shift</h3>
        <div className="slot-row">
          {shifts.map(sh => (
            <button key={sh.slot} className={`slot-btn ${S.selectedSlot === sh.slot ? 'on' : ''}`}
              onClick={async () => { set({ selectedSlot: sh.slot, selectedSeats: [], loading: true }); await fetchSeats(lib.id); set({ loading: false }) }}>
              <span style={{ fontSize: 11, fontWeight: 700, opacity: .7, display: 'block' }}>{sh.dur}</span>
              {sh.slot}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--mutedl)', letterSpacing: '.5px', textTransform: 'uppercase', marginBottom: 14 }}>2. Choose Your Seat</h3>
        <div className="legend">
          {[['#DCF5EE','#A8E6D4','Available'],['var(--red)',null,'Selected'],['#FDDDD8','#F4B8B0','Booked']].map(([bg,br,label]) => (
            <div key={label} className="legend-item">
              <div className="ldot" style={{ background: bg, ...(br && { border: `1px solid ${br}` }) }} />
              {label}
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 28, marginBottom: 20 }}>
        <div className="entrance">── ENTRANCE / FRONT ──</div>
        {S.loading ? <div className="loader"><div className="spinner" /><p>Loading live seat data...</p></div>
          : S.seats.length ? <div className="seat-map-wrap"><SeatLayout seats={S.seats} layoutConfig={lib?.layout_config} blockedSeats={lib?.blocked_seats} selectedSeats={S.selectedSeats} onSelect={toggleSeat} /></div>
          : <p style={{ color: 'var(--mutedl)', textAlign: 'center', padding: 20 }}>Select a shift to see live availability.</p>}
      </div>

      {can && (
        <div className="sel-bar">
          <div><p style={{ fontSize: 13, color: 'var(--mutedl)', marginBottom: 4 }}>Seats: <strong style={{ color: 'var(--text)' }}>{S.selectedSeats.map(s => `${s.row_label}${s.seat_number}`).join(', ')}</strong></p>
            <p style={{ fontSize: 13, color: 'var(--mutedl)' }}>Shift: <strong style={{ color: 'var(--text)' }}>{S.selectedSlot}</strong></p></div>
          <div style={{ textAlign: 'right' }}>
            <big style={{ fontFamily: '"Cormorant Garamond",serif', fontSize: 30, color: 'var(--red)', display: 'block', lineHeight: 1 }}>₹{total}</big>
            <small style={{ color: 'var(--mutedl)', fontSize: 12 }}>{S.selectedSeats.length} seat{S.selectedSeats.length > 1 ? 's' : ''}</small>
          </div>
        </div>
      )}

      <button className="btn-red btn-block" disabled={!can} style={!can ? { opacity: .45, cursor: 'not-allowed' } : {}}
        onClick={() => can && go('booking')}>
        {can ? 'Proceed to Booking →' : 'Select a shift and at least one seat'}
      </button>
    </div>
  )
}

// ── BOOKING CONFIRM ─────────────────────────────────────────────
export function Booking() {
  const { S, set, go, createBooking, createSubscription, fetchMyBookings, fetchMySubscriptions } = useApp()
  const lib = S.selectedLib
  const isSubscription = S.selectedPlan !== 'hourly'
  const planObj = SUB_PLANS.find(p => p.id === S.selectedPlan) || SUB_PLANS[0]
  const planPrice = isSubscription ? (lib[planObj.field] || 0) : S.selectedSeats.length * (lib?.price_per_hour || 0) * 3
  const durMonths = { monthly:1, quarterly:3, halfyear:6, annual:12 }[S.selectedPlan]
  const endDate = () => { const d = new Date(); d.setMonth(d.getMonth() + (durMonths || 0)); return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) }
  const [busy, setBusy] = useState(false)

  if (S.bookingDone) return (
    <div className="container-sm">
      <div className="confirmed">
        <span style={{ fontSize: 78, display: 'block', marginBottom: 24 }}>{isSubscription ? '🎓' : '✅'}</span>
        <h2>{isSubscription ? 'Subscription Active!' : 'Booking Confirmed!'}</h2>
        <p style={{ fontSize: 16, color: 'var(--mutedl)' }}>{isSubscription ? `Your ${planObj.label} subscription at` : 'Your seat at'} <strong style={{ color: 'var(--text)' }}>{lib?.name}</strong> is {isSubscription ? 'active' : 'reserved'}.</p>
        {isSubscription ? <p style={{ color: 'var(--mutedl)', marginTop: 6 }}>Valid until: <strong style={{ color: 'var(--text)' }}>{endDate()}</strong></p>
          : <p style={{ color: 'var(--mutedl)', marginTop: 6 }}>Seats: <strong style={{ color: 'var(--text)' }}>{S.selectedSeats.map(s => `${s.row_label}${s.seat_number}`).join(', ')}</strong> · {S.selectedSlot}</p>}
        <div className="qr-card">
          <span style={{ fontSize: 52, flexShrink: 0 }}>{isSubscription ? '🎟️' : '🎫'}</span>
          <div><h4>{isSubscription ? 'Membership Card Generated' : 'QR Ticket Ready'}</h4><p>Show at the library entrance.</p>
            <p style={{ marginTop: 6, color: 'var(--text)', fontWeight: 600, fontSize: 13, letterSpacing: '.5px' }}>ID: {(S.confirmedBookingId || '').slice(0, 8).toUpperCase()}</p></div>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button className="btn-red" onClick={async () => { set({ bookingDone: false }); await fetchMyBookings(); await fetchMySubscriptions(); go('student-dash') }}>View Dashboard</button>
          <button className="btn-outline" onClick={() => { set({ bookingDone: false, selectedSeats: [], selectedSlot: null, selectedPlan: 'hourly' }); go('browse') }}>Browse More</button>
        </div>
      </div>
    </div>
  )

  const summaryRows = isSubscription
    ? [['Library', lib?.name], ['Plan', planObj.label], ['Duration', `${durMonths} month${durMonths > 1 ? 's' : ''}`], ['Valid Until', endDate()]]
    : [['Library', lib?.name], ['Seats', S.selectedSeats.map(s => `${s.row_label}${s.seat_number}`).join(', ')], ['Shift', S.selectedSlot || '—'], ['Duration', `${lib?.shift_duration || 3}h`]]

  return (
    <div className="container-sm">
      <button className="back-link" onClick={() => go(isSubscription ? 'library' : 'seats')}>← Back</button>
      <h1 style={{ fontFamily: '"Cormorant Garamond",serif', fontSize: 32, marginBottom: 28 }}>{isSubscription ? 'Confirm Subscription' : 'Confirm Booking'}</h1>

      <div className="card" style={{ padding: 26, marginBottom: 18 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--mutedl)', letterSpacing: 1.5, marginBottom: 18 }}>{isSubscription ? 'SUBSCRIPTION SUMMARY' : 'BOOKING SUMMARY'}</p>
        {summaryRows.map(([l, v]) => <div key={l} className="sum-line"><span>{l}</span><span>{v}</span></div>)}
        <div className="sum-total"><span>{isSubscription ? planObj.label + ' Price' : 'Total Amount'}</span><span>₹{planPrice.toLocaleString('en-IN')}</span></div>
      </div>

      <div className="card" style={{ padding: 26, marginBottom: 24 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--mutedl)', letterSpacing: 1.5, marginBottom: 18 }}>PAYMENT METHOD</p>
        {[['upi','📱 UPI / GPay / PhonePe'],['card','💳 Credit / Debit Card'],['wallet','💰 StudySpace Wallet']].map(([id, label]) => (
          <div key={id} className="pay-opt" style={{ borderColor: S.payMethod === id ? 'var(--red)' : 'var(--border)' }} onClick={() => set({ payMethod: id })}>
            <div className={`pay-radio ${S.payMethod === id ? 'on' : ''}`} />
            <span style={{ fontSize: 14 }}>{label}</span>
          </div>
        ))}
      </div>

      <button className="btn-red btn-block" disabled={busy} onClick={async () => {
        setBusy(true)
        const ok = isSubscription ? await createSubscription(S.selectedPlan) : await createBooking()
        if (ok) toast('🎉 ' + (isSubscription ? 'Subscription activated!' : 'Booking confirmed!'))
        else toast('Something went wrong', 'error')
        setBusy(false)
      }}>
        {busy ? 'Processing...' : `${isSubscription ? 'Activate Subscription' : 'Confirm Booking'} · ₹${planPrice.toLocaleString('en-IN')}`}
      </button>
    </div>
  )
}

// ── STUDENT DASHBOARD ──────────────────────────────────────────
export function StudentDash() {
  const { S, set, go, fetchLibraries, cancelBooking } = useApp()
  const bks = S.myBookings; const subs = S.mySubscriptions || []
  const td = new Date().toISOString().split('T')[0]
  const conf = bks.filter(b => b.status === 'confirmed')
  const activeSubs = subs.filter(s => s.status === 'active' && s.end_date >= td)
  const spent = [...bks, ...subs].reduce((a, b) => a + (b.total_amount || b.amount || 0), 0)

  return (
    <div className="container">
      <h1 style={{ fontFamily: '"Cormorant Garamond",serif', fontSize: 36, marginBottom: 6 }}>My Dashboard</h1>
      <p style={{ color: 'var(--mutedl)', marginBottom: 36 }}>Welcome back, {S.profile?.full_name?.split(' ')[0] || 'there'} 👋</p>

      <div className="dash-stats">
        {[['📅',conf.length,'var(--red)','Bookings'],['🎓',activeSubs.length,'var(--green)','Active Subscriptions'],['💰','₹'+spent.toLocaleString('en-IN'),'var(--yellow)','Total Spent'],['🏛️',new Set([...conf.map(b=>b.library_id),...activeSubs.map(s=>s.library_id)]).size,'var(--purple)','Spaces']].map(([ico,val,col,lbl]) => (
          <div key={lbl} className="card dstat"><span className="ico">{ico}</span><div className="val" style={{ color: col }}>{val}</div><div className="lbl">{lbl}</div></div>
        ))}
      </div>

      {activeSubs.length > 0 && (
        <div className="card" style={{ padding: 26, marginBottom: 20 }}>
          <div className="sec-hd"><h2>Active Subscriptions</h2><span className="spill" style={{ background: 'rgba(26,168,130,.12)', color: 'var(--green)' }}>{activeSubs.length} active</span></div>
          {activeSubs.map(s => (
            <div key={s.id} className="sub-active-card">
              <div><div className="sa-name" style={{ fontFamily: '"Cormorant Garamond",serif', fontSize: 20 }}>{s.library?.name}</div>
                <div style={{ color: 'var(--mutedl)', fontSize: 13, marginTop: 3 }}>{({ monthly:'Monthly', quarterly:'3-Month', halfyear:'6-Month', annual:'Annual' }[s.plan] || s.plan)} · Valid until {fmtDate(s.end_date)} · ₹{(s.amount||0).toLocaleString('en-IN')}</div></div>
              <span className="spill" style={{ background: 'rgba(26,168,130,.12)', color: 'var(--green)' }}>✓ Active</span>
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{ padding: 26 }}>
        <div className="sec-hd"><h2>Per-Shift Bookings</h2><button className="nav-pill" onClick={async () => { set({ selectedPlan: 'hourly' }); await fetchLibraries(); go('browse') }}>+ Book Now</button></div>
        {!bks.length ? <div className="empty-s"><span style={{ fontSize: 52, display: 'block', marginBottom: 14 }}>📅</span><p>No bookings yet.</p><button className="btn-red btn-sm" onClick={async () => { await fetchLibraries(); go('browse') }}>Browse Libraries</button></div>
          : bks.map(b => {
            const isT = b.booking_date === td && b.status === 'confirmed'
            const isF = b.booking_date > td && b.status === 'confirmed'
            const col = b.status === 'confirmed' ? (isT ? 'var(--green)' : isF ? 'var(--blue)' : 'var(--mutedl)') : b.status === 'cancelled' ? 'var(--red)' : 'var(--mutedl)'
            const lbl = b.status === 'cancelled' ? 'Cancelled' : isT ? 'Active' : isF ? 'Upcoming' : 'Completed'
            const canC = b.status === 'confirmed' && (isF || isT)
            const canR = b.status === 'confirmed' && b.booking_date < td
            return (
              <div key={b.id} className="bk-row">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="nm">{b.library?.name || 'Library'}</div>
                  <div className="mt">{fmtDate(b.booking_date)} · {(b.slot_start||'').slice(0,5)}–{(b.slot_end||'').slice(0,5)} · ₹{b.total_amount}</div>
                </div>
                <div className="acts">
                  {canR && <button className="btn-sm" style={{ background: 'rgba(196,134,10,.08)', color: 'var(--yellow)', border: '1px solid rgba(196,134,10,.2)', borderRadius: 8 }} onClick={() => set({ reviewModal: { library_id: b.library?.id, lib_name: b.library?.name }, reviewRating: 0, reviewText: '' })}>★ Review</button>}
                  {canC && <button className="btn-danger btn-sm" onClick={async () => { if (!confirm('Cancel this booking?')) return; await cancelBooking(b.id) }}>Cancel</button>}
                  <span className="spill" style={{ background: col + '22', color: col }}>{lbl}</span>
                </div>
              </div>
            )
          })}
      </div>
    </div>
  )
}

// ── PROFILE ────────────────────────────────────────────────────
export function Profile() {
  const { S, set, doLogout } = useApp()
  const u = S.profile
  if (!u) return <div className="container"><p>Please sign in first.</p></div>
  return (
    <div className="container-sm">
      <h1 style={{ fontFamily: '"Cormorant Garamond",serif', fontSize: 34, marginBottom: 6 }}>Account Settings</h1>
      <p style={{ color: 'var(--mutedl)', marginBottom: 36 }}>Manage your profile and preferences</p>
      <div className="card" style={{ padding: 32, marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 28, paddingBottom: 24, borderBottom: '1px solid var(--borders)', flexWrap: 'wrap' }}>
          <div className="profile-avatar">{initials(u.full_name)}</div>
          <div>
            <div style={{ fontFamily: '"Cormorant Garamond",serif', fontSize: 26 }}>{u.full_name}</div>
            <div style={{ color: 'var(--mutedl)', fontSize: 14, marginTop: 3 }}>{u.email}</div>
            <span className="spill" style={{ background: 'rgba(200,54,74,.1)', color: 'var(--red)', marginTop: 8, display: 'inline-block' }}>{u.role === 'owner' ? '🏛️ Library Owner' : '📚 Student'}</span>
            {DEMO_MODE && <span className="spill" style={{ background: 'rgba(196,134,10,.1)', color: 'var(--yellow)', marginTop: 8, marginLeft: 6, display: 'inline-block' }}>Demo Account</span>}
          </div>
        </div>
        <form onSubmit={ev => { ev.preventDefault(); if (DEMO_MODE) { set({ profile: { ...u, full_name: ev.target.elements[0].value } }); toast('✅ Name updated!') } }}>
          <div className="form-group"><label>Full Name</label><input className="form-input" defaultValue={u.full_name} required /></div>
          <button className="btn-red btn-sm" type="submit">Save Changes</button>
        </form>
      </div>
      <div className="card" style={{ padding: 32, borderColor: 'rgba(200,54,74,.25)' }}>
        <h3 style={{ fontFamily: '"Cormorant Garamond",serif', fontSize: 20, marginBottom: 8 }}>Sign Out</h3>
        <p style={{ color: 'var(--mutedl)', fontSize: 14, marginBottom: 20 }}>You will be signed out from all active sessions.</p>
        <button className="btn-danger" style={{ padding: '11px 22px', fontSize: 14 }} onClick={doLogout}>Sign Out</button>
      </div>
    </div>
  )
}

import { useState, useRef } from 'react'
import { useApp } from '../lib/AppContext'
import { SUB_PLANS, LAYOUT_PRESETS, computeShifts, DEMO_REVIEWS } from '../lib/constants'
import { LANDING_FEATURES, LANDING_STEPS, LANDING_OWNER_FEATURES, SEAT_LEGEND, PAYMENT_OPTS, PLAN_LABELS, PLAN_DUR_MONTHS, bookingStatus } from '../lib/ui-config'
import { e, fmtDate, initials, toast, SeatLayout, AmenityInput } from '../components/shared'

// ── LANDING ──────────────────────────────────────────────────
export function Landing() {
  const { S, set, go, fetchLibraries } = useApp()
  const browse = async () => { await fetchLibraries(); go('browse') }
  return (
    <>
      <section className="hero">
        <div className="hero-badge">INDIA'S STUDY SPACE NETWORK</div>
        <h1>Your Perfect Study Space,<br />One Tap Away</h1>
        <p className="hero-sub">Discover and book premium study spaces across India. No queues — pick your seat, choose your slot, and get to work.</p>
        <div className="hero-btns">
          <button className="btn-red" onClick={browse}>Find a Space →</button>
          {!S.user && <button className="btn-outline" onClick={() => set({ authModal: true, authMode: 'signup' })}>Sign Up Free</button>}
        </div>
        <div className="hero-stats">
          {[['1,200+','Study Spaces'],['45,000+','Active Students'],['98%','Satisfaction'],['15+','Cities']].map(([n,l]) => (
            <div key={l} className="text-center"><div className="stat-n">{n}</div><div className="text-sm c-muted mt-4">{l}</div></div>
          ))}
        </div>
      </section>

      <section className="lp-sec">
        <div className="container-wide">
          <h2 className="sec-title">Built for Serious Learners</h2>
          <p className="sec-sub">Everything you need. Nothing you don't.</p>
          <div className="feat-grid">
            {LANDING_FEATURES.map(f => (
              <div key={f.title} className="card feat-card"><span className="fi">{f.icon}</span><h3>{f.title}</h3><p>{f.body}</p></div>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-sec alt">
        <div className="container-mid">
          <h2 className="sec-title">How It Works</h2>
          <p className="sec-sub">From search to seat in under 60 seconds.</p>
          <div className="steps-grid">
            {LANDING_STEPS.map(s => (
              <div key={s.n} className="step"><div className="step-n">{s.n}</div><h3>{s.title}</h3><p>{s.body}</p></div>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-sec">
        <div className="container-wide">
          <h2 className="sec-title">For Library Owners</h2>
          <p className="sec-sub">Turn your space into a thriving business — free to list.</p>
          <div className="feat-grid">
            {LANDING_OWNER_FEATURES.map(f => (
              <div key={f.title} className="card feat-card"><span className="fi">{f.icon}</span><h3>{f.title}</h3><p>{f.body}</p></div>
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

// ── BROWSE ────────────────────────────────────────────────────
export function Browse() {
  const { S, set, go, fetchLibraries, fetchLibReviews } = useApp()
  const [q, setQ] = useState(S.searchQ)
  const timer = useRef()
  const search = val => { setQ(val); clearTimeout(timer.current); timer.current = setTimeout(async () => { set({ searchQ: val }); await fetchLibraries() }, 400) }
  const openLib = async lib => { set({ selectedLib: lib, selectedSeats: [], selectedSlot: null, selectedPlan: 'hourly' }); await fetchLibReviews(lib.id); go('library') }

  return (
    <div className="container">
      <h1 className="page-title">Find a Study Space</h1>
      <p className="page-sub">{S.libraries.length} spaces found near you</p>
      <div className="search-bar">
        <input className="search-inp" placeholder="Search by name or area..." value={q} onChange={ev => search(ev.target.value)} />
        {['All','PREMIUM','STANDARD','BUDGET'].map(f => (
          <button key={f} className={`ftag ${S.filterTag === f ? 'on' : ''}`}
            onClick={async () => { set({ filterTag: f }); await fetchLibraries() }}>{f}</button>
        ))}
      </div>
      <div className="libs-grid">
        {S.loading
          ? <div className="loader col-span-full"><div className="spinner" /><p>Loading spaces...</p></div>
          : !S.libraries.length
            ? <div className="empty-s col-span-full"><span className="ei">🔍</span><p>No libraries found.</p></div>
            : S.libraries.map(lib => (
              <div key={lib.id} className="card lib-card" onClick={() => openLib(lib)}>
                <div className="lib-top">
                  <span className="ltag" style={{ background: lib.tag_color + '22', color: lib.tag_color }}>{lib.tag}</span>
                  <span className="text-sm c-muted">⭐ {lib.rating} <span className="c-hint">({lib.reviews_count})</span></span>
                </div>
                <h3>{lib.name}</h3>
                <p className="lib-loc">📍 {lib.location}</p>
                <div className="chips">
                  {(lib.amenities || []).slice(0, 3).map(a => <span key={a} className="chip">{a}</span>)}
                  {(lib.amenities || []).length > 3 && <span className="chip">+{lib.amenities.length - 3}</span>}
                </div>
                <div className="lib-foot">
                  <div><span className="lib-price">₹{lib.price_per_hour}</span><span className="text-sm c-muted">/shift</span></div>
                  <span className="text-sm c-green">{lib.total_seats} seats</span>
                </div>
              </div>
            ))}
      </div>
    </div>
  )
}

// ── LIBRARY DETAIL ────────────────────────────────────────────
export function LibraryDetail() {
  const { S, set, go, fetchSeats } = useApp()
  const lib = S.selectedLib
  if (!lib) return <div className="container"><p>Library not found.</p></div>
  const photos = (lib.photos || []).filter(p => p?.trim())
  const plans = SUB_PLANS.filter(p => p.id === 'hourly' ? lib.price_per_hour > 0 : (lib[p.field] || 0) > 0)
  const planObj = SUB_PLANS.find(p => p.id === S.selectedPlan) || SUB_PLANS[0]
  const planPrice = S.selectedPlan === 'hourly' ? lib.price_per_hour : (lib[planObj.field] || 0)
  const reviews = DEMO_REVIEWS[lib.id] || S.libReviews || []

  return (
    <div className="container-sm">
      <button className="back-link" onClick={() => go('browse')}>← Back to results</button>

      <div className="card det-hero">
        <div className="flex justify-between items-start flex-wrap gap-16">
          <div className="flex-1 min-w-0">
            <span className="ltag" style={{ background: lib.tag_color + '22', color: lib.tag_color }}>{lib.tag}</span>
            <h1 className="font-serif mt-12 mb-8 text-36 lh-115">{lib.name}</h1>
            <p className="c-muted text-md mt-4">🕐 {lib.hours}</p>
            <div className="flex items-center gap-10 flex-wrap mt-10">
              <span className="text-md c-muted">📍 {lib.location}</span>
              {lib.maps_url && <a href={lib.maps_url} target="_blank" rel="noopener" className="map-link">📍 View on Google Maps →</a>}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <span className="price-big">₹{lib.price_per_hour}<span className="text-xl c-muted" style={{ fontFamily: '"DM Sans",sans-serif' }}>/shift</span></span>
            <p className="c-green text-md mt-8">{lib.total_seats} total seats</p>
          </div>
        </div>
        <p className="mt-22 lh-185 c-muted text-lg">{lib.description}</p>
      </div>

      {photos.length > 0 && (
        <div className="card p-28 mb-18">
          <h2 className="font-serif mb-16 text-22">Gallery</h2>
          <div className="gallery-grid">
            {photos.map(url => <img key={url} className="gallery-img" src={url} alt="Library" onClick={() => set({ lightboxUrl: url })} onError={ev => ev.target.style.display = 'none'} />)}
          </div>
        </div>
      )}

      <div className="card p-28 mb-18">
        <h2 className="font-serif mb-6 text-22">Choose a Plan</h2>
        <p className="c-muted text-sm mb-18">Pick how you'd like to access this library.</p>
        <div className="plan-grid">
          {plans.map(p => {
            const price = p.id === 'hourly' ? lib.price_per_hour : (lib[p.field] || 0)
            return (
              <div key={p.id} className={`plan-card ${S.selectedPlan === p.id ? 'on' : ''}`} onClick={() => set({ selectedPlan: p.id })}>
                {p.saveLabel && <span className="plan-save">{p.saveLabel}</span>}
                <div className="plan-label">{p.label}</div>
                <div className="plan-price">₹{price.toLocaleString('en-IN')}</div>
                <div className="plan-per">{p.perLabel}</div>
              </div>
            )
          })}
        </div>
        <p className="c-muted text-sm">
          {S.selectedPlan === 'hourly' ? "📌 You'll select your specific seat and shift on the next screen." : '📌 Subscription gives you unlimited access during opening hours.'}
        </p>
      </div>

      <div className="card p-28 mb-18">
        <h2 className="font-serif mb-18 text-22">Amenities</h2>
        <div className="flex flex-wrap gap-10">{(lib.amenities || []).map(a => <span key={a} className="amen-pill">✓ {a}</span>)}</div>
      </div>

      <div className="card p-28 mb-28">
        <h2 className="font-serif mb-16 text-22">Student Reviews</h2>
        <div className="flex items-center gap-12 mb-20">
          <div className="font-serif c-red text-48 fw-700 lh-1">{lib.rating}</div>
          <div><div className="stars-yellow">{'★'.repeat(Math.floor(lib.rating))}{'☆'.repeat(5-Math.floor(lib.rating))}</div><div className="c-muted text-sm mt-4">{lib.reviews_count} reviews</div></div>
        </div>
        {reviews.map(r => (
          <div key={r.id} className="rev-item">
            <div className="flex justify-between items-center flex-wrap gap-8 mb-8">
              <div className="flex items-center gap-10">
                <div className="avatar avatar-sm">{initials(r.student?.full_name)}</div>
                <strong className="fw-600">{r.student?.full_name || 'Student'}</strong>
              </div>
              <span className="stars-yellow">{'★'.repeat(r.rating)}{'☆'.repeat(5-r.rating)}</span>
            </div>
            {r.comment && <p className="c-muted lh-175 text-md">{r.comment}</p>}
          </div>
        ))}
        {!reviews.length && <p className="c-muted text-md">No reviews yet.</p>}
      </div>

      <button className="btn-red btn-block" onClick={async () => {
        if (!S.user) { set({ authModal: true, authMode: 'login' }); return }
        if (S.selectedPlan === 'hourly') { set({ loading: true }); await fetchSeats(lib.id); set({ loading: false }); go('seats') }
        else go('booking')
      }}>
        {S.selectedPlan === 'hourly' ? 'Select Your Seat →' : `Subscribe — ₹${planPrice.toLocaleString('en-IN')} / ${planObj.perLabel} →`}
      </button>

      {S.lightboxUrl && (
        <div className="gallery-lightbox" onClick={() => set({ lightboxUrl: null })}>
          <button onClick={() => set({ lightboxUrl: null })} className="lightbox-close">✕</button>
          <img src={S.lightboxUrl} alt="Photo" />
        </div>
      )}
    </div>
  )
}

// ── SEATS ─────────────────────────────────────────────────────
export function Seats() {
  const { S, set, go, fetchSeats } = useApp()
  const lib = S.selectedLib
  const can = S.selectedSeats.length > 0 && S.selectedSlot
  const total = S.selectedSeats.length * (lib?.price_per_hour || 0) * 3
  const shifts = lib ? computeShifts(lib) : []
  const toggleSeat = seat => set({ selectedSeats: S.selectedSeats.find(s => s.id === seat.id) ? S.selectedSeats.filter(s => s.id !== seat.id) : [...S.selectedSeats, seat] })
  const [activeSeatFloor, setActiveSeatFloor] = useState(0)
  const [activeSeatRoom,  setActiveSeatRoom]  = useState(0)
  const today   = new Date().toISOString().split('T')[0]
  const maxDate = (() => { const d = new Date(); d.setDate(d.getDate()+30); return d.toISOString().split('T')[0] })()
  const floors  = lib?.floors_config
  const currentFloor = floors?.[activeSeatFloor]
  const currentRoom  = currentFloor?.rooms?.[activeSeatRoom]
  const displaySeats = floors
    ? S.seats.filter(s => s.floor === currentFloor?.name && s.room === currentRoom?.name)
    : S.seats
  const refetch = async (slot) => { set({ selectedSlot: slot, selectedSeats: [], loading: true }); await fetchSeats(lib.id); set({ loading: false }) }

  return (
    <div className="container-sm">
      <button className="back-link" onClick={() => go('library')}>← Back to library</button>
      <h1 className="page-title text-32">Select Your Seat</h1>
      <p className="page-sub">{lib?.name} · Live availability</p>

      {/* 1. Date */}
      <div className="card p-24 mb-14">
        <p className="section-label">1. Choose a Date</p>
        <div className="flex items-center gap-14 flex-wrap">
          <input type="date" className="form-input" style={{ maxWidth:200, cursor:'pointer' }}
            min={today} max={maxDate} value={S.selectedDate}
            onChange={ev => set({ selectedDate: ev.target.value, selectedSlot: null, selectedSeats: [] })} />
          <span className="text-sm c-muted">
            {S.selectedDate === today ? '📅 Today' :
              new Date(S.selectedDate+'T00:00:00').toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})}
          </span>
        </div>
        <p className="hint-text">You can book up to 30 days in advance.</p>
      </div>

      {/* 2. Shift */}
      <div className="card p-24 mb-14">
        <p className="section-label">2. Pick a Shift</p>
        <div className="slot-row">
          {shifts.map(sh => (
            <button key={sh.slot} className={`slot-btn ${S.selectedSlot === sh.slot ? 'on' : ''}`}
              onClick={() => refetch(sh.slot)}>
              <span className="text-xs fw-700" style={{ opacity:.7, display:'block' }}>{sh.dur}</span>
              {sh.slot}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Seat */}
      <p className="section-label">3. Choose Your Seat</p>
      <div className="legend mb-14">
        {SEAT_LEGEND.map(l => (
          <div key={l.label} className="legend-item">
            <div className="ldot" style={{ background: l.bg, ...(l.br && { border: `1px solid ${l.br}` }) }} />{l.label}
          </div>
        ))}
      </div>

      <div className="card p-28 mb-20">
        {floors && floors.length > 0 && (
          <div style={{ marginBottom:16, paddingBottom:14, borderBottom:'1px solid var(--borders)' }}>
            <div className="flex gap-8 flex-wrap mb-8">
              {floors.map((fl,fi) => (
                <button key={fi} onClick={() => { setActiveSeatFloor(fi); setActiveSeatRoom(0) }}
                  style={{ padding:'5px 14px', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer',
                    border:`1.5px solid ${fi===activeSeatFloor?'var(--red)':'var(--border)'}`,
                    background: fi===activeSeatFloor?'var(--red)':'transparent',
                    color: fi===activeSeatFloor?'white':'var(--mutedl)' }}>
                  {fl.name}
                </button>
              ))}
            </div>
            {currentFloor?.rooms?.length > 1 && (
              <div className="flex gap-6 flex-wrap">
                {currentFloor.rooms.map((rm,ri) => (
                  <button key={ri} onClick={() => setActiveSeatRoom(ri)}
                    style={{ padding:'4px 12px', borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer',
                      border:`1.5px solid ${ri===activeSeatRoom?'rgba(200,54,74,.6)':'var(--border)'}`,
                      background: ri===activeSeatRoom?'rgba(200,54,74,.1)':'transparent',
                      color: ri===activeSeatRoom?'var(--red)':'var(--mutedl)' }}>
                    {rm.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="entrance">── ENTRANCE / FRONT ──</div>
        {!S.selectedSlot
          ? <p className="c-muted text-center p-20">Select a shift above to see availability.</p>
          : S.loading
            ? <div className="loader"><div className="spinner" /><p>Loading seats...</p></div>
            : displaySeats.length
              ? <div className="seat-map-wrap"><SeatLayout seats={displaySeats} layoutConfig={lib?.layout_config} blockedSeats={lib?.blocked_seats} selectedSeats={S.selectedSeats} onSelect={toggleSeat} /></div>
              : <p className="c-muted text-center p-20">No seats for this floor/room.</p>}
      </div>

      {can && (
        <div className="sel-bar">
          <div>
            <p className="text-sm c-muted mb-4">Seats: <strong className="c-text">{S.selectedSeats.map(s=>`${s.row_label}${s.seat_number}`).join(', ')}</strong></p>
            <p className="text-sm c-muted">
              {fmtDate(S.selectedDate)} · <strong className="c-text">{S.selectedSlot}</strong>
            </p>
          </div>
          <div className="text-right">
            <big className="font-serif c-red text-30 lh-1" style={{ display:'block' }}>₹{total}</big>
            <small className="c-muted text-sm">{S.selectedSeats.length} seat{S.selectedSeats.length>1?'s':''}</small>
          </div>
        </div>
      )}
      <button className="btn-red btn-block" disabled={!can} style={!can?{opacity:.45,cursor:'not-allowed'}:{}} onClick={() => can && go('booking')}>
        {can ? 'Proceed to Booking →' : 'Select a date, shift, and at least one seat'}
      </button>
    </div>
  )
}


// ── BOOKING ───────────────────────────────────────────────────
export function Booking() {
  const { S, set, go, createBooking, createSubscription, fetchMyBookings, fetchMySubscriptions } = useApp()
  const lib = S.selectedLib
  const isSubscription = S.selectedPlan !== 'hourly'
  const planObj = SUB_PLANS.find(p => p.id === S.selectedPlan) || SUB_PLANS[0]
  const planPrice = isSubscription ? (lib[planObj.field] || 0) : S.selectedSeats.length * (lib?.price_per_hour || 0) * 3
  const durMonths = PLAN_DUR_MONTHS[S.selectedPlan]
  const endDate = () => { const d = new Date(); d.setMonth(d.getMonth() + (durMonths || 0)); return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) }
  const [busy, setBusy] = useState(false)

  if (S.bookingDone) return (
    <div className="container-sm">
      <div className="confirmed">
        <span className="hero-emoji">{isSubscription ? '🎓' : '✅'}</span>
        <h2>{isSubscription ? 'Subscription Active!' : 'Booking Confirmed!'}</h2>
        <p className="text-xl c-muted">{isSubscription ? `Your ${planObj.label} subscription at` : 'Your seat at'} <strong>{lib?.name}</strong> is {isSubscription ? 'active' : 'reserved'}.</p>
        {isSubscription ? <p className="c-muted mt-6">Valid until: <strong>{endDate()}</strong></p>
          : <p className="c-muted mt-6">Seats: <strong>{S.selectedSeats.map(s=>`${s.row_label}${s.seat_number}`).join(', ')}</strong> · {S.selectedSlot}</p>}
        <div className="qr-card">
          <span className="confirm-ticket-icon">{isSubscription ? '🎟️' : '🎫'}</span>
          <div><h4>{isSubscription ? 'Membership Card Generated' : 'QR Ticket Ready'}</h4><p>Show at the library entrance.</p>
            <p className="c-text fw-600 text-sm mt-6 tracking-ls">ID: {(S.confirmedBookingId || '').slice(0, 8).toUpperCase()}</p></div>
        </div>
        <div className="flex gap-12 flex-wrap justify-center">
          <button className="btn-red" onClick={async () => { set({ bookingDone: false }); await fetchMyBookings(); await fetchMySubscriptions(); go('student-dash') }}>View Dashboard</button>
          <button className="btn-outline" onClick={() => { set({ bookingDone: false, selectedSeats: [], selectedSlot: null, selectedPlan: 'hourly' }); go('browse') }}>Browse More</button>
        </div>
      </div>
    </div>
  )

  const summaryRows = isSubscription
    ? [['Library', lib?.name], ['Plan', planObj.label], ['Duration', `${durMonths} month${durMonths > 1 ? 's' : ''}`], ['Valid Until', endDate()]]
    : [['Library', lib?.name], ['Date', fmtDate(S.selectedDate)], ['Seats', S.selectedSeats.map(s=>`${s.row_label}${s.seat_number}`).join(', ')], ['Shift', S.selectedSlot || '—']]

  return (
    <div className="container-sm">
      <button className="back-link" onClick={() => go(isSubscription ? 'library' : 'seats')}>← Back</button>
      <h1 className="font-serif mb-28 text-32">{isSubscription ? 'Confirm Subscription' : 'Confirm Booking'}</h1>

      <div className="card p-26 mb-18">
        <p className="section-label">{isSubscription ? 'SUBSCRIPTION SUMMARY' : 'BOOKING SUMMARY'}</p>
        {summaryRows.map(([l, v]) => <div key={l} className="sum-line"><span className="c-muted">{l}</span><span>{v}</span></div>)}
        <div className="sum-total"><span className="font-serif text-22">{isSubscription ? planObj.label + ' Price' : 'Total Amount'}</span><span className="font-serif c-red text-30">₹{planPrice.toLocaleString('en-IN')}</span></div>
      </div>

      <div className="card p-26 mb-24">
        <p className="section-label">PAYMENT METHOD</p>
        {PAYMENT_OPTS.map(opt => (
          <div key={opt.id} className="pay-opt" style={{ borderColor: S.payMethod === opt.id ? 'var(--red)' : 'var(--border)' }} onClick={() => set({ payMethod: opt.id })}>
            <div className={`pay-radio ${S.payMethod === opt.id ? 'on' : ''}`} />
            <span className="text-md">{opt.label}</span>
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

// ── STUDENT DASHBOARD ─────────────────────────────────────────
export function StudentDash() {
  const { S, set, go, fetchLibraries, cancelBooking } = useApp()
  const bks = S.myBookings; const subs = S.mySubscriptions || []
  const td = new Date().toISOString().split('T')[0]
  const conf = bks.filter(b => b.status === 'confirmed')
  const activeSubs = subs.filter(s => s.status === 'active' && s.end_date >= td)
  const spent = [...bks, ...subs].reduce((a, b) => a + (b.total_amount || b.amount || 0), 0)
  const spaceCount = new Set([...conf.map(b=>b.library_id), ...activeSubs.map(s=>s.library_id)]).size

  return (
    <div className="container">
      <h1 className="page-title">My Dashboard</h1>
      <p className="page-sub">Welcome back, {S.profile?.full_name?.split(' ')[0] || 'there'} 👋</p>

      <div className="dash-stats">
        {[
          { ico:'📅', val:conf.length,                              col:'var(--red)',    lbl:'Bookings' },
          { ico:'🎓', val:activeSubs.length,                        col:'var(--green)',  lbl:'Active Subscriptions' },
          { ico:'💰', val:'₹'+spent.toLocaleString('en-IN'),        col:'var(--yellow)', lbl:'Total Spent' },
          { ico:'🏛️', val:spaceCount,                              col:'var(--purple)', lbl:'Spaces Visited' },
        ].map(s => (
          <div key={s.lbl} className="card dstat">
            <span className="ico">{s.ico}</span>
            <div className="val" style={{ color: s.col }}>{s.val}</div>
            <div className="lbl">{s.lbl}</div>
          </div>
        ))}
      </div>

      {activeSubs.length > 0 && (
        <div className="card p-26 mb-20">
          <div className="sec-hd"><h2>Active Subscriptions</h2><span className="spill pill-green">{activeSubs.length} active</span></div>
          {activeSubs.map(s => (
            <div key={s.id} className="sub-active-card">
              <div>
                <div className="font-serif text-22">{s.library?.name}</div>
                <div className="c-muted text-sm mt-4">{PLAN_LABELS[s.plan] || s.plan} · Valid until {fmtDate(s.end_date)} · ₹{(s.amount||0).toLocaleString('en-IN')}</div>
              </div>
              <span className="spill pill-green">✓ Active</span>
            </div>
          ))}
        </div>
      )}

      {S.announcements?.length > 0 && (
        <div className="card p-26 mb-20">
          <div className="sec-hd"><h2>📢 Announcements</h2></div>
          {S.announcements.map(ann => (
            <div key={ann.id} style={{ padding:'14px 0', borderBottom:'1px solid var(--borders)' }}>
              <div className="flex justify-between items-center flex-wrap gap-8 mb-6">
                <span className="fw-600 text-md">{ann.lib_name || ann.library?.name}</span>
                <span className="text-sm c-muted">{fmtDate((ann.created_at||'').split('T')[0])}</span>
              </div>
              <p className="c-muted lh-16 text-md">{ann.message}</p>
            </div>
          ))}
        </div>
      )}

      <div className="card p-26">
        <div className="sec-hd">
          <h2>Per-Shift Bookings</h2>
          <button className="nav-pill" onClick={async () => { set({ selectedPlan: 'hourly' }); await fetchLibraries(); go('browse') }}>+ Book Now</button>
        </div>
        {!bks.length
          ? <div className="empty-s"><span className="ei">📅</span><p>No bookings yet.</p><button className="btn-red btn-sm mt-16" onClick={async () => { await fetchLibraries(); go('browse') }}>Browse Libraries</button></div>
          : bks.map(b => {
              const { label, col, canCancel, canReview } = bookingStatus(b, td)
              return (
                <div key={b.id} className="bk-row">
                  <div className="flex-1 min-w-0">
                    <div className="nm">{b.library?.name || 'Library'}</div>
                    <div className="bk-detail">{fmtDate(b.booking_date)} · {(b.slot_start||'').slice(0,5)}–{(b.slot_end||'').slice(0,5)} · ₹{b.total_amount}</div>
                  </div>
                  <div className="action-row">
                    {canReview && <button className="btn-sm" style={{ background:'rgba(196,134,10,.08)', color:'var(--yellow)', border:'1px solid rgba(196,134,10,.2)', borderRadius:8 }} onClick={() => set({ reviewModal:{ library_id:b.library?.id, lib_name:b.library?.name }, reviewRating:0, reviewText:'' })}>★ Review</button>}
                    {canCancel && <button className="btn-danger btn-sm" onClick={async () => { if (!confirm('Cancel this booking?')) return; await cancelBooking(b.id) }}>Cancel</button>}
                    <span className="spill" style={{ background: col+'22', color: col }}>{label}</span>
                  </div>
                </div>
              )
            })}
      </div>
    </div>
  )
}

// ── PROFILE ───────────────────────────────────────────────────
export function Profile() {
  const { S, set, doLogout } = useApp()
  const u = S.profile
  if (!u) return <div className="container"><p>Please sign in first.</p></div>
  return (
    <div className="container-sm">
      <h1 className="page-title text-34">Account Settings</h1>
      <p className="page-sub">Manage your profile and preferences</p>
      <div className="card p-32 mb-18">
        <div className="flex items-center gap-18 mb-28 pb-24 border-b flex-wrap">
          <div className="avatar avatar-lg">{initials(u.full_name)}</div>
          <div>
            <div className="font-serif text-26">{u.full_name}</div>
            <div className="c-muted text-md mt-4">{u.email}</div>
            <span className="spill pill-red mt-8 inline-block">{u.role === 'owner' ? '🏛️ Library Owner' : '📚 Student'}</span>
          </div>
        </div>
        <form onSubmit={ev => { ev.preventDefault(); if (DEMO_MODE) { set({ profile: { ...u, full_name: ev.target.elements[0].value } }); toast('✅ Name updated!') } }}>
          <div className="form-group"><label>Full Name</label><input className="form-input" defaultValue={u.full_name} required /></div>
          <button className="btn-red btn-sm" type="submit">Save Changes</button>
        </form>
      </div>
      <div className="card p-32" style={{ borderColor: 'rgba(200,54,74,.25)' }}>
        <h3 className="font-serif mb-8 text-22">Sign Out</h3>
        <p className="c-muted text-md mb-20">You will be signed out from all active sessions.</p>
        <button className="btn-danger" style={{ padding: '11px 22px', fontSize: 14 }} onClick={doLogout}>Sign Out</button>
      </div>
    </div>
  )
}

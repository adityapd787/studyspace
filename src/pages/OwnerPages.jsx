import { useState, useRef, useEffect, useCallback } from 'react'
import { useApp } from '../lib/AppContext'
import { DEMO_MODE, sb } from '../lib/supabase'
import { LAYOUT_PRESETS, AMENITY_PRESETS } from '../lib/constants'
import { e, fmtDate, initials, toast, AmenityInput } from '../components/shared'
import { ownerStats, OWNER_TABS, SHIFT_OPTS, TAG_COLORS, OWNER_SEAT_LEGEND, revSummary } from '../lib/ui-config'

function cloneFloorsConfig(floorsConfig) {
  if (!Array.isArray(floorsConfig) || floorsConfig.length === 0) return null
  return floorsConfig.map((fl, fi) => ({
    ...fl,
    id: fl?.id || `f${fi + 1}`,
    name: fl?.name || `Floor ${fi + 1}`,
    rooms: Array.isArray(fl?.rooms)
      ? fl.rooms.map((rm, ri) => ({
          ...rm,
          id: rm?.id || `r${fi + 1}-${ri + 1}`,
          name: rm?.name || `Room ${ri + 1}`,
          seats: Array.isArray(rm?.seats) ? rm.seats.map(s => ({ ...s })) : [],
        }))
      : [{ id: `r${fi + 1}-1`, name: 'Main Hall', seats: [], cols: 20, rows: 14, px: 5, py: 10, pw: 38, ph: 42 }],
  }))
}

// ── OWNER DASHBOARD ────────────────────────────────────────────
export function OwnerDash() {
  const { S, set, go, fetchOwnerData, sendAnnouncement } = useApp()
  if (S.loading) return <div className="container"><div className="loader"><div className="spinner" /><p>Loading dashboard...</p></div></div>
  if (!S.ownerLibrary) return <EditLibrary />

  const lib = S.ownerLibrary, bks = S.ownerBookings, td = new Date().toISOString().split('T')[0]
  const todayBks = bks.filter(b => b.booking_date === td && b.status === 'confirmed')
  const todayRev = todayBks.reduce((a, b) => a + b.total_amount, 0)
  const totalRev = bks.filter(b => b.status === 'confirmed').reduce((a, b) => a + b.total_amount, 0)
  const bookedIds = todayBks.flatMap(b => b.seat_ids || [])
  const occPct = S.ownerSeats.length ? Math.round((bookedIds.length / S.ownerSeats.length) * 100) : 0
  const last7 = [...Array(7)].map((_, i) => {
    const d = new Date(); d.setDate(d.getDate() - 6 + i)
    const ds = d.toISOString().split('T')[0]
    const amt = bks.filter(b => b.booking_date === ds && b.status === 'confirmed').reduce((a, b) => a + b.total_amount, 0)
    return { ds, day: d.toLocaleDateString('en-IN', { weekday: 'short' }), amt, isToday: ds === td }
  })
  const maxRev = Math.max(...last7.map(d => d.amt), 1)
  const weekTotal = last7.reduce((a, d) => a + d.amt, 0)

  const rows = [...new Set(S.ownerSeats.map(s => s.row_label))].sort()
  const seatMapHTML = rows.map(row => {
    const rs = S.ownerSeats.filter(s => s.row_label === row).sort((a, b) => a.seat_number - b.seat_number)
    return (
      <div key={row} className="flex items-center gap-4 mb-6">
        <span style={{ color: 'var(--muted)', fontSize: 12, width: 20, textAlign: 'center', flexShrink: 0, fontWeight: 700 }}>{row}</span>
        {rs.map(s => {
          const isB = bookedIds.includes(s.id), isM = s.status === 'maintenance'
          return <div key={s.id} style={{ width: 30, height: 30, borderRadius: 6, fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: isM ? '#e8d8c8' : isB ? '#FDDDD8' : '#DCF5EE', color: isM ? '#7a5040' : isB ? '#9A2020' : '#0A6B52' }} title={`${row}${s.seat_number}: ${isM?'Maintenance':isB?'Booked':'Free'}`}>{s.seat_number}</div>
        })}
      </div>
    )
  })

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1 className="font-serif text-36 mb-6">Library Dashboard</h1>
          <p className="c-muted">{lib.name}</p>
        </div>
        <div className="flex gap-8 flex-wrap">
          <button className="btn-ghost-sm" onClick={() => {
            // Only init fresh if no saved floors exist
            const lib2 = S.ownerLibrary
            const hasFloors = S.gridFloors && S.gridFloors.length > 0
            const restored = cloneFloorsConfig(lib2?.floors_config)
            if (!hasFloors && restored) {
              set({ gridFloors: restored, activeFloor: 0, activeRoom: 0 })
            }
            set({ editorPreset: null, gridDrag: null })
            go('seat-editor')
          }}>🪑 Seat Editor</button>
          <button className="nav-pill" onClick={() => {
            set({
              addLibAmenities: [...(lib.amenities || [])],
              addLibPhotos: lib.photos?.length ? [...lib.photos] : ['','',''],
              addLibOpen: lib.hours_open || '06:00',
              addLibClose: lib.hours_close || '22:00',
              addLibShift: lib.shift_durations || (lib.shift_duration ? [lib.shift_duration] : [3]),
            })
            go('edit-library')
          }}>✏ Edit Library</button>
        </div>
      </div>

      <div className="o-stats">
        {[
          ['💰', '₹'+todayRev.toLocaleString('en-IN'), 'var(--red)', "Today's Revenue", todayBks.length+' bookings today'],
          ['📅', bks.filter(b=>b.status==='confirmed').length, 'var(--green)', 'Confirmed Bookings', bks.filter(b=>b.status==='cancelled').length+' cancelled'],
          ['💺', occPct+'%', 'var(--blue)', "Today's Occupancy", bookedIds.length+' / '+S.ownerSeats.length+' seats'],
          ['📈', '₹'+totalRev.toLocaleString('en-IN'), 'var(--purple)', 'Total Revenue', 'All-time'],
        ].map(([ico,val,col,lbl,sub]) => (
          <div key={lbl} className="card ostat">
            <div className="tr"><span className="text-26">{ico}</span></div>
            <div className="val" style={{ color: col }}>{val}</div>
            <div className="lbl">{lbl}</div>
            <div style={{ fontSize: 12, color: 'var(--mutedl)', marginTop: 3 }}>{sub}</div>
          </div>
        ))}
      </div>

      <div className="tabs">
        {[['bookings','📋 Bookings'],['seatmap','🪑 Seat Map'],['revenue','📊 Revenue'],['announce','📢 Announce']].map(([id,lbl]) => (
          <button key={id} className={`tab ${S.ownerTab===id?'on':''}`} onClick={() => set({ ownerTab: id })}>{lbl}</button>
        ))}
      </div>

      {S.ownerTab === 'bookings' && (
        <div className="card p-26">
          <div className="sec-hd"><h2>All Bookings</h2><span className="spill pill-green">{bks.filter(b=>b.status==='confirmed').length} confirmed</span></div>
          {!bks.length ? <div className="empty-s"><span className="hero-emoji" style={{ fontSize: 52, marginBottom: 14 }}>📭</span><p>No bookings yet.</p></div>
            : bks.slice(0, 20).map(b => {
              const isT = b.booking_date === td
              const col = b.status === 'confirmed' ? (isT ? 'var(--green)' : b.booking_date > td ? 'var(--blue)' : 'var(--mutedl)') : b.status === 'cancelled' ? 'var(--red)' : 'var(--mutedl)'
              const lbl = b.status === 'cancelled' ? 'Cancelled' : isT && b.status === 'confirmed' ? 'Active' : b.booking_date > td ? 'Upcoming' : 'Completed'
              return (
                <div key={b.id} className="bk-row">
                  <div className="flex-1"><div className="nm">{b.student?.full_name || 'Student'}</div><div className="mt">{fmtDate(b.booking_date)} · {(b.slot_start||'').slice(0,5)}–{(b.slot_end||'').slice(0,5)} · ₹{b.total_amount}</div></div>
                  <span className="spill" style={{ background: col+'22', color: col }}>{lbl}</span>
                </div>
              )
            })}
        </div>
      )}

      {S.ownerTab === 'seatmap' && (
        <div className="card p-26">
          <div className="sec-hd"><h2>Today's Seat Map</h2></div>
          <div className="entrance">── ENTRANCE / FRONT ──</div>
          <div className="overflow-x-auto">{seatMapHTML}</div>
        </div>
      )}

      {S.ownerTab === 'revenue' && (
        <div className="card p-26">
          <div className="sec-hd"><h2>Revenue — Last 7 Days</h2></div>
          <div className="bar-chart">
            {last7.map(d => <div key={d.ds} className={`bar ${d.isToday?'today':''}`} style={{ height: Math.max(6, Math.round((d.amt/maxRev)*88)) }} title={`${d.day}: ₹${d.amt.toLocaleString('en-IN')}`} />)}
          </div>
          <div className="bar-labels">
            {last7.map(d => <div key={d.ds} className="bar-lbl" style={{ color: d.isToday?'var(--text)':'var(--mutedl)' }}>{d.day}<br /><span style={{ color: d.isToday?'var(--red)':'var(--muted)', fontSize: 10 }}>{d.amt?'₹'+d.amt.toLocaleString('en-IN'):'—'}</span></div>)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--borders)' }}>
            {[['₹'+weekTotal.toLocaleString('en-IN'),'This Week'],['₹'+Math.round(weekTotal/7).toLocaleString('en-IN'),'Daily Avg'],['₹'+totalRev.toLocaleString('en-IN'),'All Time']].map(([v,l]) => (
              <div key={l} className="text-center"><div className="font-serif text-26 c-red">{v}</div><div style={{ fontSize: 12, color: 'var(--mutedl)', marginTop: 4 }}>{l}</div></div>
            ))}
          </div>
        </div>
      )}

      {S.ownerTab === 'announce' && (
        <AnnouncementsPanel lib={lib} sendAnnouncement={sendAnnouncement} />
      )}
    </div>
  )
}

// ── ANNOUNCEMENTS PANEL ────────────────────────────────────────
function AnnouncementsPanel({ lib, sendAnnouncement }) {
  const [msg, setMsg] = useState('')
  const [sent, setSent] = useState([])
  const [busy, setBusy] = useState(false)

  const handle = async () => {
    if (!msg.trim()) return
    setBusy(true)
    const ok = await sendAnnouncement(msg)
    if (ok) {
      setSent(prev => [{ id: Date.now(), message: msg.trim(), created_at: new Date().toISOString() }, ...prev])
      setMsg('')
      toast('✅ Announcement sent to all active subscribers!')
    } else {
      toast('Failed to send announcement', 'error')
    }
    setBusy(false)
  }

  return (
    <div className="card p-26">
      <div className="sec-hd">
        <h2>Send Announcement</h2>
        <span className="spill pill-green">{lib?.name}</span>
      </div>
      <p className="c-muted text-md mb-18" style={{ lineHeight:1.65 }}>
        Send a message to all students with an active subscription at your library. Use this for schedule changes, maintenance notices, or special offers.
      </p>
      <div className="form-group">
        <label>Message</label>
        <textarea
          placeholder="e.g. Library will remain closed on Sunday 27th April for maintenance. We apologise for the inconvenience."
          value={msg}
          onChange={ev => setMsg(ev.target.value)}
          style={{ minHeight: 100 }}
        />
        <p className="hint-text">{msg.length}/500 characters</p>
      </div>
      <button className="btn-red" disabled={busy || !msg.trim() || msg.length > 500} onClick={handle}>
        {busy ? 'Sending...' : '📢 Send to Subscribers'}
      </button>

      {sent.length > 0 && (
        <div className="mt-28">
          <p className="section-label">Sent this session</p>
          {sent.map(a => (
            <div key={a.id} style={{ padding:'12px 0', borderBottom:'1px solid var(--borders)' }}>
              <p className="text-md c-muted lh-16 mb-4">{a.message}</p>
              <span className="text-sm c-hint">{new Date(a.created_at).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── EDIT / ADD LIBRARY ─────────────────────────────────────────
export function EditLibrary() {
  const { S, set, go, saveLibrary } = useApp()
  const lib = S.ownerLibrary; const isEdit = !!lib
  const SHIFTS = [{h:3,lbl:'3 hrs'},{h:4,lbl:'4 hrs'},{h:6,lbl:'6 hrs'},{h:12,lbl:'12 hrs'},{h:0,lbl:'Full Day'}]
  const TAG_COLORS = { PREMIUM:'#C8364A', STANDARD:'#4A90D9', BUDGET:'#2A9D8F' }

  // ── Controlled form state ──────────────────────────────────────
  const [name,     setName]     = useState(lib?.name || '')
  const [tag,      setTag]      = useState(lib?.tag  || 'STANDARD')
  const [location, setLocation] = useState(lib?.location || '')
  const [desc,     setDesc]     = useState(lib?.description || '')
  const [mapsUrl,  setMapsUrl]  = useState(lib?.maps_url || '')
  const [priceHr,  setPriceHr]  = useState(lib?.price_per_hour || '')
  const [priceM,   setPriceM]   = useState(lib?.price_monthly  || '')
  const [price3,   setPrice3]   = useState(lib?.price_3monthly || '')
  const [price6,   setPrice6]   = useState(lib?.price_6monthly || '')
  const [priceA,   setPriceA]   = useState(lib?.price_annual   || '')
  const [openT,    setOpenT]    = useState(S.addLibOpen  || lib?.hours_open  || '06:00')
  const [closeT,   setCloseT]   = useState(S.addLibClose || lib?.hours_close || '22:00')
  const [shifts,   setShifts]   = useState(Array.isArray(S.addLibShift) ? S.addLibShift : (lib?.shift_durations || [3]))
  const [amenities,setAmenities]= useState(S.addLibAmenities.length ? S.addLibAmenities : (lib?.amenities || []))
  const [photos,   setPhotos]   = useState(() => {
    const src = S.addLibPhotos?.some(p => p) ? S.addLibPhotos : (lib?.photos || [])
    return src.length ? src : ['']
  })
  const [busy,     setBusy]     = useState(false)
  const [uploadingIdx, setUploadingIdx] = useState(null)

  const editorSeatCount = (S.gridFloors || []).reduce((a, fl) => a + fl.rooms.reduce((b, rm) => b + rm.seats.length, 0), 0)
  const totalSeats = editorSeatCount > 0 ? editorSeatCount : (parseInt(lib?.total_seats) || 0)

  const toggleShift = h => setShifts(prev => {
    const has = prev.includes(h)
    if (has) return prev.length > 1 ? prev.filter(x => x !== h) : prev
    return [...prev, h]
  })

  // ── Photo from device / camera ────────────────────────────────
  const handlePhotoFile = async (file, idx) => {
    if (!file) return
    setUploadingIdx(idx)
    if (DEMO_MODE) {
      // Demo: use object URL (temporary, shown until refresh)
      const url = URL.createObjectURL(file)
      setPhotos(prev => { const p=[...prev]; p[idx]=url; return p })
    } else {
      // Production: upload to Supabase Storage
      try {
        const ext = file.name.split('.').pop()
        const path = `library-photos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { data, error } = await sb.storage.from('library-photos').upload(path, file)
        if (error) { toast('Upload failed: ' + error.message, 'error'); setUploadingIdx(null); return }
        const { data: { publicUrl } } = sb.storage.from('library-photos').getPublicUrl(path)
        setPhotos(prev => { const p=[...prev]; p[idx]=publicUrl; return p })
      } catch (err) {
        toast('Upload failed', 'error')
      }
    }
    setUploadingIdx(null)
  }

  // ── Submit ─────────────────────────────────────────────────────
  const handleSubmit = async ev => {
    ev.preventDefault()
    if (!name.trim())     { toast('Library name is required', 'error'); return }
    if (!location.trim()) { toast('Location is required', 'error'); return }
    if (!priceHr)         { toast('Price per shift is required', 'error'); return }
    if (!openT || !closeT){ toast('Opening hours are required', 'error'); return }
    if (!desc.trim())     { toast('Description is required', 'error'); return }
    setBusy(true)
    const data = {
      name: name.trim(), tag, tag_color: TAG_COLORS[tag],
      price_per_hour:  parseInt(priceHr) || 0,
      price_monthly:   parseInt(priceM)  || null,
      price_3monthly:  parseInt(price3)  || null,
      price_6monthly:  parseInt(price6)  || null,
      price_annual:    parseInt(priceA)  || null,
      location: location.trim(),
      total_seats: totalSeats,
      hours: openT + ' – ' + closeT,
      hours_open: openT, hours_close: closeT,
      shift_durations: shifts, shift_duration: shifts[0] || 3,
      description: desc.trim(),
      maps_url: mapsUrl.trim() || null,
      amenities,
      photos: photos.filter(u => u?.trim()),
    }
    const res = await saveLibrary(data)
    if (res?.ok) {
      set({ addLibAmenities: [], addLibPhotos: [''] })
      toast('✅ Library saved!')
      go('owner-dash')
    } else {
      toast('Save failed: ' + (res?.error || 'check your connection'), 'error')
    }
    setBusy(false)
  }

  return (
    <div className="container-sm">
      {isEdit && <button className="back-link" onClick={() => go('owner-dash')}>← Back to Dashboard</button>}
      <h1 className="font-serif text-34 mb-6">{isEdit ? 'Edit Library' : 'List Your Library'}</h1>
      <p className="c-muted mb-36">{isEdit ? 'Update your library details and pricing.' : 'Add your space to StudySpace and start receiving bookings.'}</p>

      <div className="card p-32">
        <form onSubmit={handleSubmit} noValidate>

          {/* ── Basic Info ──────────────────────────────────────── */}
          <div className="field-section">
            <h3>Basic Information</h3>
            <div className="form-group">
              <label>Library Name *</label>
              <input className="form-input" placeholder="e.g. The Scholar's Den" value={name} onChange={ev => setName(ev.target.value)} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Category *</label>
                <select value={tag} onChange={ev => setTag(ev.target.value)}>
                  {['BUDGET','STANDARD','PREMIUM'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Total Seats</label>
                <input className="form-input" type="number" min="0" placeholder="Auto from Seat Editor"
                  value={totalSeats || ''} readOnly={editorSeatCount > 0}
                  style={{ background: editorSeatCount > 0 ? 'rgba(26,168,130,.06)' : 'var(--surface)' }} />
                <p className="form-hint">{editorSeatCount > 0 ? '✅ Auto-synced from Seat Editor' : 'Auto-synced when you save a seat layout.'}</p>
              </div>
            </div>
            <div className="form-group">
              <label>Location / Area *</label>
              <input className="form-input" placeholder="e.g. Hazratganj, Lucknow" value={location} onChange={ev => setLocation(ev.target.value)} />
            </div>

            {/* Time pickers */}
            <div className="form-group">
              <label>Opening Hours *</label>
              <div className="time-picker-wrap">
                <div className="time-input-group"><label>Opens at</label><input type="time" value={openT} onChange={ev => setOpenT(ev.target.value)} /></div>
                <div className="time-input-group"><label>Closes at</label><input type="time" value={closeT} onChange={ev => setCloseT(ev.target.value)} /></div>
              </div>
              <div className="hours-preview">🕐 {openT} – {closeT}</div>
            </div>

            {/* Shift selector */}
            <div className="form-group">
              <label>Shift Durations *</label>
              <p className="form-hint mb-10">Select one or more. Students will see all selected options when booking.</p>
              <div className="shift-opts">
                {SHIFTS.map(s => (
                  <div key={s.h} className={`shift-opt ${shifts.includes(s.h) ? 'on' : ''}`} onClick={() => toggleShift(s.h)}>
                    <div className="sh-dur">{shifts.includes(s.h) ? '✓' : ''}</div>
                    <div className="sh-lbl">{s.lbl}</div>
                  </div>
                ))}
              </div>
              <ShiftTimeline open={openT} close={closeT} shifts={shifts} />
            </div>

            <div className="form-group">
              <label>Google Maps Link <span style={{ fontWeight:400, textTransform:'none', letterSpacing:0 }}>(optional)</span></label>
              <input className="form-input" type="url" placeholder="https://maps.google.com/?q=..." value={mapsUrl} onChange={ev => setMapsUrl(ev.target.value)} />
            </div>
          </div>

          {/* ── Description ─────────────────────────────────────── */}
          <div className="field-section">
            <h3>Description</h3>
            <div className="form-group">
              <label>About Your Space *</label>
              <textarea placeholder="Describe the vibe, key facilities, and who your library is built for..." value={desc} onChange={ev => setDesc(ev.target.value)} />
              <p className="form-hint">2–4 sentences. Good descriptions consistently get more bookings.</p>
            </div>
          </div>

          {/* ── Pricing ─────────────────────────────────────────── */}
          <div className="field-section">
            <h3>Pricing</h3>
            <p className="c-muted text-md mb-20">Set a per-shift price first, then optionally offer subscription plans.</p>
            <div className="form-row">
              <div className="form-group">
                <label>Price per Shift (₹) *</label>
                <input className="form-input" type="number" min="1" placeholder="e.g. 60" value={priceHr} onChange={ev => setPriceHr(ev.target.value)} />
                <p className="form-hint">Charged per shift booking.</p>
              </div>
              <div className="form-group">
                <label>Monthly Plan (₹)</label>
                <input className="form-input" type="number" min="1" placeholder="e.g. 1800" value={priceM} onChange={ev => setPriceM(ev.target.value)} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>3-Month Plan (₹)</label>
                <input className="form-input" type="number" min="1" placeholder="e.g. 4999" value={price3} onChange={ev => setPrice3(ev.target.value)} />
              </div>
              <div className="form-group">
                <label>6-Month Plan (₹)</label>
                <input className="form-input" type="number" min="1" placeholder="e.g. 8999" value={price6} onChange={ev => setPrice6(ev.target.value)} />
              </div>
            </div>
            <div className="form-group" style={{ maxWidth:'calc(50% - 7px)' }}>
              <label>Annual Plan (₹)</label>
              <input className="form-input" type="number" min="1" placeholder="e.g. 15999" value={priceA} onChange={ev => setPriceA(ev.target.value)} />
            </div>
          </div>

          {/* ── Photos ──────────────────────────────────────────── */}
          <div className="field-section">
            <h3>Photos <span className="text-md c-muted" style={{ fontWeight:400 }}>(optional — up to 6)</span></h3>
            <p className="form-hint mb-16">Upload from your device, take a photo directly, or paste a URL.</p>

            {photos.map((url, i) => (
              <div key={i} className="photo-row">
                {/* Preview */}
                {url && url.startsWith('blob:') || (url && url.startsWith('http')) ? (
                  <img className="photo-preview" src={url} alt="" onError={ev => ev.target.style.opacity='.15'} />
                ) : (
                  <div className="photo-preview" style={{ display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, color:'var(--muted)' }}>📷</div>
                )}

                {/* URL input */}
                <input className="form-input" placeholder="Paste URL or upload below →"
                  value={url.startsWith('blob:') ? '(uploaded file)' : url}
                  readOnly={url.startsWith('blob:')}
                  onChange={ev => { const p=[...photos]; p[i]=ev.target.value; setPhotos(p) }}
                  style={{ flex:1 }} />

                {/* Upload from device button */}
                <label title="Upload from device or camera" style={{
                  width:38, height:38, borderRadius:8, background:'var(--surface)', border:'1px solid var(--border)',
                  display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0, fontSize:16
                }}>
                  {uploadingIdx === i ? '⏳' : '📁'}
                  <input type="file" accept="image/*" style={{ display:'none' }} onChange={ev => handlePhotoFile(ev.target.files[0], i)} />
                </label>

                {/* Camera button (mobile — triggers camera directly) */}
                <label title="Take a photo" style={{
                  width:38, height:38, borderRadius:8, background:'var(--surface)', border:'1px solid var(--border)',
                  display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0, fontSize:16
                }}>
                  📷
                  <input type="file" accept="image/*" capture="environment" style={{ display:'none' }} onChange={ev => handlePhotoFile(ev.target.files[0], i)} />
                </label>

                {/* Remove button */}
                <button type="button" className="btn-danger"
                  style={{ width:36, height:36, padding:0, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}
                  onClick={() => setPhotos(photos.filter((_, j) => j !== i))}>✕</button>
              </div>
            ))}

            {photos.length < 6 && (
              <button type="button" className="btn-ghost-sm mt-8" onClick={() => setPhotos([...photos, ''])}>+ Add Another Photo</button>
            )}
            {DEMO_MODE && <p className="form-hint mt-8">📝 Demo mode: uploaded files are temporary (lost on refresh). Connect Supabase Storage for permanent uploads.</p>}
          </div>

          {/* ── Amenities ───────────────────────────────────────── */}
          <div className="field-section">
            <h3>Amenities</h3>
            <AmenityInput amenities={amenities} setAmenities={setAmenities} />
          </div>

          <button className="btn-red btn-block" type="submit" disabled={busy}>
            {busy ? 'Saving...' : isEdit ? 'Save Changes' : 'List My Library →'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── SHIFT TIMELINE ─────────────────────────────────────────────
function ShiftTimeline({ open, close, shifts }) {
  const [oh, om] = open.split(':').map(Number)
  const [ch, cm] = close.split(':').map(Number)
  let openM = oh*60+(om||0), closeM = ch*60+(cm||0)
  if (closeM <= openM) closeM += 24*60
  const totalM = closeM - openM
  if (!shifts.length || totalM <= 0) return null
  const fmtM = m => { m=m%1440; const h=Math.floor(m/60)%24,mm=m%60; return (h<10?'0':'')+h+':'+(mm<10?'0':'')+mm }
  const PALETTE = ['#C8364A','#2A72B5','#1AA882','#C4860A','#7B3FA0']
  const tickCount = Math.min(Math.floor(totalM/60)+1, 13)
  return (
    <div style={{ marginTop:18 }}>
      <div className="flex items-center gap-8 mb-8">
        <span className="text-xs fw-700 c-muted uppercase tracking-wide">Shift Timeline</span>
        <span className="text-sm c-hint">{open} – {close}</span>
      </div>
      <div className="flex items-center gap-10 mb-4">
        <div style={{ width:52, flexShrink:0 }} />
        <div style={{ flex:1, position:'relative', height:14 }}>
          {Array.from({length:tickCount},(_,t) => {
            const pct=(t*60/totalM)*100; if(pct>100) return null
            const hh=(openM+t*60)%1440
            const lbl=(Math.floor(hh/60)<10?'0':'')+Math.floor(hh/60)+':'+(hh%60<10?'0':'')+(hh%60)
            return <div key={t} style={{ position:'absolute',left:pct+'%',transform:'translateX(-50%)',fontSize:9,color:'var(--muted)',fontWeight:600,whiteSpace:'nowrap',top:0 }}>{lbl}</div>
          })}
        </div>
        <div style={{ width:32,flexShrink:0 }} />
      </div>
      {[...shifts].sort((a,b)=>a-b).map((dur,di) => {
        const color=PALETTE[di%PALETTE.length]
        const segM=dur===0?totalM:dur*60
        const segCount=dur===0?1:Math.floor(totalM/segM)
        const remPct=((totalM-segCount*segM)/totalM*100).toFixed(2)
        return (
          <div key={dur} className="flex items-center gap-10 mb-8">
            <div style={{ width:52,flexShrink:0,textAlign:'right',fontSize:11,fontWeight:700,color }}>{dur===0?'Full Day':dur+'h'}</div>
            <div style={{ flex:1,position:'relative',height:28,background:'var(--surface)',borderRadius:6,border:'1px solid var(--border)',overflow:'hidden' }}>
              {Array.from({length:segCount},(_,i) => {
                const left=(i*segM/totalM*100).toFixed(2)
                const width=(segM/totalM*100).toFixed(2)
                const sM=openM+i*segM,eM=sM+segM
                return <div key={i} style={{ position:'absolute',left:left+'%',width:`calc(${width}% - 2px)`,height:'100%',background:color,borderRadius:5,opacity:.82,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden' }} title={`${fmtM(sM)} – ${fmtM(eM)}`}>
                  <span style={{ fontSize:9,fontWeight:700,color:'white',opacity:.9,whiteSpace:'nowrap',padding:'0 3px' }}>{fmtM(sM)}–{fmtM(eM)}</span>
                </div>
              })}
              {+remPct>0 && <div style={{ position:'absolute',right:0,width:remPct+'%',height:'100%',background:'rgba(0,0,0,.06)',borderRadius:5,border:'1.5px dashed var(--border)' }} />}
            </div>
            <div style={{ width:32,flexShrink:0,fontSize:10,color:'var(--mutedl)' }}>×{segCount}</div>
          </div>
        )
      })}
    </div>
  )
}


// ── SEAT EDITOR ─────────────────────────────────────────────
export function SeatEditor() {
  const { S, set, go, saveLibrary } = useApp()
  const lib = S.ownerLibrary
  const [, repaint] = useState(0)
  const rf = () => repaint(n => n+1)
  const gridRef = useRef(null)
  const dragRef = useRef(null) // {si, startR, startC}
  const activeDrag = useRef(false)

  // ── Init floors — load saved or create default ───────────
  useEffect(() => {
    if (!S.gridFloors || !S.gridFloors.length) {
      const restored = cloneFloorsConfig(lib?.floors_config)
      if (restored) {
        set({ gridFloors: restored, activeFloor: 0, activeRoom: 0 })
      } else {
        // Brand new library — start with one floor/room
        set({ gridFloors:[{id:'f1',name:'Ground Floor',rooms:[{id:'r1',name:'Main Hall',seats:[],cols:20,rows:14,px:5,py:10,pw:38,ph:42}]}],
              activeFloor:0, activeRoom:0, seatNaming:'alpha-num' })
      }
    }
  }, [])

  useEffect(() => {
    if (typeof document === 'undefined') return
    const body = document.body
    const html = document.documentElement
    if (S.gridDrag !== null) {
      body.style.overflow = 'hidden'
      body.style.touchAction = 'none'
      body.style.overscrollBehavior = 'none'
      html.style.overflow = 'hidden'
      html.style.overscrollBehavior = 'none'
    } else {
      body.style.overflow = ''
      body.style.touchAction = ''
      body.style.overscrollBehavior = ''
      html.style.overflow = ''
      html.style.overscrollBehavior = ''
    }
    return () => {
      body.style.overflow = ''
      body.style.touchAction = ''
      body.style.overscrollBehavior = ''
      html.style.overflow = ''
      html.style.overscrollBehavior = ''
    }
  }, [S.gridDrag])

  // fl/room/seats defined AFTER render guard to avoid null crash on first render

  // ── Auto-label ───────────────────────────────────────────
  const autoLabel = (arr, mode) => {
    const m = mode || S.seatNaming || 'alpha-num'
    if (m === 'sequential') {
      arr.slice().sort((a,b)=>a.r!==b.r?a.r-b.r:a.c-b.c).forEach((s,i)=>{ s.label=String(i+1) })
      return
    }
    if (m === 'col-alpha') {
      const cols2=[...new Set(arr.map(s=>s.c))].sort((a,b)=>a-b)
      const rows2=[...new Set(arr.map(s=>s.r))].sort((a,b)=>a-b)
      const cl={};cols2.forEach((c,i)=>{ cl[c]=i<26?String.fromCharCode(65+i):'C'+(i+1) })
      const rl={};rows2.forEach((r,i)=>{ rl[r]=i+1 })
      arr.forEach(s=>{ s.label=(cl[s.c]||'?')+(rl[s.r]||'?') })
      return
    }
    // alpha-num
    const byRow={}; arr.forEach(s=>{ (byRow[s.r]=byRow[s.r]||[]).push(s) })
    Object.keys(byRow).sort((a,b)=>+a-+b).forEach((r,ri)=>{
      const rl=ri<26?String.fromCharCode(65+ri):'R'+(ri+1)
      byRow[r].sort((a,b)=>a.c-b.c).forEach((s,ci)=>{ s.label=rl+(ci+1) })
    })
  }

  // ── Floor & Room management ──────────────────────────────
  const addFloor = () => {
    const n=(S.gridFloors||[]).length+1
    const floors=[...(S.gridFloors||[]),{id:'f'+Date.now(),name:'Floor '+n,rooms:[{id:'r'+Date.now(),name:'Room 1',seats:[],cols:20,rows:14,px:5,py:10,pw:38,ph:42}]}]
    set({gridFloors:floors,activeFloor:floors.length-1,activeRoom:0}); rf()
  }
  const removeFloor = fi => {
    if((S.gridFloors||[]).length<=1){toast('Need at least one floor','error');return}
    const floors=(S.gridFloors||[]).filter((_,i)=>i!==fi)
    set({gridFloors:floors,activeFloor:Math.min(S.activeFloor,floors.length-1),activeRoom:0}); rf()
  }
  const renameFloor = (fi,name) => {
    const floors=[...(S.gridFloors||[])]; floors[fi]={...floors[fi],name}; set({gridFloors:floors}); rf()
  }
  const addRoom = () => {
    const fl2=S.gridFloors?.[S.activeFloor]; if(!fl2)return
    const fl=fl2
    const rooms=[...fl.rooms,{id:'r'+Date.now(),name:'Room '+(fl.rooms.length+1),seats:[],cols:20,rows:14,
      px:5+(fl.rooms.length%3)*32,py:10+(Math.floor(fl.rooms.length/3)*44),pw:28,ph:36}]
    const floors=[...(S.gridFloors||[])]; floors[S.activeFloor]={...fl,rooms}
    set({gridFloors:floors,activeRoom:rooms.length-1}); rf()
  }
  const removeRoom = ri => {
    const fl=S.gridFloors?.[S.activeFloor]; if(!fl||fl.rooms.length<=1){toast('Need at least one room','error');return}
    const rooms=fl.rooms.filter((_,i)=>i!==ri)
    const floors=[...(S.gridFloors||[])]; floors[S.activeFloor]={...fl,rooms}
    set({gridFloors:floors,activeRoom:Math.min(S.activeRoom,rooms.length-1)}); rf()
  }
  const renameRoom = (ri,name) => {
    const fl=S.gridFloors?.[S.activeFloor]; if(!fl)return
    const rooms=[...fl.rooms]; rooms[ri]={...rooms[ri],name}
    const floors=[...(S.gridFloors||[])]; floors[S.activeFloor]={...fl,rooms}
    set({gridFloors:floors}); rf()
  }

  // ── Grid cell click (add/erase) ──────────────────────────
  const handleCell = (r,c) => {
    if(!room||S.gridTool==='move')return
    const si=seatAt[r+','+c], arr=[...room.seats]
    if(S.gridTool==='add'){
      if(si!==undefined) arr[si]={...arr[si],status:arr[si].status==='maintenance'?'available':'maintenance'}
      else arr.push({r,c,label:'?',status:'available'})
      autoLabel(arr); room.seats=arr; rf()
    } else if(S.gridTool==='erase'){
      if(si!==undefined){arr.splice(si,1);autoLabel(arr);room.seats=arr;rf()}
    }
  }

  // ── Drag start (mouse + touch) ───────────────────────────
  const onDragStart = (ev,r,c) => {
    if(S.gridTool!=='move')return
    const si=seatAt[r+','+c]
    if(si===undefined)return
    ev.preventDefault()
    activeDrag.current = true
    dragRef.current={si}
    set({gridDrag:si}); rf()
  }

  // Get grid cell from pointer position
  const cellFromPoint = (clientX,clientY) => {
    const grid=gridRef.current; if(!grid)return null
    const rect=grid.getBoundingClientRect()
    const cellW=rect.width/cols, cellH=rect.height/rows
    const c=Math.floor((clientX-rect.left)/cellW)
    const r=Math.floor((clientY-rect.top)/cellH)
    if(r<0||r>=rows||c<0||c>=cols)return null
    return{r,c}
  }

  // ── Drop ─────────────────────────────────────────────────
  const dropSeat = (clientX, clientY) => {
    if (!activeDrag.current || !dragRef.current || !room) return
    const cell = cellFromPoint(clientX, clientY)
    if (cell) {
      const {si} = dragRef.current
      const occ = room.seats.findIndex((s,i)=>i!==si&&s.r===cell.r&&s.c===cell.c)
      if (occ === -1) { room.seats[si]={...room.seats[si],r:cell.r,c:cell.c}; autoLabel(room.seats) }
    }
    dragRef.current = null; activeDrag.current = false
    set({gridDrag:null}); rf()
  }

  // Mouse handlers
  const onMouseDown = (ev, r, c) => { ev.preventDefault(); onDragStart(ev, r, c) }
  const onMouseUp   = (ev)       => { dropSeat(ev.clientX, ev.clientY) }

  // Touch handlers
  const onTouchStart = (ev, r, c) => { onDragStart(ev, r, c) }
  const onTouchMove  = (ev)       => { if (activeDrag.current) ev.preventDefault() }
  const onTouchEnd   = (ev)       => {
    const t = ev.changedTouches[0]
    dropSeat(t.clientX, t.clientY)
  }

  // ── Save ─────────────────────────────────────────────────
  const handleSave = async () => {
    if(!lib)return
    const floors_config=(S.gridFloors||[]).map(f=>({id:f.id,name:f.name,
      rooms:f.rooms.map(rm=>({id:rm.id,name:rm.name,cols:rm.cols||20,rows:rm.rows||14,
        px:rm.px,py:rm.py,pw:rm.pw,ph:rm.ph,
        seats:rm.seats.map(s=>({r:s.r,c:s.c,label:s.label,status:s.status}))}))}))
    const allSeats=[]; floors_config.forEach(f=>f.rooms.forEach(rm=>rm.seats.forEach(s=>allSeats.push(s))))
    const res = await saveLibrary({...lib,floors_config,seat_grid:floors_config[0]?.rooms[0]?.seats||[],total_seats:allSeats.length})
    if(res?.ok){toast(`✅ Layout saved! (${allSeats.length} seats total)`);go('owner-dash')}
    else toast('Save failed: ' + (res?.error || 'Unknown error'), 'error')
  }

  if(!S.gridFloors) return <div className="loader"><div className="spinner"/><p>Loading editor...</p></div>

  // Safe to access now — gridFloors is guaranteed non-null
  const fl   = (S.gridFloors||[])[S.activeFloor] || S.gridFloors[0]
  const room = fl?.rooms?.[S.activeRoom] || fl?.rooms?.[0] || null
  const cols = room?.cols||20, rows = room?.rows||14
  const seats = room?.seats||[]
  const seatAt = {}; seats.forEach((s,i)=>{ seatAt[s.r+','+s.c]=i })

  const namingOpts=[
    {id:'alpha-num',label:'A1, A2… B1, B2',desc:'Rows = letters, seats = numbers'},
    {id:'col-alpha', label:'A1, B1… A2, B2',desc:'Columns = letters, rows = numbers'},
    {id:'sequential',label:'1, 2, 3…',       desc:'Flat sequential numbering'},
  ]

  return (
    <div className="container" style={{maxWidth:980,margin:'0 auto'}}>
      <button className="back-link" onClick={()=>go('owner-dash')}>← Back to Dashboard</button>
      <h1 className="font-serif text-34 mb-6">Seat Layout Editor</h1>
      <p className="c-muted mb-24">{lib?.name}</p>

      {/* ── SEAT NAMING */}
      <div className="card p-22 mb-14">
        <div className="flex justify-between items-center flex-wrap gap-8 mb-16">
          <h2 className="font-serif text-h2">🏷️ Seat Naming Format</h2>
          <span className="text-sm c-muted">Applies across all floors &amp; rooms</span>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
          {namingOpts.map(n=>{
            const on=(S.seatNaming||'alpha-num')===n.id
            return (
              <div key={n.id} onClick={()=>{ set({seatNaming:n.id}); if(room){autoLabel(room.seats,n.id);rf()} }}
                style={{padding:'12px 14px',borderRadius:10,cursor:'pointer',
                  border:`1.5px solid ${on?'var(--red)':'var(--border)'}`,
                  background:on?'rgba(200,54,74,.06)':'var(--surface)',transition:'all .18s'}}>
                <div style={{fontSize:13,fontWeight:700,color:on?'var(--red)':'var(--text)',marginBottom:3}}>{n.label}</div>
                <div style={{fontSize:11,color:'var(--mutedl)'}}>{n.desc}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── FLOOR PLAN */}
      <div className="card p-22 mb-14">
        <div className="flex justify-between items-center flex-wrap gap-8 mb-14">
          <h2 className="font-serif text-h2">🏢 Floor Plan</h2>
          <div className="flex gap-8 items-center flex-wrap">
            <span className="text-sm c-muted fw-700">Floor:</span>
            {(S.gridFloors||[]).map((f,fi)=>{
              const on=fi===S.activeFloor
              return (
                <div key={fi} className="flex items-center" style={{borderRadius:9,overflow:'hidden',border:`1.5px solid ${on?'var(--red)':'var(--border)'}`,background:on?'var(--red)':'var(--surface)'}}>
                  <input value={f.name} onChange={ev=>renameFloor(fi,ev.target.value)}
                    onClick={()=>set({activeFloor:fi,activeRoom:0})}
                    style={{background:'transparent',border:'none',outline:'none',color:on?'white':'var(--mutedl)',
                      fontWeight:600,fontSize:13,padding:'5px 10px',cursor:'pointer',
                      width:Math.max(60,f.name.length*8)+'px',fontFamily:'inherit'}}/>
                  {(S.gridFloors||[]).length>1&&<button onClick={()=>removeFloor(fi)}
                    style={{background:'none',border:'none',color:on?'rgba(255,255,255,.7)':'var(--muted)',cursor:'pointer',padding:'0 7px 0 2px',fontSize:13}}>✕</button>}
                </div>
              )
            })}
            <button className="btn-ghost-sm" onClick={addFloor} style={{fontSize:12,padding:'5px 12px'}}>+ Floor</button>
          </div>
        </div>
        <FloorPlanCanvas fl={fl} activeRoom={S.activeRoom}
          onSelectRoom={ri=>set({activeRoom:ri})}
          onRenameRoom={renameRoom}
          onRemoveRoom={removeRoom}
          onAddRoom={addRoom}
          onMoveRoom={(ri,px,py)=>{if(!fl)return;const rooms=[...fl.rooms];rooms[ri]={...rooms[ri],px,py};const floors=[...(S.gridFloors||[])];floors[S.activeFloor]={...fl,rooms};set({gridFloors:floors})}}
          onResizeRoom={(ri,pw,ph)=>{if(!fl)return;const rooms=[...fl.rooms];rooms[ri]={...rooms[ri],pw,ph};const floors=[...(S.gridFloors||[])];floors[S.activeFloor]={...fl,rooms};set({gridFloors:floors})}}/>
        <p className="text-sm c-muted mt-8">Drag rooms to set position. Click to edit seats. Drag ↘ corner to resize.</p>
      </div>

      {/* ── PRESET */}
      <div className="card p-22 mb-14">
        <h2 className="font-serif text-h2 mb-6">Start with a Preset</h2>
        <p className="c-muted text-sm mb-14">Fills <strong>{room?.name}</strong> on <strong>{fl?.name}</strong>.</p>
        <div className="lib-preset-grid">
          {LAYOUT_PRESETS.map(p=>(
            <div key={p.id} className={`lib-preset-card ${S.editorPreset===p.id?'on':''}`} onClick={()=>{
              if(!room)return
              const COLS2=20;const newSeats=[];let gridRow=0
              p.rows.forEach((rowDef,ri)=>{
                if(p.paired&&ri>0&&ri%2===0)gridRow++
                const gap=rowDef.gap||0
                let col=Math.max(0,Math.floor((COLS2-rowDef.count-(gap>0?2:0))/2))
                for(let i=1;i<=rowDef.count;i++){if(gap>0&&i===gap+1)col+=2;newSeats.push({r:gridRow,c:col,label:'?',status:'available'});col++}
                gridRow++
              })
              autoLabel(newSeats);room.seats=newSeats;set({editorPreset:p.id});rf()
            }}>
              <span className="lp-icon">{p.icon}</span>
              <div className="lp-name">{p.name}</div>
              <div className="lp-desc">{p.desc}</div>
            </div>
          ))}
          <div className={`lib-preset-card ${S.editorPreset==='blank'?'on':''}`} onClick={()=>{if(room){room.seats=[];set({editorPreset:'blank'});rf()}}}>
            <span className="lp-icon">✏️</span><div className="lp-name">Blank Canvas</div><div className="lp-desc">Place every seat yourself.</div>
          </div>
        </div>
      </div>

      {/* ── CANVAS */}
      <div className="card p-22 mb-14">
        <div className="flex items-center gap-6 flex-wrap mb-12 pb-12" style={{borderBottom:'1px solid var(--borders)'}}>
          <span className="text-xs fw-700 c-muted uppercase tracking-wide">EDITING:</span>
          {(S.gridFloors||[]).map((f,fi)=>(
            <button key={fi} onClick={()=>set({activeFloor:fi,activeRoom:0})}
              style={{padding:'5px 12px',borderRadius:7,fontSize:12,fontWeight:600,cursor:'pointer',
                border:`1.5px solid ${fi===S.activeFloor?'var(--red)':'var(--border)'}`,
                background:fi===S.activeFloor?'var(--red)':'transparent',
                color:fi===S.activeFloor?'white':'var(--mutedl)'}}>
              {f.name}
            </button>
          ))}
          <span style={{color:'var(--muted)',fontSize:14}}>›</span>
          {fl?.rooms.map((rm,ri)=>(
            <button key={ri} onClick={()=>set({activeRoom:ri})}
              style={{padding:'5px 12px',borderRadius:7,fontSize:12,fontWeight:600,cursor:'pointer',
                border:`1.5px solid ${ri===S.activeRoom?'rgba(200,54,74,.6)':'var(--border)'}`,
                background:ri===S.activeRoom?'rgba(200,54,74,.1)':'transparent',
                color:ri===S.activeRoom?'var(--red)':'var(--mutedl)'}}>
              {rm.name}
            </button>
          ))}
          <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:6,fontSize:12,color:'var(--mutedl)'}}>
            Cols:<input type="number" min="8" max="30" value={cols}
              onChange={ev=>{if(!room)return;room.cols=Math.max(8,Math.min(30,+ev.target.value||20));rf()}}
              style={{width:44,background:'var(--surface)',border:'1px solid var(--border)',borderRadius:7,padding:'3px 6px',fontSize:12,color:'var(--text)'}}/>
            Rows:<input type="number" min="4" max="24" value={rows}
              onChange={ev=>{if(!room)return;room.rows=Math.max(4,Math.min(24,+ev.target.value||14));rf()}}
              style={{width:44,background:'var(--surface)',border:'1px solid var(--border)',borderRadius:7,padding:'3px 6px',fontSize:12,color:'var(--text)'}}/>
          </div>
        </div>

        <div className="sge-toolbar">
          {[['add','➕ Add / Toggle'],['move','✋ Move'],['erase','🗑️ Erase']].map(([t,lbl])=>(
            <button key={t} className={`sge-tool ${S.gridTool===t?'on':''}`} onClick={()=>set({gridTool:t})}>{lbl}</button>
          ))}
          <div className="sge-sep"/>
          <span className="sge-stat"><strong>{seats.length}</strong> seats</span>
          <div className="sge-sep"/>
          <button className="btn-ghost-sm" onClick={()=>{if(!confirm('Clear all seats in this room?'))return;if(room){room.seats=[];rf()}}}>Clear Room</button>
          <button className="btn-ghost-sm" onClick={()=>{if(room){autoLabel(room.seats);rf()}}}>Auto-label</button>
        </div>

        <div className="flex gap-14 mb-10 flex-wrap" style={{fontSize:12,color:'var(--mutedl)'}}>
          {[['#DCF5EE','#A8E6D4','Available'],['#FEE9DA','#F4C0A0','Maintenance'],['transparent','var(--muted)','Empty']].map(([bg,br,l])=>(
            <span key={l} className="flex items-center gap-4">
              <span style={{width:13,height:13,borderRadius:4,background:bg,border:`1px solid ${br}`,display:'inline-block',opacity:l==='Empty'?.5:1}}/>{l}
            </span>
          ))}
        </div>

        <p className="text-sm c-muted mb-10" style={{background:'rgba(200,54,74,.05)',border:'1px solid rgba(200,54,74,.15)',borderRadius:8,padding:'8px 12px'}}>
          ✋ <strong>Move mode: press and drag any seat immediately</strong> to reposition it. Scroll is locked only while a seat is actively selected for dragging.
        </p>

        <div className="sge-entrance">── ENTRANCE / FRONT ──</div>
        <div className={`sge-canvas-wrap tool-${S.gridTool}`}
          onMouseUp={onMouseUp}
          onTouchEnd={onTouchEnd}
          onTouchMove={onTouchMove}
          onMouseLeave={()=>{if(activeDrag.current){activeDrag.current=false;dragRef.current=null;set({gridDrag:null});rf()}}}
          style={{
            touchAction:activeDrag.current?'none':'pan-x pan-y',
            overflow: activeDrag.current ? 'hidden' : 'auto',
          }}>
          <div ref={gridRef} className="sge-grid" style={{gridTemplateColumns:`repeat(${cols},38px)`}}>
            {Array.from({length:rows},(_,r)=>
              Array.from({length:cols},(_,c)=>{
                const si=seatAt[r+','+c]
                if(si!==undefined){
                  const s=seats[si]
                  const dragging=S.gridDrag===si
                  const cls=dragging?'seat-drag':s.status==='maintenance'?'seat-mt':'seat-av'
                  return (
                    <div key={r+','+c} className={`sgc ${cls}`}
                      onClick={()=>handleCell(r,c)}
                      onMouseDown={ev=>{ev.preventDefault();onMouseDown(ev,r,c)}}
                      onMouseUp={onMouseUp}
                      onTouchStart={ev=>onTouchStart(ev,r,c)}
                      onTouchEnd={onTouchEnd}
                      style={{cursor:dragging?'grabbing':'pointer',userSelect:'none',
                        transform:dragging?'scale(1.18)':'none',
                        transition:'transform .1s',position:'relative',zIndex:dragging?10:'auto'}}>
                      {s.label}
                    </div>
                  )
                }
                return <div key={r+','+c} className="sgc empty" onClick={()=>handleCell(r,c)}/>
              })
            )}
          </div>
        </div>
        <p className="c-muted mt-8" style={{fontSize:12,lineHeight:1.6}}>
          <strong className="c-text">Add:</strong> click empty → seat · click seat → maintenance &nbsp;|&nbsp;
          <strong className="c-text">Press + drag:</strong> move seat &nbsp;|&nbsp;
          <strong className="c-text">Erase:</strong> click to remove
        </p>
      </div>

      <div className="warn-box mb-18">
        ⚠️ <strong className="c-text">Saving regenerates all seat records.</strong> Confirmed bookings are not deleted.
      </div>
      <div className="flex gap-12 flex-wrap">
        <button className="btn-red" onClick={handleSave}>
          Save All Floors ({(S.gridFloors||[]).reduce((a,f)=>a+f.rooms.reduce((b,rm)=>b+rm.seats.length,0),0)} seats total)
        </button>
        <button className="btn-outline" onClick={()=>go('owner-dash')}>Cancel</button>
      </div>
    </div>
  )
}

// ── FLOOR PLAN CANVAS ───────────────────────────────────────
function FloorPlanCanvas({fl,activeRoom,onSelectRoom,onRenameRoom,onRemoveRoom,onAddRoom,onMoveRoom,onResizeRoom}) {
  const planRef = useRef(null)
  const dragState = useRef(null) // {type:'move'|'resize', ri, startX, startY, origPx, origPy, origPw, origPh}
  const [,repaint] = useState(0)
  const rf = () => repaint(n=>n+1)

  const onMouseDown = (ev,ri,type) => {
    ev.preventDefault(); ev.stopPropagation()
    if(type==='select'){onSelectRoom(ri);return}
    const plan=planRef.current; if(!plan)return
    const rm=fl?.rooms[ri]; if(!rm)return
    dragState.current={type,ri,startX:ev.clientX,startY:ev.clientY,
      origPx:rm.px||5,origPy:rm.py||10,origPw:rm.pw||28,origPh:rm.ph||36}
  }
  const onTouchStartPlan = (ev,ri,type) => {
    if(type==='select'){onSelectRoom(ri);return}
    const t=ev.touches[0]
    const plan=planRef.current; if(!plan)return
    const rm=fl?.rooms[ri]; if(!rm)return
    dragState.current={type,ri,startX:t.clientX,startY:t.clientY,
      origPx:rm.px||5,origPy:rm.py||10,origPw:rm.pw||28,origPh:rm.ph||36}
  }
  const onMove = ev => {
    if(!dragState.current)return
    const plan=planRef.current; if(!plan)return
    const pr=plan.getBoundingClientRect()
    const{type,ri,startX,startY,origPx,origPy,origPw,origPh}=dragState.current
    const dx=(ev.clientX-startX)/pr.width*100
    const dy=(ev.clientY-startY)/pr.height*100
    if(type==='move'){
      onMoveRoom(ri,Math.max(0,Math.min(68,origPx+dx)),Math.max(0,Math.min(72,origPy+dy)))
    } else {
      onResizeRoom(ri,Math.max(18,Math.min(80,origPw+dx)),Math.max(16,Math.min(70,origPh+dy)))
    }
    rf()
  }
  const onTouchMove = ev => {
    if(!dragState.current)return
    const t=ev.touches[0]; onMove({clientX:t.clientX,clientY:t.clientY})
  }
  const onUp = () => { dragState.current=null; rf() }

  const rooms=fl?.rooms||[]

  return (
    <div ref={planRef}
      style={{position:'relative',width:'100%',height:220,background:'var(--surface)',
        border:'1.5px dashed var(--border)',borderRadius:12,overflow:'hidden',userSelect:'none'}}
      onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
      onTouchMove={onTouchMove} onTouchEnd={onUp}>
      {/* Grid dots */}
      <svg style={{position:'absolute',inset:0,width:'100%',height:'100%',opacity:.3}} xmlns="http://www.w3.org/2000/svg">
        <defs><pattern id="fp-dots" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1" fill="var(--muted)"/></pattern></defs>
        <rect width="100%" height="100%" fill="url(#fp-dots)"/>
      </svg>
      <div style={{position:'absolute',top:6,left:10,fontSize:9,fontWeight:700,color:'var(--muted)',letterSpacing:2,textTransform:'uppercase'}}>── ENTRANCE ──</div>

      {rooms.map((rm,ri)=>{
        const isActive=ri===activeRoom
        const px=rm.px??5+(ri%3)*32, py=rm.py??10+(Math.floor(ri/3)*44)
        const pw=rm.pw??28, ph=rm.ph??36
        return (
          <div key={ri} style={{position:'absolute',left:px+'%',top:py+'%',width:pw+'%',height:ph+'%',
            border:`2px solid ${isActive?'var(--red)':'rgba(200,54,74,.3)'}`,
            borderRadius:10,background:isActive?'rgba(200,54,74,.07)':'rgba(200,54,74,.02)',
            display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
            cursor:'move',transition:'border-color .15s,background .15s'}}>
            {/* Room name (editable) */}
            <input value={rm.name} onChange={ev=>onRenameRoom(ri,ev.target.value)}
              onClick={ev=>{ev.stopPropagation();onSelectRoom(ri)}}
              onMouseDown={ev=>ev.stopPropagation()}
              style={{background:'transparent',border:'none',outline:'none',
                fontSize:11,fontWeight:700,textAlign:'center',
                color:isActive?'var(--red)':'var(--mutedl)',
                width:'90%',cursor:'text',fontFamily:'inherit'}}/>
            <div style={{fontSize:10,color:'var(--muted)'}}>{rm.seats.length} seats</div>
            {isActive&&<div style={{fontSize:9,background:'var(--red)',color:'white',borderRadius:4,padding:'1px 6px',marginTop:3}}>editing</div>}
            {/* Move handle (whole box) */}
            <div style={{position:'absolute',inset:0,cursor:'move'}}
              onMouseDown={ev=>{if(ev.target.tagName==='INPUT')return;onMouseDown(ev,ri,'move')}}
              onTouchStart={ev=>{if(ev.target.tagName==='INPUT')return;onTouchStartPlan(ev,ri,'move')}}/>
            {/* Resize handle */}
            <div style={{position:'absolute',right:2,bottom:2,width:14,height:14,cursor:'se-resize',
              display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,color:'var(--muted)',
              background:'rgba(255,255,255,.5)',borderRadius:3}}
              onMouseDown={ev=>{ev.stopPropagation();onMouseDown(ev,ri,'resize')}}
              onTouchStart={ev=>{ev.stopPropagation();onTouchStartPlan(ev,ri,'resize')}}>↘</div>
            {/* Remove button */}
            {rooms.length>1&&<button onClick={ev=>{ev.stopPropagation();onRemoveRoom(ri)}}
              style={{position:'absolute',top:2,right:2,background:'none',border:'none',
                color:'var(--muted)',cursor:'pointer',fontSize:11,lineHeight:1,padding:'1px 4px'}}>✕</button>}
          </div>
        )
      })}
      <button className="btn-ghost-sm" onClick={onAddRoom}
        style={{position:'absolute',bottom:8,right:10,fontSize:11,padding:'4px 10px'}}>+ Add Room</button>
    </div>
  )
}

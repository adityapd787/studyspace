import { useState, useRef, useEffect, useCallback } from 'react'
import { useApp } from '../lib/AppContext'
import { DEMO_MODE, sb } from '../lib/supabase'
import { LAYOUT_PRESETS, AMENITY_PRESETS } from '../lib/constants'
import { e, fmtDate, initials, toast, AmenityInput } from '../components/shared'
import { ownerStats, OWNER_TABS, SHIFT_OPTS, TAG_COLORS, OWNER_SEAT_LEGEND, revSummary } from '../lib/ui-config'

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
            set({ gridFloors: null, editorPreset: null, gridDrag: null, activeFloor: 0, activeRoom: 0 })
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
    const ok = await saveLibrary(data)
    if (ok) {
      set({ addLibAmenities: [], addLibPhotos: [''] })
      toast('✅ Library saved!')
      go('owner-dash')
    } else {
      toast('Save failed — check your connection', 'error')
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


// ── SEAT EDITOR ────────────────────────────────────────────────
export function SeatEditor() {
  const { S, set, go, saveLibrary } = useApp()
  const lib = S.ownerLibrary
  const [gridTool, setGridTool] = useState(S.gridTool || 'add')
  const [, forceUpdate] = useState(0)
  const repaint = () => forceUpdate(n => n+1)

  // Ensure floors exist
  useEffect(() => {
    if (!S.gridFloors || !S.gridFloors.length) {
      set({ gridFloors: [{ id:'f1', name:'Ground Floor', rooms:[{ id:'r1', name:'Main Hall', seats:[], cols:20, rows:14 }] }], activeFloor:0, activeRoom:0 })
    }
  }, [])

  const fl = (S.gridFloors || [])[S.activeFloor]
  const room = fl?.rooms[S.activeRoom]
  const cols = room?.cols || 20, rows = room?.rows || 14
  const seats = room?.seats || []
  const seatAt = {}; seats.forEach((s,i) => { seatAt[s.r+','+s.c] = i })

  const handleCell = (r, c) => {
    if (!room) return
    const si = seatAt[r+','+c]
    const arr = [...room.seats]
    if (gridTool === 'add') {
      if (si !== undefined) arr[si] = { ...arr[si], status: arr[si].status === 'maintenance' ? 'available' : 'maintenance' }
      else arr.push({ r, c, label: '?', status: 'available' })
      autoLabel(arr)
    } else if (gridTool === 'erase') {
      if (si !== undefined) { arr.splice(si, 1); autoLabel(arr) }
    }
    room.seats = arr
    repaint()
  }

  const autoLabel = (arr) => {
    const byRow = {}; arr.forEach(s => { (byRow[s.r]=byRow[s.r]||[]).push(s) })
    Object.keys(byRow).sort((a,b)=>+a-+b).forEach((r,ri) => {
      const rl = ri<26 ? String.fromCharCode(65+ri) : 'R'+(ri+1)
      byRow[r].sort((a,b)=>a.c-b.c).forEach((s,ci) => { s.label = rl+(ci+1) })
    })
  }

  const handleSave = async () => {
    if (!lib) return
    const floors_config = (S.gridFloors||[]).map(fl => ({ id:fl.id, name:fl.name, rooms:fl.rooms.map(rm => ({ id:rm.id, name:rm.name, cols:rm.cols||20, rows:rm.rows||14, seats:rm.seats.map(s=>({r:s.r,c:s.c,label:s.label,status:s.status})) })) }))
    const allSeats = []; floors_config.forEach(fl => fl.rooms.forEach(rm => rm.seats.forEach(s => allSeats.push(s))))
    const ok = await saveLibrary({ ...lib, floors_config, seat_grid: floors_config[0]?.rooms[0]?.seats || [], total_seats: allSeats.length })
    if (ok) { toast(`✅ Layout saved! (${allSeats.length} seats)`); go('owner-dash') }
    else toast('Save failed', 'error')
  }

  if (!S.gridFloors) return <div className="loader"><div className="spinner" /><p>Loading editor...</p></div>

  return (
    <div className="container" style={{maxWidth:980,margin:"0 auto"}}>
      <button className="back-link" onClick={() => go('owner-dash')}>← Back to Dashboard</button>
      <h1 className="font-serif text-34 mb-6">Seat Layout Editor</h1>
      <p style={{ color: 'var(--mutedl)', marginBottom: 24 }}>{lib?.name}</p>

      {/* Presets */}
      <div className="card p-22 mb-14">
        <h2 className="font-serif text-h2 mb-12">Start with a Preset</h2>
        <div className="lib-preset-grid">
          {LAYOUT_PRESETS.map(p => (
            <div key={p.id} className={`lib-preset-card ${S.editorPreset===p.id?'on':''}`} onClick={() => {
              if (!room) return
              const COLS2 = 20
              const newSeats = []
              let gridRow = 0
              p.rows.forEach((rowDef, ri) => {
                if (p.paired && ri > 0 && ri % 2 === 0) gridRow++
                const gap = rowDef.gap || 0
                let col = Math.max(0, Math.floor((COLS2 - rowDef.count - (gap>0?2:0)) / 2))
                for (let i=1; i<=rowDef.count; i++) {
                  if (gap>0 && i===gap+1) col+=2
                  newSeats.push({ r:gridRow, c:col, label:'?', status:'available' }); col++
                }
                gridRow++
              })
              autoLabel(newSeats); room.seats = newSeats
              set({ editorPreset: p.id }); repaint()
            }}>
              <span className="lp-icon">{p.icon}</span>
              <div className="lp-name">{p.name}</div>
              <div className="lp-desc">{p.desc}</div>
            </div>
          ))}
          <div className={`lib-preset-card ${S.editorPreset==='blank'?'on':''}`} onClick={() => { if(room){room.seats=[];set({editorPreset:'blank'});repaint()} }}>
            <span className="lp-icon">✏️</span><div className="lp-name">Blank Canvas</div><div className="lp-desc">Place every seat yourself.</div>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="card p-22 mb-14">
        {/* Floor + room switchers */}
        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:12, paddingBottom:12, borderBottom:'1px solid var(--borders)', flexWrap:'wrap' }}>
          <span style={{ fontSize:12, fontWeight:700, color:'var(--mutedl)', letterSpacing:'.5px' }}>EDITING:</span>
          {(S.gridFloors||[]).map((f,fi) => (
            <button key={fi} onClick={() => set({ activeFloor:fi, activeRoom:0 })} style={{ padding:'5px 12px', borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer', border:`1.5px solid ${fi===S.activeFloor?'var(--red)':'var(--border)'}`, background:fi===S.activeFloor?'var(--red)':'transparent', color:fi===S.activeFloor?'white':'var(--mutedl)' }}>{f.name}</button>
          ))}
          <span style={{ color:'var(--muted)', fontSize:14 }}>›</span>
          {fl?.rooms.map((rm,ri) => (
            <button key={ri} onClick={() => set({ activeRoom:ri })} style={{ padding:'5px 12px', borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer', border:`1.5px solid ${ri===S.activeRoom?'rgba(200,54,74,.6)':'var(--border)'}`, background:ri===S.activeRoom?'rgba(200,54,74,.1)':'transparent', color:ri===S.activeRoom?'var(--red)':'var(--mutedl)' }}>{rm.name}</button>
          ))}
        </div>

        <div className="sge-toolbar">
          {[['add','➕ Add / Toggle'],['move','✋ Move'],['erase','🗑️ Erase']].map(([t,lbl]) => (
            <button key={t} className={`sge-tool ${gridTool===t?'on':''}`} onClick={() => { setGridTool(t); set({ gridTool:t }) }}>{lbl}</button>
          ))}
          <div className="sge-sep" />
          <span className="sge-stat"><strong>{seats.length}</strong> seats</span>
          <div className="sge-sep" />
          <button className="btn-ghost-sm" onClick={() => { if(!confirm('Clear all seats in this room?'))return; if(room){room.seats=[];repaint()} }}>Clear Room</button>
          <button className="btn-ghost-sm" onClick={() => { if(room){autoLabel(room.seats);repaint()} }}>Auto-label</button>
        </div>

        <div style={{ display:'flex', gap:14, marginBottom:10, flexWrap:'wrap', fontSize:12, color:'var(--mutedl)' }}>
          {[['#DCF5EE','#A8E6D4','Available'],['#FEE9DA','#F4C0A0','Maintenance'],['transparent','var(--muted)','Empty']].map(([bg,br,l]) => (
            <span key={l} style={{ display:'flex', alignItems:'center', gap:5 }}><span style={{ width:13, height:13, borderRadius:4, background:bg, border:`1px solid ${br}`, display:'inline-block', opacity:l==='Empty'?.5:1 }} />{l}</span>
          ))}
        </div>

        <div className="sge-entrance">── ENTRANCE / FRONT ──</div>
        <div className={`sge-canvas-wrap tool-${gridTool}`}>
          <div className="sge-grid" style={{ gridTemplateColumns: `repeat(${cols},38px)` }}>
            {Array.from({ length: rows }, (_, r) =>
              Array.from({ length: cols }, (_, c) => {
                const si = seatAt[r+','+c]
                if (si !== undefined) {
                  const s = seats[si]
                  return <div key={r+','+c} className={`sgc ${s.status==='maintenance'?'seat-mt':'seat-av'}`} onClick={() => handleCell(r,c)}>{s.label}</div>
                }
                return <div key={r+','+c} className="sgc empty" onClick={() => handleCell(r,c)} />
              })
            )}
          </div>
        </div>
        <p style={{ color:'var(--mutedl)', fontSize:12, marginTop:8, lineHeight:1.6 }}>
          <strong className="c-text">Add:</strong> click empty → seat · click seat → maintenance &nbsp;|&nbsp; <strong className="c-text">Erase:</strong> click seat to remove
        </p>
      </div>

      <div className="warn-box mb-18">
        ⚠️ <strong className="c-text">Saving regenerates all seat records.</strong> Confirmed bookings are not deleted.
      </div>
      <div className="flex gap-12 flex-wrap">
        <button className="btn-red" onClick={handleSave}>Save Layout ({seats.length} seats in this room)</button>
        <button className="btn-outline" onClick={() => go('owner-dash')}>Cancel</button>
      </div>
    </div>
  )
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../lib/AppContext'
import { LAYOUT_PRESETS } from '../lib/constants'
import { fmtDate, toast, AmenityInput } from '../components/shared'

const newFloor = index => ({
  id: `f-${Date.now()}-${index}`,
  name: index === 0 ? 'Ground Floor' : `Floor ${index + 1}`,
  rooms: [newRoom(0)],
})

function newRoom(index) {
  return {
    id: `r-${Date.now()}-${index}`,
    name: index === 0 ? 'Main Hall' : `Room ${index + 1}`,
    cols: 20,
    rows: 14,
    px: 5 + (index % 3) * 32,
    py: 10 + Math.floor(index / 3) * 42,
    pw: 28,
    ph: 36,
    seats: [],
  }
}

const clone = value => JSON.parse(JSON.stringify(value))

const autoLabelSeats = seats => {
  const byRow = {}
  seats.forEach(seat => { (byRow[seat.r] = byRow[seat.r] || []).push(seat) })
  Object.keys(byRow).sort((a, b) => Number(a) - Number(b)).forEach((rowKey, rowIndex) => {
    const rowLabel = rowIndex < 26 ? String.fromCharCode(65 + rowIndex) : `R${rowIndex + 1}`
    byRow[rowKey].sort((a, b) => a.c - b.c).forEach((seat, seatIndex) => {
      seat.label = `${rowLabel}${seatIndex + 1}`
    })
  })
  return seats
}

const createPresetSeats = (preset, cols = 20) => {
  const nextSeats = []
  let gridRow = 0
  preset.rows.forEach((rowDef, rowIndex) => {
    if (preset.paired && rowIndex > 0 && rowIndex % 2 === 0) gridRow += 1
    const gap = rowDef.gap || 0
    let col = Math.max(0, Math.floor((cols - rowDef.count - (gap > 0 ? 2 : 0)) / 2))
    for (let seatIndex = 1; seatIndex <= rowDef.count; seatIndex += 1) {
      if (gap > 0 && seatIndex === gap + 1) col += 2
      nextSeats.push({ r: gridRow, c: col, label: '?', status: 'available' })
      col += 1
    }
    gridRow += 1
  })
  return autoLabelSeats(nextSeats)
}

const roomSeatCount = floors => floors.reduce((sum, floor) => sum + floor.rooms.reduce((roomSum, room) => roomSum + room.seats.length, 0), 0)

function RoomPlan({ floors, activeFloor, activeRoom, onSelectRoom, onChange }) {
  const planRef = useRef(null)
  const dragState = useRef(null)
  const floor = floors[activeFloor]

  useEffect(() => {
    const onMove = ev => {
      if (!dragState.current || !planRef.current) return
      const state = dragState.current
      const planRect = planRef.current.getBoundingClientRect()
      const dx = ((ev.clientX - state.startX) / planRect.width) * 100
      const dy = ((ev.clientY - state.startY) / planRect.height) * 100
      onChange(draft => {
        const room = draft[activeFloor].rooms[state.roomIndex]
        if (!room) return
        if (state.type === 'move') {
          room.px = Math.max(0, Math.min(92, state.orig.px + dx))
          room.py = Math.max(0, Math.min(82, state.orig.py + dy))
        } else {
          room.pw = Math.max(12, Math.min(80, state.orig.pw + dx))
          room.ph = Math.max(15, Math.min(75, state.orig.ph + dy))
        }
      })
    }
    const onUp = () => { dragState.current = null }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [activeFloor, onChange])

  return (
    <div className="card" style={{ padding: 18, marginBottom: 14 }}>
      <div className="sec-hd" style={{ marginBottom: 14 }}>
        <div>
          <h2 style={{ fontFamily: '"Cormorant Garamond",serif', fontSize: 18 }}>Floor Planner</h2>
          <p style={{ color: 'var(--mutedl)', fontSize: 13, marginTop: 4 }}>Drag rooms into position to mirror the real library.</p>
        </div>
      </div>
      <div className="floor-plan" ref={planRef}>
        {floor?.rooms.map((room, roomIndex) => {
          const isActive = roomIndex === activeRoom
          return (
            <button
              key={room.id}
              type="button"
              className={`room-box ${isActive ? 'on' : ''}`}
              style={{ left: `${room.px}%`, top: `${room.py}%`, width: `${room.pw}%`, height: `${room.ph}%` }}
              onClick={() => onSelectRoom(roomIndex)}
              onMouseDown={ev => {
                if (ev.target.dataset.resize) return
                dragState.current = {
                  type: 'move',
                  roomIndex,
                  startX: ev.clientX,
                  startY: ev.clientY,
                  orig: { px: room.px, py: room.py },
                }
              }}
            >
              <div className="room-box-name">{room.name}</div>
              <div className="room-box-meta">{room.seats.length} seats</div>
              <span
                className="room-resize"
                data-resize="1"
                onMouseDown={ev => {
                  ev.stopPropagation()
                  dragState.current = {
                    type: 'resize',
                    roomIndex,
                    startX: ev.clientX,
                    startY: ev.clientY,
                    orig: { pw: room.pw, ph: room.ph },
                  }
                }}
              />
            </button>
          )
        })}
      </div>
      <p style={{ color: 'var(--mutedl)', fontSize: 12, marginTop: 10 }}>Click a room to edit its seat map, then save all floors together.</p>
    </div>
  )
}

function SeatGrid({ room, tool, onChange }) {
  const [dragFrom, setDragFrom] = useState(null)
  const seatMap = useMemo(() => {
    const map = new Map()
    room.seats.forEach(seat => map.set(`${seat.r},${seat.c}`, seat))
    return map
  }, [room.seats])

  const mutate = updater => {
    const seats = clone(room.seats)
    updater(seats)
    autoLabelSeats(seats)
    onChange(seats)
  }

  const clickCell = (r, c) => {
    mutate(seats => {
      const index = seats.findIndex(seat => seat.r === r && seat.c === c)
      if (tool === 'erase') {
        if (index >= 0) seats.splice(index, 1)
        return
      }
      if (index >= 0) {
        seats[index].status = seats[index].status === 'maintenance' ? 'available' : 'maintenance'
      } else {
        seats.push({ r, c, label: '?', status: 'available' })
      }
    })
  }

  return (
    <div className={`sge-canvas-wrap tool-${tool}`}>
      <div className="sge-grid" style={{ gridTemplateColumns: `repeat(${room.cols},38px)` }}>
        {Array.from({ length: room.rows }, (_, r) =>
          Array.from({ length: room.cols }, (_, c) => {
            const seat = seatMap.get(`${r},${c}`)
            if (!seat) {
              return (
                <div
                  key={`${r}-${c}`}
                  className="sgc empty"
                  onClick={() => tool !== 'move' && clickCell(r, c)}
                  onMouseUp={() => {
                    if (tool !== 'move' || !dragFrom) return
                    mutate(seats => {
                      const dragged = seats.find(item => item.r === dragFrom.r && item.c === dragFrom.c)
                      if (dragged) {
                        dragged.r = r
                        dragged.c = c
                      }
                    })
                    setDragFrom(null)
                  }}
                />
              )
            }
            return (
              <div
                key={`${r}-${c}`}
                className={`sgc ${seat.status === 'maintenance' ? 'seat-mt' : 'seat-av'} ${dragFrom?.r === r && dragFrom?.c === c ? 'seat-drag' : ''}`}
                onMouseDown={() => {
                  if (tool === 'move') setDragFrom({ r, c })
                }}
                onMouseUp={() => {
                  if (tool === 'move' && dragFrom && (dragFrom.r !== r || dragFrom.c !== c)) {
                    mutate(seats => {
                      const dragged = seats.find(item => item.r === dragFrom.r && item.c === dragFrom.c)
                      const target = seats.find(item => item.r === r && item.c === c)
                      if (dragged && target) {
                        const next = { r: dragged.r, c: dragged.c }
                        dragged.r = target.r
                        dragged.c = target.c
                        target.r = next.r
                        target.c = next.c
                      }
                    })
                  } else if (tool !== 'move') {
                    clickCell(r, c)
                  }
                  setDragFrom(null)
                }}
                onClick={() => tool !== 'move' && clickCell(r, c)}
              >
                {seat.label}
              </div>
            )
          }),
        )}
      </div>
    </div>
  )
}

export function OwnerDash() {
  const { S, set, go } = useApp()
  if (S.loading) return <div className="container"><div className="loader"><div className="spinner" /><p>Loading dashboard...</p></div></div>
  if (!S.ownerLibrary) return <EditLibrary />

  const lib = S.ownerLibrary
  const bks = S.ownerBookings
  const td = new Date().toISOString().split('T')[0]
  const todayBks = bks.filter(b => b.booking_date === td && b.status === 'confirmed')
  const todayRev = todayBks.reduce((sum, booking) => sum + booking.total_amount, 0)
  const totalRev = bks.filter(b => b.status === 'confirmed').reduce((sum, booking) => sum + booking.total_amount, 0)
  const bookedIds = todayBks.flatMap(b => b.seat_ids || [])
  const occPct = S.ownerSeats.length ? Math.round((bookedIds.length / S.ownerSeats.length) * 100) : 0
  const last7 = [...Array(7)].map((_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - 6 + i)
    const ds = date.toISOString().split('T')[0]
    const amt = bks.filter(booking => booking.booking_date === ds && booking.status === 'confirmed').reduce((sum, booking) => sum + booking.total_amount, 0)
    return { ds, day: date.toLocaleDateString('en-IN', { weekday: 'short' }), amt, isToday: ds === td }
  })
  const maxRev = Math.max(...last7.map(day => day.amt), 1)
  const weekTotal = last7.reduce((sum, day) => sum + day.amt, 0)

  const groupedSeats = S.ownerSeats.reduce((map, seat) => {
    const key = `${seat.floor_name || 'Floor'}::${seat.room_name || 'Room'}`
    if (!map[key]) map[key] = []
    map[key].push(seat)
    return map
  }, {})

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 36, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: '"Cormorant Garamond",serif', fontSize: 36, marginBottom: 6 }}>Library Dashboard</h1>
          <p style={{ color: 'var(--mutedl)' }}>{lib.name}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn-ghost-sm" onClick={() => {
            set({ gridFloors: clone(lib.floors_config || [newFloor(0)]), editorPreset: null, activeFloor: 0, activeRoom: 0 })
            go('seat-editor')
          }}>Seat Editor</button>
          <button className="nav-pill" onClick={() => {
            set({
              addLibAmenities: [...(lib.amenities || [])],
              addLibPhotos: lib.photos?.length ? [...lib.photos] : ['', '', ''],
              addLibOpen: lib.hours_open || '06:00',
              addLibClose: lib.hours_close || '22:00',
              addLibShift: lib.shift_durations || (lib.shift_duration ? [lib.shift_duration] : [3]),
            })
            go('edit-library')
          }}>Edit Library</button>
        </div>
      </div>

      <div className="o-stats">
        {[
          ['Rs ' + todayRev.toLocaleString('en-IN'), "Today's Revenue", todayBks.length + ' bookings today', 'var(--red)'],
          [bks.filter(b => b.status === 'confirmed').length, 'Confirmed Bookings', bks.filter(b => b.status === 'cancelled').length + ' cancelled', 'var(--green)'],
          [occPct + '%', "Today's Occupancy", bookedIds.length + ' / ' + S.ownerSeats.length + ' seats', 'var(--blue)'],
          ['Rs ' + totalRev.toLocaleString('en-IN'), 'Total Revenue', 'All-time', 'var(--purple)'],
        ].map(([value, label, sub, color]) => (
          <div key={label} className="card ostat">
            <div className="val" style={{ color }}>{value}</div>
            <div className="lbl">{label}</div>
            <div style={{ fontSize: 12, color: 'var(--mutedl)', marginTop: 3 }}>{sub}</div>
          </div>
        ))}
      </div>

      <div className="tabs">
        {[['bookings', 'Bookings'], ['seatmap', 'Seat Map'], ['revenue', 'Revenue']].map(([id, label]) => (
          <button key={id} className={`tab ${S.ownerTab === id ? 'on' : ''}`} onClick={() => set({ ownerTab: id })}>{label}</button>
        ))}
      </div>

      {S.ownerTab === 'bookings' && (
        <div className="card" style={{ padding: 26 }}>
          <div className="sec-hd"><h2>All Bookings</h2></div>
          {!bks.length ? <div className="empty-s"><p>No bookings yet.</p></div> : bks.slice(0, 20).map(booking => {
            const isToday = booking.booking_date === td
            const color = booking.status === 'confirmed' ? (isToday ? 'var(--green)' : booking.booking_date > td ? 'var(--blue)' : 'var(--mutedl)') : 'var(--red)'
            const label = booking.status === 'cancelled' ? 'Cancelled' : isToday ? 'Active' : booking.booking_date > td ? 'Upcoming' : 'Completed'
            return (
              <div key={booking.id} className="bk-row">
                <div style={{ flex: 1 }}>
                  <div className="nm">{booking.student?.full_name || 'Student'}</div>
                  <div className="mt">{fmtDate(booking.booking_date)} · {(booking.slot_start || '').slice(0, 5)}-{(booking.slot_end || '').slice(0, 5)} · Rs {booking.total_amount}</div>
                </div>
                <span className="spill" style={{ background: `${color}22`, color }}>{label}</span>
              </div>
            )
          })}
        </div>
      )}

      {S.ownerTab === 'seatmap' && (
        <div className="card" style={{ padding: 26 }}>
          <div className="sec-hd"><h2>Saved Layout</h2></div>
          {!Object.keys(groupedSeats).length ? <p style={{ color: 'var(--mutedl)' }}>No seat layout saved yet.</p> : Object.entries(groupedSeats).map(([key, seats]) => {
            const maxRow = Math.max(...seats.map(seat => seat.grid_r || 0)) + 1
            const maxCol = Math.max(...seats.map(seat => seat.grid_c || 0)) + 1
            return (
              <div key={key} style={{ marginBottom: 22 }}>
                <h3 style={{ fontFamily: '"Cormorant Garamond",serif', fontSize: 22, marginBottom: 10 }}>{key.replace('::', ' - ')}</h3>
                <div className="seat-map-wrap">
                  <div className="sg-student" style={{ gridTemplateColumns: `repeat(${maxCol},36px)` }}>
                    {Array.from({ length: maxRow }, (_, r) =>
                      Array.from({ length: maxCol }, (_, c) => {
                        const seat = seats.find(item => item.grid_r === r && item.grid_c === c)
                        if (!seat) return <div key={`${key}-${r}-${c}`} className="sgc-s empty" />
                        const isBooked = bookedIds.includes(seat.id)
                        const cls = seat.status === 'maintenance' ? 'mt' : isBooked ? 'bk' : 'av'
                        return <div key={seat.id} className={`sgc-s ${cls}`}>{seat.label}</div>
                      }),
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {S.ownerTab === 'revenue' && (
        <div className="card" style={{ padding: 26 }}>
          <div className="sec-hd"><h2>Revenue - Last 7 Days</h2></div>
          <div className="bar-chart">
            {last7.map(day => <div key={day.ds} className={`bar ${day.isToday ? 'today' : ''}`} style={{ height: Math.max(6, Math.round((day.amt / maxRev) * 88)) }} />)}
          </div>
          <div className="bar-labels">
            {last7.map(day => <div key={day.ds} className="bar-lbl">{day.day}<br /><span style={{ fontSize: 10 }}>Rs {day.amt.toLocaleString('en-IN')}</span></div>)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--borders)' }}>
            {[['Rs ' + weekTotal.toLocaleString('en-IN'), 'This Week'], ['Rs ' + Math.round(weekTotal / 7).toLocaleString('en-IN'), 'Daily Avg'], ['Rs ' + totalRev.toLocaleString('en-IN'), 'All Time']].map(([value, label]) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: '"Cormorant Garamond",serif', fontSize: 26, color: 'var(--red)' }}>{value}</div>
                <div style={{ fontSize: 12, color: 'var(--mutedl)', marginTop: 4 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function EditLibrary() {
  const { S, set, go, saveLibrary } = useApp()
  const lib = S.ownerLibrary
  const isEdit = !!lib
  const [amenities, setAmenities] = useState(S.addLibAmenities)
  const [photos, setPhotos] = useState(S.addLibPhotos)
  const [open, setOpen] = useState(S.addLibOpen)
  const [close, setClose] = useState(S.addLibClose)
  const [shifts, setShifts] = useState(Array.isArray(S.addLibShift) ? S.addLibShift : [S.addLibShift || 3])
  const [busy, setBusy] = useState(false)

  const editorSeatCount = roomSeatCount(S.gridFloors || [])
  const shiftOptions = [{ h: 3, lbl: '3 hrs' }, { h: 4, lbl: '4 hrs' }, { h: 6, lbl: '6 hrs' }, { h: 12, lbl: '12 hrs' }, { h: 0, lbl: 'Full Day' }]

  const toggleShift = hours => {
    setShifts(prev => prev.includes(hours) ? (prev.length > 1 ? prev.filter(item => item !== hours) : prev) : [...prev, hours])
  }

  const handleSubmit = async ev => {
    ev.preventDefault()
    setBusy(true)
    const fd = new FormData(ev.currentTarget)
    const intVal = key => {
      const value = parseInt(fd.get(key), 10)
      return Number.isNaN(value) ? null : value
    }
    const tag = fd.get('tag')
    const tagColors = { PREMIUM: '#C8364A', STANDARD: '#4A90D9', BUDGET: '#2A9D8F' }
    const floorsConfig = S.gridFloors || lib?.floors_config || [newFloor(0)]
    const data = {
      name: fd.get('name'),
      tag,
      tag_color: tagColors[tag],
      price_per_hour: intVal('price_per_hour') || 0,
      location: fd.get('location'),
      total_seats: editorSeatCount > 0 ? editorSeatCount : (intVal('total_seats') || 0),
      hours: `${open} - ${close}`,
      hours_open: open,
      hours_close: close,
      shift_durations: shifts,
      shift_duration: shifts[0] || 3,
      description: fd.get('description'),
      maps_url: fd.get('maps_url') || null,
      price_monthly: intVal('price_monthly'),
      price_3monthly: intVal('price_3monthly'),
      price_6monthly: intVal('price_6monthly'),
      price_annual: intVal('price_annual'),
      amenities,
      photos: photos.filter(url => url?.trim()),
      floors_config: floorsConfig,
      seat_grid: floorsConfig[0]?.rooms?.[0]?.seats || [],
    }
    if (!data.name || !data.location || !data.price_per_hour || !data.hours_open || !data.description) {
      toast('Please fill all required fields', 'error')
      setBusy(false)
      return
    }
    const ok = await saveLibrary(data)
    if (ok) {
      set({ addLibAmenities: [], addLibPhotos: ['', '', ''] })
      toast('Library saved.')
      go('owner-dash')
    } else {
      toast('Save failed', 'error')
    }
    setBusy(false)
  }

  return (
    <div className="container-sm">
      {isEdit && <button className="back-link" onClick={() => go('owner-dash')}>Back to Dashboard</button>}
      <h1 style={{ fontFamily: '"Cormorant Garamond",serif', fontSize: 34, marginBottom: 6 }}>{isEdit ? 'Edit Library' : 'List Your Library'}</h1>
      <p style={{ color: 'var(--mutedl)', marginBottom: 36 }}>{isEdit ? 'Update your library details and pricing.' : 'Add your space to StudySpace and start receiving bookings.'}</p>

      <div className="card" style={{ padding: 32 }}>
        <form onSubmit={handleSubmit}>
          <div className="field-section">
            <h3>Basic Information</h3>
            <div className="form-group"><label>Library Name *</label><input name="name" className="form-input" defaultValue={lib?.name || ''} required /></div>
            <div className="form-row">
              <div className="form-group"><label>Category *</label><select name="tag" defaultValue={lib?.tag || 'STANDARD'}>{['BUDGET', 'STANDARD', 'PREMIUM'].map(tag => <option key={tag} value={tag}>{tag}</option>)}</select></div>
              <div className="form-group">
                <label>Total Seats</label>
                <input name="total_seats" className="form-input" type="number" min="0" defaultValue={editorSeatCount > 0 ? editorSeatCount : (lib?.total_seats || '')} />
                <p className="form-hint">{editorSeatCount > 0 ? 'Auto-synced from the seat editor.' : 'This will auto-sync after you save a layout.'}</p>
              </div>
            </div>
            <div className="form-group"><label>Location / Area *</label><input name="location" className="form-input" defaultValue={lib?.location || ''} required /></div>

            <div className="form-group">
              <label>Opening Hours *</label>
              <div className="time-picker-wrap">
                <div className="time-input-group"><label>Opens at</label><input type="time" value={open} onChange={ev => setOpen(ev.target.value)} required /></div>
                <div className="time-input-group"><label>Closes at</label><input type="time" value={close} onChange={ev => setClose(ev.target.value)} required /></div>
              </div>
              <div className="hours-preview">{open} - {close}</div>
            </div>

            <div className="form-group">
              <label>Shift Duration *</label>
              <div className="shift-opts">
                {shiftOptions.map(option => (
                  <div key={option.h} className={`shift-opt ${shifts.includes(option.h) ? 'on' : ''}`} onClick={() => toggleShift(option.h)}>
                    <div className="sh-dur">{shifts.includes(option.h) ? 'OK' : ''}</div>
                    <div className="sh-lbl">{option.lbl}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="form-group"><label>Google Maps Link</label><input name="maps_url" className="form-input" type="url" defaultValue={lib?.maps_url || ''} /></div>
          </div>

          <div className="field-section">
            <h3>Description</h3>
            <div className="form-group"><label>About Your Space *</label><textarea name="description" defaultValue={lib?.description || ''} required /></div>
          </div>

          <div className="field-section">
            <h3>Pricing</h3>
            <div className="form-row">
              <div className="form-group"><label>Price per Shift (Rs) *</label><input name="price_per_hour" className="form-input" type="number" min="1" defaultValue={lib?.price_per_hour || ''} required /></div>
              <div className="form-group"><label>Monthly Plan (Rs)</label><input name="price_monthly" className="form-input" type="number" min="1" defaultValue={lib?.price_monthly || ''} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>3-Month Plan (Rs)</label><input name="price_3monthly" className="form-input" type="number" min="1" defaultValue={lib?.price_3monthly || ''} /></div>
              <div className="form-group"><label>6-Month Plan (Rs)</label><input name="price_6monthly" className="form-input" type="number" min="1" defaultValue={lib?.price_6monthly || ''} /></div>
            </div>
            <div className="form-group" style={{ maxWidth: 'calc(50% - 7px)' }}><label>Annual Plan (Rs)</label><input name="price_annual" className="form-input" type="number" min="1" defaultValue={lib?.price_annual || ''} /></div>
          </div>

          <div className="field-section">
            <h3>Photos</h3>
            {photos.map((url, index) => (
              <div key={index} className="photo-row">
                {url ? <img className="photo-preview" src={url} alt="" onError={ev => { ev.currentTarget.style.opacity = '.2' }} /> : <div className="photo-preview" />}
                <input className="form-input" value={url} onChange={ev => setPhotos(prev => prev.map((item, idx) => idx === index ? ev.target.value.trim() : item))} />
                <button type="button" className="btn-danger" style={{ width: 36, height: 36, padding: 0 }} onClick={() => setPhotos(prev => prev.filter((_, idx) => idx !== index))}>X</button>
              </div>
            ))}
            {photos.length < 6 && <button type="button" className="btn-ghost-sm" style={{ marginTop: 8 }} onClick={() => setPhotos(prev => [...prev, ''])}>+ Add Another Photo</button>}
          </div>

          <div className="field-section">
            <h3>Amenities</h3>
            <AmenityInput amenities={amenities} setAmenities={setAmenities} />
          </div>

          <button className="btn-red btn-block" type="submit" disabled={busy}>{busy ? 'Saving...' : isEdit ? 'Save Changes' : 'List My Library'}</button>
        </form>
      </div>
    </div>
  )
}

export function SeatEditor() {
  const { S, set, go, saveSeatLayout } = useApp()
  const lib = S.ownerLibrary
  const [floors, setFloors] = useState(() => clone(S.gridFloors || lib?.floors_config || [newFloor(0)]))
  const [gridTool, setGridTool] = useState(S.gridTool || 'add')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setFloors(clone(S.gridFloors || lib?.floors_config || [newFloor(0)]))
  }, [S.gridFloors, lib])

  const floor = floors[S.activeFloor] || floors[0]
  const room = floor?.rooms[S.activeRoom] || floor?.rooms[0]

  const updateFloors = updater => {
    setFloors(prev => {
      const draft = clone(prev)
      updater(draft)
      return draft
    })
  }

  const addFloor = () => updateFloors(draft => {
    draft.push(newFloor(draft.length))
    set({ activeFloor: draft.length - 1, activeRoom: 0 })
  })

  const addRoom = () => updateFloors(draft => {
    const targetFloor = draft[S.activeFloor]
    targetFloor.rooms.push(newRoom(targetFloor.rooms.length))
    set({ activeRoom: targetFloor.rooms.length - 1 })
  })

  const removeFloor = floorIndex => {
    if (floors.length === 1) { toast('At least one floor is required.', 'error'); return }
    updateFloors(draft => { draft.splice(floorIndex, 1) })
    set({ activeFloor: Math.max(0, floorIndex - 1), activeRoom: 0 })
  }

  const removeRoom = roomIndex => {
    if ((floor?.rooms.length || 0) === 1) { toast('At least one room is required.', 'error'); return }
    updateFloors(draft => { draft[S.activeFloor].rooms.splice(roomIndex, 1) })
    set({ activeRoom: Math.max(0, roomIndex - 1) })
  }

  const handleSave = async () => {
    setSaving(true)
    const ok = await saveSeatLayout(floors)
    if (ok) {
      set({ gridFloors: clone(floors) })
      toast(`Layout saved for ${roomSeatCount(floors)} seats.`)
      go('owner-dash')
    } else {
      toast('Layout save failed', 'error')
    }
    setSaving(false)
  }

  if (!lib) return <div className="container-sm"><p>Please create your library first.</p></div>

  return (
    <div className="container" style={{ maxWidth: 1100 }}>
      <button className="back-link" onClick={() => go('owner-dash')}>Back to Dashboard</button>
      <h1 style={{ fontFamily: '"Cormorant Garamond",serif', fontSize: 34, marginBottom: 6 }}>Seat Layout Editor</h1>
      <p style={{ color: 'var(--mutedl)', marginBottom: 24 }}>{lib.name}</p>

      <div className="card" style={{ padding: 22, marginBottom: 14 }}>
        <div className="planner-topbar">
          <div className="planner-group">
            {floors.map((item, floorIndex) => (
              <div key={item.id} className={`planner-chip ${floorIndex === S.activeFloor ? 'on' : ''}`}>
                <button type="button" onClick={() => set({ activeFloor: floorIndex, activeRoom: 0 })}>{item.name}</button>
                <button type="button" className="planner-chip-x" onClick={() => removeFloor(floorIndex)}>X</button>
              </div>
            ))}
            <button type="button" className="btn-ghost-sm" onClick={addFloor}>+ Add Floor</button>
          </div>

          <div className="planner-group">
            {floor?.rooms.map((item, roomIndex) => (
              <div key={item.id} className={`planner-chip subtle ${roomIndex === S.activeRoom ? 'on' : ''}`}>
                <button type="button" onClick={() => set({ activeRoom: roomIndex })}>{item.name}</button>
                <button type="button" className="planner-chip-x" onClick={() => removeRoom(roomIndex)}>X</button>
              </div>
            ))}
            <button type="button" className="btn-ghost-sm" onClick={addRoom}>+ Add Room</button>
          </div>
        </div>

        <RoomPlan
          floors={floors}
          activeFloor={S.activeFloor}
          activeRoom={S.activeRoom}
          onSelectRoom={roomIndex => set({ activeRoom: roomIndex })}
          onChange={updateFloors}
        />

        <div className="card" style={{ padding: 18, marginBottom: 14 }}>
          <h2 style={{ fontFamily: '"Cormorant Garamond",serif', fontSize: 18, marginBottom: 10 }}>Start with a Preset</h2>
          <div className="lib-preset-grid">
            {LAYOUT_PRESETS.map(preset => (
              <div key={preset.id} className={`lib-preset-card ${S.editorPreset === preset.id ? 'on' : ''}`} onClick={() => {
                updateFloors(draft => {
                  draft[S.activeFloor].rooms[S.activeRoom].seats = createPresetSeats(preset, room.cols)
                })
                set({ editorPreset: preset.id })
              }}>
                <span className="lp-icon">{preset.icon}</span>
                <div className="lp-name">{preset.name}</div>
                <div className="lp-desc">{preset.desc}</div>
              </div>
            ))}
            <div className={`lib-preset-card ${S.editorPreset === 'blank' ? 'on' : ''}`} onClick={() => {
              updateFloors(draft => { draft[S.activeFloor].rooms[S.activeRoom].seats = [] })
              set({ editorPreset: 'blank' })
            }}>
              <span className="lp-icon">+</span>
              <div className="lp-name">Blank Canvas</div>
              <div className="lp-desc">Place every seat manually.</div>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px', gap: 12, marginBottom: 14 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Room Name</label>
              <input className="form-input" value={room?.name || ''} onChange={ev => updateFloors(draft => { draft[S.activeFloor].rooms[S.activeRoom].name = ev.target.value })} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Cols</label>
              <input className="form-input" type="number" min="8" max="30" value={room?.cols || 20} onChange={ev => updateFloors(draft => { draft[S.activeFloor].rooms[S.activeRoom].cols = Math.max(8, Math.min(30, Number(ev.target.value) || 20)) })} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Rows</label>
              <input className="form-input" type="number" min="4" max="24" value={room?.rows || 14} onChange={ev => updateFloors(draft => { draft[S.activeFloor].rooms[S.activeRoom].rows = Math.max(4, Math.min(24, Number(ev.target.value) || 14)) })} />
            </div>
          </div>

          <div className="sge-toolbar">
            {[['add', 'Add / Toggle'], ['move', 'Move'], ['erase', 'Erase']].map(([tool, label]) => (
              <button key={tool} className={`sge-tool ${gridTool === tool ? 'on' : ''}`} onClick={() => { setGridTool(tool); set({ gridTool: tool }) }}>{label}</button>
            ))}
            <div className="sge-sep" />
            <span className="sge-stat"><strong>{room?.seats.length || 0}</strong> seats in this room</span>
            <div className="sge-sep" />
            <button className="btn-ghost-sm" onClick={() => updateFloors(draft => { draft[S.activeFloor].rooms[S.activeRoom].seats = [] })}>Clear Room</button>
            <button className="btn-ghost-sm" onClick={() => updateFloors(draft => { draft[S.activeFloor].rooms[S.activeRoom].seats = autoLabelSeats(draft[S.activeFloor].rooms[S.activeRoom].seats) })}>Auto-label</button>
          </div>

          {room && (
            <SeatGrid
              room={room}
              tool={gridTool}
              onChange={nextSeats => updateFloors(draft => { draft[S.activeFloor].rooms[S.activeRoom].seats = nextSeats })}
            />
          )}
          <p style={{ color: 'var(--mutedl)', fontSize: 12, marginTop: 8 }}>Use Add to place seats, Move to drag them around, and Erase to remove them.</p>
        </div>
      </div>

      <div style={{ background: 'rgba(200,54,74,.05)', border: '1px solid rgba(200,54,74,.15)', borderRadius: 12, padding: 14, marginBottom: 18, fontSize: 13, color: 'var(--mutedl)', lineHeight: 1.65 }}>
        Saving stores the floor and room arrangement on the library and syncs the student-facing booking layout from the same configuration.
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button className="btn-red" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : `Save All Floors (${roomSeatCount(floors)} seats)`}</button>
        <button className="btn-outline" onClick={() => setFloors(clone(lib.floors_config || [newFloor(0)]))}>Reset to Saved</button>
      </div>
    </div>
  )
}

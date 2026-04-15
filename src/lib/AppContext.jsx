import { createContext, useContext, useState, useCallback } from 'react'
import {
  DEMO_PROFILE, DEMO_OWNER, DEMO_BOOKINGS, DEMO_SUBSCRIPTIONS,
  DEMO_LIBS, DEMO_OWNER_BOOKINGS, makeDemoSeats,
} from './constants'
import { DEMO_MODE, sb } from './supabase'

const AppCtx = createContext(null)
export const useApp = () => useContext(AppCtx)

const INITIAL = {
  view: 'landing',
  user: null, profile: null, userMode: 'student',
  authModal: false, authMode: 'login', authRole: 'student',
  loading: false,
  libraries: [], searchQ: '', filterTag: 'All',
  selectedLib: null, libReviews: [],
  seats: [], selectedSeats: [], selectedSlot: null,
  selectedPlan: 'hourly',
  payMethod: 'upi', bookingDone: false, confirmedBookingId: null,
  myBookings: [], mySubscriptions: [],
  ownerLibrary: null, ownerBookings: [], ownerSeats: [], ownerTab: 'bookings',
  reviewModal: null, reviewRating: 0, reviewText: '',
  addLibAmenities: [], addLibLayout: 'grid', addLibPhotos: ['', '', ''],
  addLibShift: [3], addLibOpen: '06:00', addLibClose: '22:00',
  gridSeats: [], gridTool: 'add', gridCols: 20, gridRows: 14, gridDrag: null,
  gridFloors: null, activeFloor: 0, activeRoom: 0, seatNaming: 'alpha-num',
  editorPreset: null,
  lightboxUrl: null, introBusy: false,
}

const FALLBACK_FLOORS = [
  {
    id: 'f1',
    name: 'Ground Floor',
    rooms: [{ id: 'r1', name: 'Main Hall', cols: 20, rows: 14, px: 8, py: 12, pw: 32, ph: 34, seats: [] }],
  },
]

const clone = value => JSON.parse(JSON.stringify(value))
const todayStr = () => new Date().toISOString().split('T')[0]

const normalizeRoom = (room, roomIndex = 0) => ({
  id: room?.id || `r${roomIndex + 1}`,
  name: room?.name || `Room ${roomIndex + 1}`,
  cols: Math.max(8, Math.min(30, room?.cols || 20)),
  rows: Math.max(4, Math.min(24, room?.rows || 14)),
  px: typeof room?.px === 'number' ? room.px : 5 + (roomIndex % 3) * 32,
  py: typeof room?.py === 'number' ? room.py : 10 + Math.floor(roomIndex / 3) * 42,
  pw: typeof room?.pw === 'number' ? room.pw : 28,
  ph: typeof room?.ph === 'number' ? room.ph : 36,
  seats: (room?.seats || []).map(seat => ({
    r: seat.r ?? seat.grid_r ?? 0,
    c: seat.c ?? seat.grid_c ?? 0,
    label: seat.label || seat.seat_label || '?',
    status: seat.status || 'available',
    id: seat.id || null,
  })),
})

const normalizeFloors = floors => {
  const source = Array.isArray(floors) && floors.length ? floors : FALLBACK_FLOORS
  return source.map((floor, floorIndex) => ({
    id: floor?.id || `f${floorIndex + 1}`,
    name: floor?.name || (floorIndex === 0 ? 'Ground Floor' : `Floor ${floorIndex + 1}`),
    rooms: (floor?.rooms || []).length
      ? floor.rooms.map((room, roomIndex) => normalizeRoom(room, roomIndex))
      : [normalizeRoom(null, 0)],
  }))
}

const inferRowLabel = label => {
  const raw = String(label || '').trim()
  const match = raw.match(/^[A-Za-z]+/)
  return match ? match[0].toUpperCase() : 'R'
}

const inferSeatNumber = (label, fallback) => {
  const raw = String(label || '').trim()
  const match = raw.match(/(\d+)\s*$/)
  return match ? Number(match[1]) : fallback + 1
}

const splitSlot = slot => String(slot || '').split(/\s+-\s+|\s+â€“\s+/)

const buildSeatPayload = (libraryId, floors) => {
  const payload = []
  normalizeFloors(floors).forEach((floor, floorIndex) => {
    floor.rooms.forEach((room, roomIndex) => {
      room.seats.forEach((seat, seatIndex) => {
        payload.push({
          library_id: libraryId,
          floor_id: floor.id,
          floor_name: floor.name,
          floor_index: floorIndex,
          room_id: room.id,
          room_name: room.name,
          room_index: roomIndex,
          grid_r: seat.r,
          grid_c: seat.c,
          row_label: inferRowLabel(seat.label),
          seat_number: inferSeatNumber(seat.label, seatIndex),
          label: seat.label || `${inferRowLabel(seat.label)}${inferSeatNumber(seat.label, seatIndex)}`,
          status: seat.status === 'maintenance' ? 'maintenance' : 'available',
        })
      })
    })
  })
  return payload
}

const normalizeLibrary = lib => {
  if (!lib) return lib
  const floors = normalizeFloors(lib.floors_config)
  return {
    ...lib,
    floors_config: floors,
    seat_grid: lib.seat_grid || floors[0]?.rooms[0]?.seats || [],
    total_seats: typeof lib.total_seats === 'number'
      ? lib.total_seats
      : floors.reduce((sum, floor) => sum + floor.rooms.reduce((roomSum, room) => roomSum + room.seats.length, 0), 0),
  }
}

export function AppProvider({ children }) {
  const [S, setS] = useState(INITIAL)
  const set = useCallback(patch => setS(prev => ({ ...prev, ...patch })), [])
  const go = useCallback(view => {
    setS(prev => ({ ...prev, view }))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const demoLogin = role => {
    if (role === 'owner') {
      const ownerLibrary = normalizeLibrary({ ...DEMO_LIBS[0] })
      set({
        user: { id: 'demo-owner-1' },
        profile: { ...DEMO_OWNER },
        userMode: 'owner',
        ownerLibrary,
        ownerBookings: [...DEMO_OWNER_BOOKINGS],
        ownerSeats: makeDemoSeats('l1'),
        gridFloors: clone(ownerLibrary.floors_config),
        authModal: false,
      })
      return
    }
    set({
      user: { id: 'demo-user-1' },
      profile: { ...DEMO_PROFILE },
      userMode: 'student',
      myBookings: [...DEMO_BOOKINGS],
      mySubscriptions: [...DEMO_SUBSCRIPTIONS],
      authModal: false,
    })
  }

  const syncSelectedLibrary = useCallback(lib => {
    setS(prev => ({
      ...prev,
      selectedLib: prev.selectedLib?.id === lib.id ? lib : prev.selectedLib,
      libraries: prev.libraries.map(item => (item.id === lib.id ? lib : item)),
      ownerLibrary: prev.ownerLibrary?.id === lib.id ? lib : prev.ownerLibrary,
    }))
  }, [])

  const ensureProfile = useCallback(async user => {
    const { data: existing } = await sb.from('profiles').select('*').eq('id', user.id).maybeSingle()
    if (existing) return existing
    const metadata = user.user_metadata || {}
    const profileSeed = {
      id: user.id,
      email: user.email,
      full_name: metadata.full_name || metadata.name || user.email?.split('@')[0] || 'StudySpace User',
      role: metadata.role === 'owner' ? 'owner' : 'student',
    }
    const { data, error } = await sb.from('profiles').insert(profileSeed).select().single()
    if (error) throw error
    return data
  }, [])

  const hydrateAuth = useCallback(async user => {
    if (!user || DEMO_MODE) return
    const profile = await ensureProfile(user)
    const next = { user, profile, userMode: profile.role, authModal: false }
    if (profile.role === 'owner') {
      const { data: lib } = await sb.from('libraries').select('*').eq('owner_id', user.id).maybeSingle()
      const ownerLibrary = normalizeLibrary(lib)
      next.ownerLibrary = ownerLibrary || null
      next.gridFloors = ownerLibrary ? clone(ownerLibrary.floors_config) : null
      if (ownerLibrary) {
        const { data: bks } = await sb.from('bookings').select('*,student:profiles(full_name)')
          .eq('library_id', ownerLibrary.id).order('created_at', { ascending: false }).limit(50)
        const { data: seats } = await sb.from('seats').select('*').eq('library_id', ownerLibrary.id)
          .order('floor_index').order('room_index').order('grid_r').order('grid_c')
        next.ownerBookings = bks || []
        next.ownerSeats = seats || []
      }
    } else {
      const { data: bookings } = await sb.from('bookings').select('*,library:libraries(id,name,location)')
        .eq('student_id', user.id).order('created_at', { ascending: false })
      const { data: subscriptions } = await sb.from('subscriptions').select('*,library:libraries(id,name,location)')
        .eq('student_id', user.id).order('created_at', { ascending: false })
      next.myBookings = bookings || []
      next.mySubscriptions = subscriptions || []
    }
    setS(prev => ({ ...prev, ...next }))
  }, [ensureProfile])

  const initAuth = useCallback(async () => {
    if (DEMO_MODE || !sb) return
    const { data } = await sb.auth.getSession()
    if (data?.session?.user) await hydrateAuth(data.session.user)
    sb.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) await hydrateAuth(session.user)
      else setS(prev => ({ ...prev, user: null, profile: null, userMode: 'student', ownerLibrary: null, ownerSeats: [], ownerBookings: [], myBookings: [], mySubscriptions: [] }))
    })
  }, [hydrateAuth])

  const doLogout = async () => {
    if (!DEMO_MODE && sb) await sb.auth.signOut()
    setS({ ...INITIAL })
    go('landing')
  }

  const fetchLibraries = async () => {
    if (DEMO_MODE) {
      const q = S.searchQ.toLowerCase()
      setS(prev => ({
        ...prev,
        libraries: DEMO_LIBS
          .map(normalizeLibrary)
          .filter(l =>
            (!q || l.name.toLowerCase().includes(q) || l.location.toLowerCase().includes(q)) &&
            (prev.filterTag === 'All' || l.tag === prev.filterTag),
          ),
      }))
      return
    }
    set({ loading: true })
    let query = sb.from('libraries').select('*').eq('is_active', true).order('rating', { ascending: false })
    if (S.filterTag !== 'All') query = query.eq('tag', S.filterTag)
    if (S.searchQ) query = query.or(`name.ilike.%${S.searchQ}%,location.ilike.%${S.searchQ}%`)
    const { data } = await query
    set({ libraries: (data || []).map(normalizeLibrary), loading: false })
  }

  const fetchSeats = async libId => {
    const lib = S.libraries.find(item => item.id === libId) || S.selectedLib || S.ownerLibrary
    if (DEMO_MODE) {
      const all = makeDemoSeats(libId)
      if (S.selectedSlot) all.forEach(seat => { if (Math.random() > 0.62) seat.status = 'booked' })
      set({ seats: all, selectedLib: normalizeLibrary(lib) })
      return
    }

    const { data: all } = await sb.from('seats').select('*').eq('library_id', libId)
      .order('floor_index').order('room_index').order('grid_r').order('grid_c')

    const bookedIds = new Set()
    if (S.selectedSlot) {
      const start = splitSlot(S.selectedSlot)[0] + ':00'
      const { data: bookings } = await sb.from('bookings').select('seat_ids')
        .eq('library_id', libId).eq('booking_date', todayStr()).eq('slot_start', start).eq('status', 'confirmed')
      if (bookings) bookings.forEach(booking => (booking.seat_ids || []).forEach(id => bookedIds.add(id)))
    }

    const seats = (all || []).map((seat, index) => ({
      ...seat,
      label: seat.label || `${seat.row_label || 'R'}${seat.seat_number || index + 1}`,
      status: seat.status === 'maintenance' ? 'maintenance' : bookedIds.has(seat.id) ? 'booked' : 'available',
    }))

    set({
      seats,
      selectedLib: normalizeLibrary(lib),
    })
  }

  const fetchLibReviews = async libId => {
    if (DEMO_MODE) { set({ libReviews: [] }); return }
    const { data } = await sb.from('reviews').select('*,student:profiles(full_name)')
      .eq('library_id', libId).order('created_at', { ascending: false }).limit(10)
    set({ libReviews: data || [] })
  }

  const fetchMyBookings = async () => {
    if (DEMO_MODE || !S.user) return
    const { data } = await sb.from('bookings').select('*,library:libraries(id,name,location)')
      .eq('student_id', S.user.id).order('created_at', { ascending: false })
    set({ myBookings: data || [] })
  }

  const fetchMySubscriptions = async () => {
    if (DEMO_MODE || !S.user) return
    const { data } = await sb.from('subscriptions').select('*,library:libraries(id,name,location)')
      .eq('student_id', S.user.id).order('created_at', { ascending: false })
    set({ mySubscriptions: data || [] })
  }

  const fetchOwnerData = async () => {
    if (DEMO_MODE || !S.user) return
    set({ loading: true })
    const { data: lib } = await sb.from('libraries').select('*').eq('owner_id', S.user.id).maybeSingle()
    const ownerLibrary = normalizeLibrary(lib)
    set({ ownerLibrary: ownerLibrary || null, gridFloors: ownerLibrary ? clone(ownerLibrary.floors_config) : null })
    if (ownerLibrary) {
      const { data: bookings } = await sb.from('bookings').select('*,student:profiles(full_name)')
        .eq('library_id', ownerLibrary.id).order('created_at', { ascending: false }).limit(50)
      const { data: seats } = await sb.from('seats').select('*').eq('library_id', ownerLibrary.id)
        .order('floor_index').order('room_index').order('grid_r').order('grid_c')
      set({ ownerBookings: bookings || [], ownerSeats: seats || [] })
    }
    set({ loading: false })
  }

  const createBooking = async () => {
    const lib = S.selectedLib
    const total = S.selectedSeats.length * (lib.price_per_hour || 0) * 3
    if (DEMO_MODE) {
      const id = 'bk-' + Date.now()
      setS(prev => ({
        ...prev,
        confirmedBookingId: id,
        bookingDone: true,
        myBookings: [{
          id,
          student_id: prev.user.id,
          library_id: lib.id,
          seat_ids: prev.selectedSeats.map(seat => seat.id),
          booking_date: todayStr(),
          slot_start: splitSlot(prev.selectedSlot)[0] + ':00:00',
          slot_end: splitSlot(prev.selectedSlot)[1] + ':00:00',
          duration_hours: 3,
          total_amount: total,
          payment_method: prev.payMethod,
          status: 'confirmed',
          library: { id: lib.id, name: lib.name, location: lib.location },
        }, ...prev.myBookings],
      }))
      return true
    }
    const parts = splitSlot(S.selectedSlot)
    const { data, error } = await sb.from('bookings').insert({
      student_id: S.user.id,
      library_id: lib.id,
      seat_ids: S.selectedSeats.map(seat => seat.id),
      booking_date: todayStr(),
      slot_start: parts[0] + ':00',
      slot_end: parts[1] === '00:00' ? '00:00:00' : parts[1] + ':00',
      duration_hours: 3,
      total_amount: total,
      payment_method: S.payMethod,
      status: 'confirmed',
    }).select().single()
    if (error) return false
    set({ confirmedBookingId: data.id, bookingDone: true })
    return true
  }

  const createSubscription = async plan => {
    const lib = S.selectedLib
    const priceField = { monthly: 'price_monthly', quarterly: 'price_3monthly', halfyear: 'price_6monthly', annual: 'price_annual' }[plan]
    const amount = lib[priceField] || 0
    const durMonths = { monthly: 1, quarterly: 3, halfyear: 6, annual: 12 }[plan]
    const start = new Date()
    const end = new Date()
    end.setMonth(end.getMonth() + durMonths)
    const startStr = start.toISOString().split('T')[0]
    const endStr = end.toISOString().split('T')[0]
    if (DEMO_MODE) {
      const id = 'sub-' + Date.now()
      setS(prev => ({
        ...prev,
        confirmedBookingId: id,
        bookingDone: true,
        mySubscriptions: [{
          id,
          student_id: prev.user.id,
          library_id: lib.id,
          plan,
          start_date: startStr,
          end_date: endStr,
          amount,
          status: 'active',
          library: { id: lib.id, name: lib.name, location: lib.location },
        }, ...prev.mySubscriptions],
      }))
      return true
    }
    const { data, error } = await sb.from('subscriptions').insert({
      student_id: S.user.id,
      library_id: lib.id,
      plan,
      start_date: startStr,
      end_date: endStr,
      amount,
      payment_method: S.payMethod,
      status: 'active',
    }).select().single()
    if (error) return false
    set({ confirmedBookingId: data.id, bookingDone: true })
    return true
  }

  const cancelBooking = async id => {
    if (DEMO_MODE) {
      setS(prev => ({ ...prev, myBookings: prev.myBookings.map(booking => booking.id === id ? { ...booking, status: 'cancelled' } : booking) }))
      return
    }
    await sb.from('bookings').update({ status: 'cancelled' }).eq('id', id).eq('student_id', S.user.id)
    await fetchMyBookings()
  }

  const submitReview = async () => {
    if (S.reviewRating === 0) return false
    if (DEMO_MODE) {
      set({ reviewModal: null, reviewRating: 0, reviewText: '' })
      return true
    }
    const { error } = await sb.from('reviews').upsert({
      student_id: S.user.id,
      library_id: S.reviewModal.library_id,
      rating: S.reviewRating,
      comment: S.reviewText,
    }, { onConflict: 'student_id,library_id' })
    if (error) return false
    set({ reviewModal: null, reviewRating: 0, reviewText: '' })
    return true
  }

  const saveLibrary = async data => {
    if (DEMO_MODE) {
      const nextLib = normalizeLibrary(S.ownerLibrary ? { ...S.ownerLibrary, ...data } : {
        ...data,
        id: 'l-new',
        owner_id: 'demo-owner-1',
        rating: 5.0,
        reviews_count: 0,
        is_active: true,
      })
      setS(prev => ({
        ...prev,
        ownerLibrary: nextLib,
        libraries: prev.libraries.some(lib => lib.id === nextLib.id)
          ? prev.libraries.map(lib => lib.id === nextLib.id ? nextLib : lib)
          : [nextLib, ...prev.libraries],
        ownerSeats: nextLib.floors_config.flatMap(floor => floor.rooms.flatMap(room => room.seats.map((seat, index) => ({
          id: `${nextLib.id}-${floor.id}-${room.id}-${index + 1}`,
          library_id: nextLib.id,
          row_label: inferRowLabel(seat.label),
          seat_number: inferSeatNumber(seat.label, index),
          label: seat.label,
          grid_r: seat.r,
          grid_c: seat.c,
          floor_name: floor.name,
          room_name: room.name,
          status: seat.status,
        }))),
        ),
      }))
      return true
    }

    const payload = { ...data }
    delete payload.id
    delete payload.owner_id
    delete payload.rating
    delete payload.reviews_count

    if (S.ownerLibrary?.id) {
      const { error } = await sb.from('libraries').update(payload).eq('id', S.ownerLibrary.id)
      if (error) return false
    } else {
      const { data: lib, error } = await sb.from('libraries').insert({ ...payload, owner_id: S.user.id }).select().single()
      if (error) return false
      syncSelectedLibrary(normalizeLibrary(lib))
    }
    await fetchOwnerData()
    await fetchLibraries()
    return true
  }

  const saveSeatLayout = async floors => {
    if (!S.ownerLibrary) return false
    const normalizedFloors = normalizeFloors(floors)
    const flatSeats = buildSeatPayload(S.ownerLibrary.id, normalizedFloors)
    const layoutPatch = {
      floors_config: normalizedFloors,
      seat_grid: normalizedFloors[0]?.rooms[0]?.seats || [],
      total_seats: flatSeats.length,
    }

    if (DEMO_MODE) {
      const nextLibrary = normalizeLibrary({ ...S.ownerLibrary, ...layoutPatch })
      setS(prev => ({
        ...prev,
        ownerLibrary: nextLibrary,
        selectedLib: prev.selectedLib?.id === nextLibrary.id ? nextLibrary : prev.selectedLib,
        gridFloors: clone(normalizedFloors),
        ownerSeats: flatSeats.map((seat, index) => ({ ...seat, id: `demo-seat-${index + 1}` })),
      }))
      return true
    }

    const { error: libraryError } = await sb.from('libraries').update(layoutPatch).eq('id', S.ownerLibrary.id)
    if (libraryError) return false

    const { data: existingSeats } = await sb.from('seats').select('*').eq('library_id', S.ownerLibrary.id)
    const reusable = [...(existingSeats || [])]
    const updateJobs = []
    const insertPayload = []

    flatSeats.forEach((seat, index) => {
      const current = reusable[index]
      if (current) {
        updateJobs.push(sb.from('seats').update(seat).eq('id', current.id))
      } else {
        insertPayload.push(seat)
      }
    })

    const extraSeats = reusable.slice(flatSeats.length)
    if (insertPayload.length) {
      const { error } = await sb.from('seats').insert(insertPayload)
      if (error) return false
    }
    for (const job of updateJobs) {
      const { error } = await job
      if (error) return false
    }
    for (const seat of extraSeats) {
      const { error } = await sb.from('seats').delete().eq('id', seat.id)
      if (error) return false
    }

    const nextLibrary = normalizeLibrary({ ...S.ownerLibrary, ...layoutPatch })
    syncSelectedLibrary(nextLibrary)
    set({ ownerLibrary: nextLibrary, gridFloors: clone(normalizedFloors) })
    await fetchOwnerData()
    return true
  }

  return (
    <AppCtx.Provider value={{
      S, set, go,
      demoLogin, doLogout, initAuth,
      fetchLibraries, fetchSeats, fetchLibReviews,
      fetchMyBookings, fetchMySubscriptions, fetchOwnerData,
      createBooking, createSubscription, cancelBooking, submitReview,
      saveLibrary, saveSeatLayout,
      hydrateAuth, ensureProfile, todayStr,
    }}>
      {children}
    </AppCtx.Provider>
  )
}

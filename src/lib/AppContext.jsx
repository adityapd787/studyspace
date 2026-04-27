import { createContext, useContext, useState, useCallback } from 'react'
import { DEMO_PROFILE, DEMO_OWNER, DEMO_BOOKINGS, DEMO_SUBSCRIPTIONS,
         DEMO_LIBS, DEMO_OWNER_BOOKINGS, makeDemoSeats } from './constants'
import { DEMO_MODE, sb } from './supabase'

const AppCtx = createContext(null)
export const useApp = () => useContext(AppCtx)

const INITIAL = {
  view: 'landing',
  user: null, profile: null, userMode: 'student',
  authModal: false, authMode: 'login', authRole: 'student',
  loading: false,
  selectedDate: new Date().toISOString().split('T')[0],
  announcements: [],  // [{id,library_id,lib_name,message,created_at}]
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

export function AppProvider({ children }) {
  const [S, setS] = useState(INITIAL)
  const set = useCallback(patch => setS(prev => ({ ...prev, ...patch })), [])
  const go  = useCallback(view  => { setS(prev => ({ ...prev, view })); window.scrollTo({ top: 0 }) }, [])

  // ── helpers ──────────────────────────────────────────────────
  const todayStr = () => new Date().toISOString().split('T')[0]
  const cloneFloorsConfig = (floorsConfig) => {
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

  // ── AUTH ─────────────────────────────────────────────────────
  const demoLogin = (role) => {
    if (role === 'owner') {
      set({ user:{id:'demo-owner-1'}, profile:{...DEMO_OWNER}, userMode:'owner',
            ownerLibrary:{...DEMO_LIBS[0]}, ownerBookings:[...DEMO_OWNER_BOOKINGS],
            ownerSeats:makeDemoSeats('l1'), authModal:false })
    } else {
      set({ user:{id:'demo-user-1'}, profile:{...DEMO_PROFILE}, userMode:'student',
            myBookings:[...DEMO_BOOKINGS], mySubscriptions:[...DEMO_SUBSCRIPTIONS], authModal:false })
    }
  }

  const doLogout = async () => {
    if (!DEMO_MODE && sb) await sb.auth.signOut()
    setS({ ...INITIAL })
    go('landing')
  }

  // ── DATA ─────────────────────────────────────────────────────
  const fetchLibraries = async () => {
    if (DEMO_MODE) {
      const q = S.searchQ.toLowerCase()
      setS(prev => ({
        ...prev,
        libraries: DEMO_LIBS.filter(l =>
          (!q || l.name.toLowerCase().includes(q) || l.location.toLowerCase().includes(q)) &&
          (prev.filterTag === 'All' || l.tag === prev.filterTag)
        )
      }))
      return
    }
    set({ loading: true })
    let q = sb.from('libraries').select('*').eq('is_active', true).order('rating', { ascending: false })
    if (S.filterTag !== 'All') q = q.eq('tag', S.filterTag)
    if (S.searchQ) q = q.or(`name.ilike.%${S.searchQ}%,location.ilike.%${S.searchQ}%`)
    const { data } = await q
    set({ libraries: data || [], loading: false })
  }

  const fetchSeats = async (libId) => {
    if (DEMO_MODE) {
      const all = makeDemoSeats(libId)
      if (S.selectedSlot) all.forEach(s => { if (Math.random() > 0.62) s.status = 'booked' })
      set({ seats: all }); return
    }
    const { data: all } = await sb.from('seats').select('*').eq('library_id', libId)
      .order('row_label').order('seat_number')
    if (!all) { set({ seats: [] }); return }
    const bookedIds = []
    if (S.selectedSlot) {
      const start = S.selectedSlot.split(' – ')[0] + ':00'
      const { data: bks } = await sb.from('bookings').select('seat_ids')
        .eq('library_id', libId).eq('booking_date', S.selectedDate).eq('slot_start', start).eq('status', 'confirmed')
      if (bks) bks.forEach(b => bookedIds.push(...(b.seat_ids || [])))
    }
    set({ seats: all.map(s => ({ ...s, status: s.status === 'maintenance' ? 'booked' : bookedIds.includes(s.id) ? 'booked' : 'available' })) })
  }

  const fetchLibReviews = async (libId) => {
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
    set({ ownerLibrary: lib || null })
    if (lib) {
      const { data: bks } = await sb.from('bookings').select('*,student:profiles(full_name)')
        .eq('library_id', lib.id).order('created_at', { ascending: false }).limit(50)
      const { data: seats } = await sb.from('seats').select('*').eq('library_id', lib.id)
        .order('row_label').order('seat_number')
      // Restore gridFloors from saved floors_config so seat editor loads saved layout
      const restoredFloors = cloneFloorsConfig(lib.floors_config)
      set({ ownerBookings: bks || [], ownerSeats: seats || [],
            gridFloors: restoredFloors, activeFloor: 0, activeRoom: 0 })
    }
    set({ loading: false })
  }

  const createBooking = async () => {
    const lib = S.selectedLib
    const total = S.selectedSeats.length * (lib.price_per_hour || 0) * 3
    if (DEMO_MODE) {
      const id = 'bk-' + Date.now()
      setS(prev => ({
        ...prev, confirmedBookingId: id, bookingDone: true,
        myBookings: [{ id, student_id: prev.user.id, library_id: lib.id,
          seat_ids: prev.selectedSeats.map(s => s.id), booking_date: prev.selectedDate,
          slot_start: prev.selectedSlot.split(' – ')[0]+':00:00',
          slot_end: prev.selectedSlot.split(' – ')[1]+':00:00',
          duration_hours: 3, total_amount: total, payment_method: prev.payMethod,
          status: 'confirmed', library: { id: lib.id, name: lib.name, location: lib.location }
        }, ...prev.myBookings]
      }))
      return true
    }
    const parts = S.selectedSlot.split(' – ')
    const { data, error } = await sb.from('bookings').insert({
      student_id: S.user.id, library_id: lib.id, seat_ids: S.selectedSeats.map(s => s.id),
      booking_date: S.selectedDate, slot_start: parts[0]+':00',
      slot_end: parts[1] === '00:00' ? '00:00:00' : parts[1]+':00',
      duration_hours: 3, total_amount: total, payment_method: S.payMethod, status: 'confirmed'
    }).select().single()
    if (error) return false
    set({ confirmedBookingId: data.id, bookingDone: true })
    return true
  }

  const createSubscription = async (plan) => {
    const lib = S.selectedLib
    const priceField = { monthly:'price_monthly', quarterly:'price_3monthly', halfyear:'price_6monthly', annual:'price_annual' }[plan]
    const amount = lib[priceField] || 0
    const durMonths = { monthly:1, quarterly:3, halfyear:6, annual:12 }[plan]
    const start = new Date(); const end = new Date(); end.setMonth(end.getMonth() + durMonths)
    const startStr = start.toISOString().split('T')[0]; const endStr = end.toISOString().split('T')[0]
    if (DEMO_MODE) {
      const id = 'sub-' + Date.now()
      setS(prev => ({
        ...prev, confirmedBookingId: id, bookingDone: true,
        mySubscriptions: [{ id, student_id: prev.user.id, library_id: lib.id, plan,
          start_date: startStr, end_date: endStr, amount, status: 'active',
          library: { id: lib.id, name: lib.name, location: lib.location }
        }, ...prev.mySubscriptions]
      }))
      return true
    }
    const { data, error } = await sb.from('subscriptions').insert({
      student_id: S.user.id, library_id: lib.id, plan, start_date: startStr,
      end_date: endStr, amount, payment_method: S.payMethod, status: 'active'
    }).select().single()
    if (error) return false
    set({ confirmedBookingId: data.id, bookingDone: true })
    return true
  }

  const cancelBooking = async (id) => {
    if (DEMO_MODE) {
      setS(prev => ({ ...prev, myBookings: prev.myBookings.map(b => b.id === id ? { ...b, status: 'cancelled' } : b) }))
      return
    }
    await sb.from('bookings').update({ status: 'cancelled' }).eq('id', id).eq('student_id', S.user.id)
    await fetchMyBookings()
  }

  const submitReview = async () => {
    if (S.reviewRating === 0) return false
    if (DEMO_MODE) { set({ reviewModal: null, reviewRating: 0, reviewText: '' }); return true }
    const { error } = await sb.from('reviews').upsert({
      student_id: S.user.id, library_id: S.reviewModal.library_id,
      rating: S.reviewRating, comment: S.reviewText
    }, { onConflict: 'student_id,library_id' })
    if (error) return false
    set({ reviewModal: null, reviewRating: 0, reviewText: '' })
    return true
  }

  const saveLibrary = async (data) => {
    if (DEMO_MODE) {
      // Restore gridFloors from saved floors_config so editor reloads correctly
      const restoredFloors = cloneFloorsConfig(data.floors_config)
      if (S.ownerLibrary) {
        setS(prev => ({ ...prev, ownerLibrary: { ...prev.ownerLibrary, ...data },
          gridFloors: restoredFloors || prev.gridFloors }))
      } else {
        setS(prev => ({ ...prev,
          ownerLibrary: { ...data, id:'l-new', owner_id:'demo-owner-1', rating:5.0, reviews_count:0, is_active:true },
          ownerSeats: makeDemoSeats('l-new'),
          gridFloors: restoredFloors }))
      }
      return true
    }
    if (S.ownerLibrary) {
      const { error } = await sb.from('libraries').update(data).eq('id', S.ownerLibrary.id)
      if (error) return false
    } else {
      const { data: lib, error } = await sb.from('libraries').insert({ ...data, owner_id: S.user.id }).select().single()
      if (error) return false
      set({ ownerLibrary: lib })
    }
    // fetchOwnerData will also restore gridFloors from floors_config
    await fetchOwnerData()
    return true
  }

  const sendAnnouncement = async (message) => {
    const lib = S.ownerLibrary
    if (!lib || !message.trim()) return false
    const ann = { id: 'ann-'+Date.now(), library_id: lib.id, lib_name: lib.name,
      message: message.trim(), created_at: new Date().toISOString() }
    if (DEMO_MODE) {
      setS(prev => ({ ...prev, announcements: [ann, ...prev.announcements] }))
      return true
    }
    const { error } = await sb.from('announcements').insert({ library_id: lib.id, message: message.trim() })
    if (error) return false
    setS(prev => ({ ...prev, announcements: [ann, ...prev.announcements] }))
    return true
  }

  const fetchAnnouncements = async (libId) => {
    if (DEMO_MODE || !libId) return
    const { data } = await sb.from('announcements')
      .select('*,library:libraries(name)').eq('library_id', libId)
      .order('created_at', { ascending: false }).limit(10)
    if (data) setS(prev => ({ ...prev, announcements: data.map(a => ({...a, lib_name: a.library?.name})) }))
  }


  const initAuth = async () => {
    if (DEMO_MODE || !sb) return
    try {
      const { data: { session } } = await sb.auth.getSession()
      if (!session) return
      const u = session.user
      const { data: profile } = await sb.from('profiles').select('*').eq('id', u.id).maybeSingle()
      if (!profile) return
      if (profile.role === 'owner') {
        setS(prev => ({ ...prev, user: u, profile, userMode: 'owner' }))
        // fetchOwnerData is defined above, safe to call
        const { data: lib } = await sb.from('libraries').select('*').eq('owner_id', u.id).maybeSingle()
        if (lib) {
          const { data: bks } = await sb.from('bookings').select('*,student:profiles(full_name)').eq('library_id', lib.id).order('created_at', { ascending: false }).limit(50)
          const { data: seats } = await sb.from('seats').select('*').eq('library_id', lib.id)
          setS(prev => ({ ...prev, ownerLibrary: lib, ownerBookings: bks||[], ownerSeats: seats||[] }))
        }
      } else {
        setS(prev => ({ ...prev, user: u, profile, userMode: 'student' }))
      }
      sb.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_OUT') setS(prev => ({ ...INITIAL }))
      })
    } catch(err) {
      console.warn('initAuth error:', err)
    }
  }

  return (
    <AppCtx.Provider value={{
      S, set, go,
      demoLogin, doLogout,
      fetchLibraries, fetchSeats, fetchLibReviews,
      fetchMyBookings, fetchMySubscriptions, fetchOwnerData,
      createBooking, createSubscription, cancelBooking, submitReview, saveLibrary,
      sendAnnouncement, fetchAnnouncements, initAuth,
      todayStr,
    }}>
      {children}
    </AppCtx.Provider>
  )
}

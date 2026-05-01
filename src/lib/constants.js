// ── CONSTANTS ──────────────────────────────────────────────────
export const AMENITY_PRESETS = [
  'WiFi','Air Conditioning','Lockers','Café','Power Outlets','Silent Zone',
  'Printing','Parking','Filtered Water','Reading Material','Study Groups',
  'Private Rooms','24/7 Access','Whiteboard','Daily Newspaper','CCTV Security'
]

export const SUB_PLANS = [
  { id:'hourly',   label:'Per Hour',  perLabel:'per hour',   saveLabel:'',           field:'price_per_hour' },
  { id:'monthly',  label:'Monthly',   perLabel:'per month',  saveLabel:'',           field:'price_monthly' },
  { id:'quarterly',label:'3 Months',  perLabel:'per quarter',saveLabel:'Save ~10%',  field:'price_3monthly' },
  { id:'halfyear', label:'6 Months',  perLabel:'per 6 months',saveLabel:'Save ~20%', field:'price_6monthly' },
  { id:'annual',   label:'Annual',    perLabel:'per year',   saveLabel:'Best Value',  field:'price_annual' },
]

export const LAYOUT_PRESETS = [
  {
    id:'long-tables', name:'Long Tables', icon:'📏',
    desc:'Rows face each other across long tables. Most common in Indian libraries.',
    rows:[{label:'A',count:8,gap:4},{label:'B',count:8,gap:4},{label:'C',count:8,gap:4},{label:'D',count:8,gap:4},{label:'E',count:8,gap:4},{label:'F',count:8,gap:4}],
    paired:true,
  },
  {
    id:'carrel', name:'Carrel Style', icon:'🔲',
    desc:'Individual cubicles facing one wall. Ideal for silent zones.',
    rows:[{label:'A',count:5,gap:0},{label:'B',count:5,gap:0},{label:'C',count:5,gap:0},{label:'D',count:5,gap:0},{label:'E',count:5,gap:0},{label:'F',count:5,gap:0}],
    paired:false,
  },
  {
    id:'cluster', name:'Cluster Tables', icon:'⬡',
    desc:'Small 4-seat tables. Common in reading rooms.',
    rows:[{label:'T1',count:4,gap:2},{label:'T2',count:4,gap:2},{label:'T3',count:4,gap:2},{label:'T4',count:4,gap:2},{label:'T5',count:4,gap:2},{label:'T6',count:4,gap:2}],
    paired:false,
  },
  {
    id:'perimeter', name:'Perimeter + Centre', icon:'⬜',
    desc:'Wall seats + central tables. Common in premium libraries.',
    rows:[{label:'N1',count:6,gap:0},{label:'N2',count:6,gap:0},{label:'E',count:4,gap:0},{label:'W',count:4,gap:0},{label:'S1',count:6,gap:0},{label:'S2',count:6,gap:0},{label:'C1',count:4,gap:2},{label:'C2',count:4,gap:2}],
    paired:false,
  },
  {
    id:'classroom', name:'Classroom Rows', icon:'🏫',
    desc:'Straight rows facing front. Standard in exam reading rooms.',
    rows:[{label:'R1',count:10,gap:5},{label:'R2',count:10,gap:5},{label:'R3',count:10,gap:5},{label:'R4',count:10,gap:5},{label:'R5',count:10,gap:5}],
    paired:false,
  },
  {
    id:'mixed', name:'Mixed Zone', icon:'🏛️',
    desc:'Wall carrels + cluster tables. Best for large spaces.',
    rows:[{label:'CA',count:4,gap:0},{label:'CB',count:4,gap:0},{label:'CC',count:4,gap:0},{label:'T1',count:4,gap:2},{label:'T2',count:4,gap:2},{label:'T3',count:4,gap:2},{label:'T4',count:4,gap:2}],
    paired:false,
  },
]

// ── SHIFT / TIME HELPERS ───────────────────────────────────────
export function fmtMins(m) {
  m = m % 1440
  const h = Math.floor(m / 60) % 24
  const mm = m % 60
  return (h < 10 ? '0' : '') + h + ':' + (mm < 10 ? '0' : '') + mm
}

export function computeShifts(lib) {
  if (Array.isArray(lib.custom_shifts) && lib.custom_shifts.length) {
    return lib.custom_shifts.map(s => {
      const [sh, sm] = s.start.split(':').map(Number)
      const [eh, em] = s.end.split(':').map(Number)
      let startM = sh*60+(sm||0), endM = eh*60+(em||0)
      if (endM <= startM) endM += 24*60
      const durM = endM - startM
      const durH = durM / 60
      const label = Number.isInteger(durH) ? durH+'h' : Math.round(durM)+'min'
      return { slot: s.start + ' – ' + s.end, dur: label }
    })
  }
  const open = lib.hours_open || '06:00'
  const close = lib.hours_close || '22:00'
  const durs = Array.isArray(lib.shift_durations)
    ? lib.shift_durations
    : lib.shift_duration ? [lib.shift_duration] : [3]
  const [oh, om] = open.split(':').map(Number)
  const [ch, cm] = close.split(':').map(Number)
  let openM = oh * 60 + (om || 0)
  let closeM = ch * 60 + (cm || 0)
  if (closeM <= openM) closeM += 24 * 60
  const seen = {}
  const shifts = []
  durs.forEach(dur => {
    if (dur === 0) {
      const key = open + ' – ' + close
      if (!seen[key]) { seen[key] = true; shifts.push({ slot: key, dur: 'Full Day' }) }
    } else {
      let t = openM
      while (t + dur * 60 <= closeM) {
        const s = fmtMins(t); const e = fmtMins(t + dur * 60)
        const key = s + ' – ' + e
        if (!seen[key]) { seen[key] = true; shifts.push({ slot: key, dur: dur + 'h' }) }
        t += dur * 60
      }
    }
  })
  shifts.sort((a, b) => a.slot.localeCompare(b.slot))
  return shifts
}

// ── DEMO DATA ──────────────────────────────────────────────────
export const DEMO_LIBS = [
  { id:'l1', name:"The Scholar's Den", tag:'PREMIUM', tag_color:'#C8364A', location:'Hazratganj, Lucknow',
    price_per_hour:25, price_monthly:1800, price_3monthly:4999, price_6monthly:8999, price_annual:15999,
    total_seats:48, rating:4.8, reviews_count:124,
    amenities:['High-Speed WiFi','AC','Lockers','Café','Power Outlets','Silent Zone','Printing'],
    hours:'6:00 AM – 11:00 PM', hours_open:'06:00', hours_close:'23:00', shift_durations:[3,6],
    description:"A premium study sanctuary in the heart of Lucknow.",
    layout_config:[{label:'A',count:8,gap:4},{label:'B',count:8,gap:4},{label:'C',count:8,gap:4},{label:'D',count:8,gap:4},{label:'E',count:8,gap:4},{label:'F',count:8,gap:4}],
    blocked_seats:[], maps_url:'https://maps.google.com/?q=Hazratganj,Lucknow',
    photos:['https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800','https://images.unsplash.com/photo-1568667256549-094345857637?w=800','https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=800'],
    is_active:true },
  { id:'l2', name:'Focus Zone', tag:'STANDARD', tag_color:'#4A90D9', location:'Gomti Nagar, Lucknow',
    price_per_hour:15, price_monthly:1200, price_3monthly:3299, price_6monthly:5999, price_annual:10499,
    total_seats:30, rating:4.5, reviews_count:89,
    amenities:['WiFi','AC','Parking','Power Outlets','Filtered Water'],
    hours:'7:00 AM – 10:00 PM', hours_open:'07:00', hours_close:'22:00', shift_durations:[3,4],
    description:'A no-nonsense study space for deep work.',
    layout_config:[{label:'R1',count:10,gap:5},{label:'R2',count:10,gap:5},{label:'R3',count:10,gap:5}],
    blocked_seats:[], maps_url:'https://maps.google.com/?q=Gomti+Nagar,Lucknow',
    photos:['https://images.unsplash.com/photo-1497366216548-37526070297c?w=800'],
    is_active:true },
  { id:'l3', name:'Gyan Kendra', tag:'BUDGET', tag_color:'#2A9D8F', location:'Alambagh, Lucknow',
    price_per_hour:10, price_monthly:699, price_3monthly:1899, price_6monthly:3499, price_annual:5999,
    total_seats:60, rating:4.3, reviews_count:211,
    amenities:['WiFi','Café','Reading Material','Study Groups','Newspaper'],
    hours:'5:00 AM – 11:00 PM', hours_open:'05:00', hours_close:'23:00', shift_durations:[3,12],
    description:"Lucknow's most accessible study destination.",
    layout_config:[{label:'T1',count:4,gap:2},{label:'T2',count:4,gap:2},{label:'T3',count:4,gap:2},{label:'T4',count:4,gap:2}],
    blocked_seats:[], maps_url:'https://maps.google.com/?q=Alambagh,Lucknow',
    photos:['https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800'],
    is_active:true },
  { id:'l4', name:'Elite Study Hub', tag:'PREMIUM', tag_color:'#9B59B6', location:'Indira Nagar, Lucknow',
    price_per_hour:35, price_monthly:2499, price_3monthly:6999, price_6monthly:12999, price_annual:22999,
    total_seats:24, rating:4.9, reviews_count:67,
    amenities:['WiFi','AC','Lockers','Café','Printing','Private Rooms','24/7 Access'],
    hours:'Open 24/7', hours_open:'00:00', hours_close:'00:00', shift_durations:[6,12,0],
    description:"Lucknow's most exclusive study destination.",
    layout_config:[{label:'CA',count:4,gap:0},{label:'CB',count:4,gap:0},{label:'T1',count:4,gap:2},{label:'T2',count:4,gap:2}],
    blocked_seats:[], maps_url:'https://maps.google.com/?q=Indira+Nagar,Lucknow',
    photos:['https://images.unsplash.com/photo-1542621334-a254cf47733d?w=800','https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800'],
    is_active:true },
]

export const DEMO_REVIEWS = {
  l1:[{id:'r1',student:{full_name:'Aryan K.'},rating:5,comment:'Perfect for UPSC prep.',created_at:'2026-03-30'},{id:'r2',student:{full_name:'Priya S.'},rating:5,comment:'Love the café and silent zone.',created_at:'2026-03-27'}],
  l2:[{id:'r4',student:{full_name:'Sahil T.'},rating:5,comment:'No distractions, solid internet.',created_at:'2026-03-29'}],
  l3:[{id:'r5',student:{full_name:'Amit V.'},rating:4,comment:'Best budget option in Lucknow.',created_at:'2026-03-28'}],
  l4:[{id:'r6',student:{full_name:'Kavya R.'},rating:5,comment:'Private rooms are phenomenal.',created_at:'2026-03-29'}],
}

export const DEMO_USER    = { id:'demo-user-1',  email:'demo@studyspace.in' }
export const DEMO_PROFILE = { id:'demo-user-1',  full_name:'Rahul Sharma',  email:'demo@studyspace.in', role:'student' }
export const DEMO_OWNER   = { id:'demo-owner-1', full_name:'Aditi Mehta',   email:'owner@studyspace.in',role:'owner' }

export function makeDemoSeats(libId) {
  const lib = DEMO_LIBS.find(l => l.id === libId)
  const cfg = lib?.layout_config || [{label:'A',count:8,gap:0},{label:'B',count:8,gap:0}]
  const blocked = new Set(lib?.blocked_seats || [])
  return cfg.flatMap(row =>
    Array.from({ length: row.count }, (_, i) => ({
      id: `${libId}-${row.label}-${i+1}`,
      library_id: libId, row_label: row.label, seat_number: i+1, gap: row.gap || 0,
      status: blocked.has(`${row.label}-${i+1}`) ? 'blocked'
        : Math.random() > 0.55 ? 'booked' : 'available',
    }))
  )
}

export const DEMO_BOOKINGS = [
  { id:'b1', student_id:'demo-user-1', library_id:'l1', seat_ids:['l1-B-3','l1-B-4'],
    booking_date:'2026-04-04', slot_start:'09:00:00', slot_end:'12:00:00',
    duration_hours:3, total_amount:150, payment_method:'upi', status:'confirmed',
    library:{ id:'l1', name:"The Scholar's Den", location:'Hazratganj, Lucknow' } },
  { id:'b2', student_id:'demo-user-1', library_id:'l2', seat_ids:['l2-D-5'],
    booking_date:'2026-04-05', slot_start:'15:00:00', slot_end:'18:00:00',
    duration_hours:3, total_amount:45, payment_method:'upi', status:'confirmed',
    library:{ id:'l2', name:'Focus Zone', location:'Gomti Nagar, Lucknow' } },
]

export const DEMO_SUBSCRIPTIONS = [
  { id:'s1', student_id:'demo-user-1', library_id:'l1', plan:'monthly',
    start_date:'2026-04-01', end_date:'2026-04-30', amount:1800, status:'active',
    library:{ id:'l1', name:"The Scholar's Den", location:'Hazratganj, Lucknow' } },
]

export const DEMO_OWNER_BOOKINGS = [
  { id:'ob1', student:{full_name:'Aryan Kumar'}, booking_date:'2026-04-04', slot_start:'09:00:00', slot_end:'12:00:00', seat_ids:['l1-B-3'], total_amount:75, status:'confirmed' },
  { id:'ob2', student:{full_name:'Priya Sharma'}, booking_date:'2026-04-04', slot_start:'09:00:00', slot_end:'12:00:00', seat_ids:['l1-D-5'], total_amount:75, status:'confirmed' },
  { id:'ob3', student:{full_name:'Mohit Verma'}, booking_date:'2026-04-03', slot_start:'15:00:00', slot_end:'18:00:00', seat_ids:['l1-A-2'], total_amount:75, status:'confirmed' },
  { id:'ob4', student:{full_name:'Neha Singh'}, booking_date:'2026-04-02', slot_start:'09:00:00', slot_end:'12:00:00', seat_ids:['l1-C-7'], total_amount:75, status:'cancelled' },
]

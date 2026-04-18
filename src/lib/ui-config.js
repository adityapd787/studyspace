// UI configuration arrays — import these instead of repeating JSX structures.
// When you change labels, colors, or add items, edit here only.

// ── OWNER DASHBOARD STATS ─────────────────────────────────────
// Usage: OWNER_STATS(lib, bks, seats).map(s => <StatCard {...s} />)
export const ownerStats = (todayRev, todayBks, confirmedCount, cancelledCount, occPct, bookedCount, totalSeats, totalRev) => [
  { icon: '💰', val: '₹' + todayRev.toLocaleString('en-IN'), col: 'var(--red)',    label: "Today's Revenue",    sub: todayBks + ' bookings today', badge: 'LIVE' },
  { icon: '📅', val: confirmedCount,                          col: 'var(--green)',  label: 'Confirmed Bookings', sub: cancelledCount + ' cancelled' },
  { icon: '💺', val: occPct + '%',                            col: 'var(--blue)',   label: "Today's Occupancy",  sub: bookedCount + ' / ' + totalSeats + ' seats' },
  { icon: '📈', val: '₹' + totalRev.toLocaleString('en-IN'), col: 'var(--purple)', label: 'Total Revenue',      sub: 'All-time' },
]

// ── STUDENT DASHBOARD STATS ───────────────────────────────────
export const studentStats = (confCount, activeSubCount, spent, spaceCount) => [
  { icon: '📅', val: confCount,                              col: 'var(--red)',    label: 'Bookings' },
  { icon: '🎓', val: activeSubCount,                         col: 'var(--green)',  label: 'Active Subscriptions' },
  { icon: '💰', val: '₹' + spent.toLocaleString('en-IN'),   col: 'var(--yellow)', label: 'Total Spent' },
  { icon: '🏛️', val: spaceCount,                            col: 'var(--purple)', label: 'Spaces Visited' },
]

// ── OWNER DASHBOARD TABS ──────────────────────────────────────
export const OWNER_TABS = [
  { id: 'bookings', label: '📋 Bookings' },
  { id: 'seatmap',  label: '🪑 Seat Map' },
  { id: 'revenue',  label: '📊 Revenue' },
]

// ── PAYMENT OPTIONS ───────────────────────────────────────────
export const PAYMENT_OPTS = [
  { id: 'upi',    label: '📱 UPI / GPay / PhonePe' },
  { id: 'card',   label: '💳 Credit / Debit Card' },
  { id: 'wallet', label: '💰 StudySpace Wallet' },
]

// ── SHIFT OPTIONS ─────────────────────────────────────────────
export const SHIFT_OPTS = [
  { h: 3,  lbl: '3 hrs' },
  { h: 4,  lbl: '4 hrs' },
  { h: 6,  lbl: '6 hrs' },
  { h: 12, lbl: '12 hrs' },
  { h: 0,  lbl: 'Full Day' },
]

// ── BOOKING STATUS HELPERS ────────────────────────────────────
export const bookingStatus = (b, today) => {
  const isToday   = b.booking_date === today
  const isFuture  = b.booking_date > today
  const cancelled = b.status === 'cancelled'
  const label = cancelled ? 'Cancelled' : isToday ? 'Active' : isFuture ? 'Upcoming' : 'Completed'
  const col   = cancelled ? 'var(--red)' : isToday ? 'var(--green)' : isFuture ? 'var(--blue)' : 'var(--mutedl)'
  return { label, col, isToday, isFuture, canCancel: !cancelled && (isToday || isFuture), canReview: !cancelled && b.booking_date < today }
}

// ── SUBSCRIPTION PLAN LABELS ──────────────────────────────────
export const PLAN_LABELS = {
  monthly:   'Monthly',
  quarterly: '3-Month',
  halfyear:  '6-Month',
  annual:    'Annual',
}
export const PLAN_DUR_MONTHS = { monthly: 1, quarterly: 3, halfyear: 6, annual: 12 }

// ── LIBRARY CATEGORY COLORS ───────────────────────────────────
export const TAG_COLORS = {
  PREMIUM:  '#C8364A',
  STANDARD: '#4A90D9',
  BUDGET:   '#2A9D8F',
}

// ── SEAT MAP LEGEND ───────────────────────────────────────────
export const SEAT_LEGEND = [
  { bg: '#DCF5EE', br: '#A8E6D4', label: 'Available' },
  { bg: 'var(--red)', br: null,   label: 'Selected' },
  { bg: '#FDDDD8', br: '#F4B8B0', label: 'Booked' },
]

// ── OWNER SEAT MAP LEGEND ─────────────────────────────────────
export const OWNER_SEAT_LEGEND = [
  { bg: '#DCF5EE', br: '#A8E6D4', label: 'Free' },
  { bg: '#FDDDD8', br: '#F4B8B0', label: 'Booked' },
  { bg: '#e8d8c8', br: '#c8b8a8', label: 'Maintenance' },
]

// ── LANDING PAGE FEATURES ─────────────────────────────────────
export const LANDING_FEATURES = [
  { icon: '🗺️', title: 'Smart Discovery',  body: 'Filter by price, amenities, and ratings.' },
  { icon: '💺', title: 'Shift Booking',    body: 'Book full shifts with live availability.' },
  { icon: '📅', title: 'Flexible Plans',   body: 'Per-shift or subscription. Your choice.' },
  { icon: '📊', title: 'Progress Dashboard', body: 'Track study hours, bookings, and spending.' },
]

export const LANDING_STEPS = [
  { n: '01', title: 'Search',     body: 'Find spaces near you.' },
  { n: '02', title: 'Pick a Shift', body: 'Choose your time slot.' },
  { n: '03', title: 'Pay Instantly', body: 'UPI, card, or wallet.' },
  { n: '04', title: 'Study!',     body: 'Show QR at entrance.' },
]

export const LANDING_OWNER_FEATURES = [
  { icon: '🏛️', title: 'Easy Listing',     body: 'List your library in minutes.' },
  { icon: '🪑', title: 'Seat Layout Editor', body: 'Visual canvas, drag and drop.' },
  { icon: '📈', title: 'Revenue Analytics', body: 'Track bookings and revenue in real time.' },
  { icon: '🔔', title: 'Live Bookings',    body: 'See every booking as it happens.' },
]

// ── REVENUE SUMMARY LABELS ────────────────────────────────────
export const revSummary = (weekTotal, totalRev) => [
  { val: '₹' + weekTotal.toLocaleString('en-IN'),            label: 'This Week' },
  { val: '₹' + Math.round(weekTotal / 7).toLocaleString('en-IN'), label: 'Daily Avg' },
  { val: '₹' + totalRev.toLocaleString('en-IN'),             label: 'All Time' },
]

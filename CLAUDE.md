# StudySpace — AI Project Map
> Read this file first. It replaces reading all source files to understand the project.

## Stack
Vite + React 18, Supabase (Postgres + Auth), deployed on Vercel.
Demo mode auto-activates when `CFG.url === 'YOUR_SUPABASE_URL'` in `src/lib/supabase.js`.

## File map
| File | Purpose | Edit when... |
|---|---|---|
| `src/App.jsx` | Router — SCREENS object maps string → component | Adding a new screen |
| `src/lib/supabase.js` | Supabase client + DEMO_MODE flag | Connecting real DB |
| `src/lib/constants.js` | Demo data, LAYOUT_PRESETS, SUB_PLANS, computeShifts() | Changing demo data or shift logic |
| `src/lib/AppContext.jsx` | ALL state (S), set(), go(), every data fetch/mutation | Adding state or API calls |
| `src/lib/ui-config.js` | Config arrays for repetitive UI (stats, tabs, nav links) | Changing dashboard stats, tabs |
| `src/components/shared.jsx` | Nav, AuthModal, ReviewModal, SeatLayout, AmenityInput, toast() | Shared UI changes |
| `src/pages/Pages.jsx` | Landing, Browse, LibraryDetail, Seats, Booking, StudentDash, Profile | Student-facing screens |
| `src/pages/OwnerPages.jsx` | OwnerDash, EditLibrary, SeatEditor, ShiftTimeline | Owner-facing screens |
| `src/styles/global.css` | Theme variables + component CSS | Theme/brand changes |
| `src/styles/utils.css` | Layout utility classes (flex, grid, spacing, text) | Rarely — add new utilities here |

## State shape (S) — key fields only
```js
// Auth
user, profile, userMode         // profile.role = 'student' | 'owner'
authModal, authMode, authRole

// Student flows
libraries[], selectedLib, libReviews[]
seats[], selectedSeats[], selectedSlot, selectedPlan
myBookings[], mySubscriptions[]

// Owner flows
ownerLibrary, ownerBookings[], ownerSeats[], ownerTab

// Seat editor
gridFloors[], activeFloor, activeRoom, gridTool, seatNaming
editorPreset, gridDrag

// Edit library form (temp state before save)
addLibAmenities[], addLibPhotos[], addLibOpen, addLibClose, addLibShift[]

// UI
loading, lightboxUrl, reviewModal, reviewRating, reviewText
```

## Navigation — screen names
```
landing | browse | library | seats | booking
student-dash | owner-dash | add-library | edit-library | seat-editor | profile
```
Navigate: `go('screen-name')` — always scrolls to top.

## Adding a screen (pattern)
1. Write `export function MyScreen()` in `Pages.jsx` or `OwnerPages.jsx`
2. Import it in `App.jsx`
3. Add to SCREENS object: `'my-screen': MyScreen`
4. Navigate: `go('my-screen')`

## Key functions in AppContext
```js
fetchLibraries()          // applies S.searchQ + S.filterTag
fetchSeats(libId)         // respects S.selectedSlot for live availability
fetchLibReviews(libId)
fetchOwnerData()          // loads ownerLibrary + ownerBookings + ownerSeats
createBooking()           // uses S.selectedSeats, S.selectedSlot, S.payMethod
createSubscription(plan)  // plan = 'monthly'|'quarterly'|'halfyear'|'annual'
cancelBooking(id)
submitReview()            // uses S.reviewRating, S.reviewText, S.reviewModal
saveLibrary(data)         // insert or update based on S.ownerLibrary existence
```

## Shift system
- Owner sets `hours_open`, `hours_close`, `shift_durations[]` on the library
- `computeShifts(lib)` in `constants.js` generates all slot strings
- Students see computed slots on the Seats screen

## CSS conventions
- Theme vars in `global.css` :root — use `var(--red)`, `var(--green)`, etc.
- Layout utilities in `utils.css` — prefer classNames over inline styles
- Component-specific CSS is in `global.css` under named sections
- **Never add inline `style={{}}` for layout** — add a utility class instead

## Demo data location
All in `src/lib/constants.js`: DEMO_LIBS, DEMO_REVIEWS, DEMO_BOOKINGS, DEMO_SUBSCRIPTIONS, DEMO_OWNER_BOOKINGS, makeDemoSeats()

## Common patterns
```jsx
// Reading state
const { S, set, go, fetchLibraries } = useApp()

// Updating state
set({ selectedPlan: 'monthly' })

// Navigating + fetching
const handleClick = async () => { await fetchLibraries(); go('browse') }

// Conditional class
className={`slot-btn ${S.selectedSlot === sh.slot ? 'on' : ''}`}

// Toast
toast('✅ Saved!')
toast('Something went wrong', 'error')
```

## Schema additions needed (run in Supabase SQL editor)
```sql
alter table libraries add column if not exists hours_open time;
alter table libraries add column if not exists hours_close time;
alter table libraries add column if not exists shift_durations integer[] default '{3}';
alter table libraries add column if not exists floors_config jsonb;
alter table libraries add column if not exists seat_grid jsonb;
alter table seats add column if not exists grid_r integer;
alter table seats add column if not exists grid_c integer;
alter table seats add column if not exists floor text;
alter table seats add column if not exists room text;
```

## Pending features (not yet built)
- [ ] Razorpay payment integration
- [ ] Date picker for bookings (currently books today only)
- [ ] Multi-floor seat display on student seat selection screen
- [ ] Owner announcements to subscribers
- [ ] PWA / service worker

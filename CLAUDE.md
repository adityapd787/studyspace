# StudySpace — AI Context File
> **READ THIS ENTIRE FILE BEFORE TOUCHING ANY CODE.**
> This project has been developed collaboratively across Claude (chat) and Codex.
> Every convention, pattern, and decision is documented here.

---

## Project overview
Study space booking platform for India (Lucknow-focused). Students discover libraries, book seats by shift, subscribe monthly/quarterly. Library owners manage listings, seat layouts, pricing, and announcements.

**Live site:** https://studyspace-ecru.vercel.app
**Repo:** https://github.com/adityapd787/studyspace
**Stack:** Vite + React 18 · Supabase (Postgres + Auth + Storage) · deployed on Vercel

Demo mode activates automatically when `CFG.url === 'YOUR_SUPABASE_URL'` in `src/lib/supabase.js`.

---

## Working relationship & conventions

This project has been built over many sessions. The owner (Aditya) works with Claude for all major features and Codex only for review and understanding code. Do not introduce patterns that conflict with what's documented here — Claude has intentionally designed specific approaches for good reasons.

**Communication style with Aditya:**
- Be direct, minimal explanation unless asked
- Deliver working code, not theories
- When something breaks, diagnose from the actual file — never guess
- Always update CLAUDE.md after significant changes

---

## File map
| File | Role |
|---|---|
| `src/App.jsx` | Router + boot (`fetchLibraries` + `initAuth`) + ErrorBoundary |
| `src/lib/supabase.js` | `sb` client + `DEMO_MODE` flag |
| `src/lib/constants.js` | Demo data · `LAYOUT_PRESETS` · `SUB_PLANS` · `computeShifts()` · `buildDefaultShifts()` |
| `src/lib/AppContext.jsx` | All state `S` · `set()` · `go()` · every data/mutation function |
| `src/lib/ui-config.js` | Config arrays for stats, tabs, labels |
| `src/components/shared.jsx` | `Nav` · `AuthModal` · `ReviewModal` · `SeatLayout` · `AmenityInput` · `toast()` |
| `src/pages/Pages.jsx` | Student screens: Landing Browse Library Seats Booking StudentDash Profile |
| `src/pages/OwnerPages.jsx` | Owner screens: OwnerDash EditLibrary SeatEditor ShiftTimelineEditor AnnouncementsPanel FloorPlanCanvas |
| `src/styles/global.css` | Theme variables + all component CSS |
| `src/styles/utils.css` | Utility classes (flex, grid, spacing, typography) |

---

## ⚠️ CRITICAL — Never violate these

### 1. saveLibrary() returns an object
```js
// ALWAYS
const res = await saveLibrary(data)
if (res?.ok) { /* success */ }
else toast(res?.error || 'Save failed', 'error')

// NEVER — this is the old pattern, do not use
const ok = await saveLibrary(data)
```

### 2. Forms use controlled inputs only
```js
// ALWAYS
const [name, setName] = useState('')
<input value={name} onChange={ev => setName(ev.target.value)} />

// NEVER
<input defaultValue={...} />
// NEVER use FormData, querySelector, getElementById to read form values
```

### 3. CSS variables — never hardcode colours
```css
✅  color: var(--red)
❌  color: #C8364A
```

### 4. Inline styles only for dynamic JS values
```jsx
✅  style={{ color: lib.tag_color }}     // JS value — must be inline
❌  style={{ fontSize: 14 }}             // use class text-md instead
```

### 5. Navigation
```js
go('screen-name')   // ALWAYS — scrolls to top
// NEVER use window.location directly
```

---

## Current theme (aqua/cyan — softened)
```css
--bg: #DFF6FB          /* soft aqua page background */
--surface: #C2E9F4     /* inputs, cards, canvas areas */
--card: #FFFFFF
--red: #C8364A         /* primary brand — buttons, accents */
--text: #0D2B35
--mutedl: #1E5C70      /* labels, hints */
--muted: #6BAFC0       /* placeholders */
--green: #1AA882
--yellow: #D4860A      /* amber — star ratings, warnings. NEVER make this teal */
--blue: #2A72B5
--purple: #7B3FA0
--border: rgba(14,90,115,0.18)
--shadow: rgba(10,70,100,0.12)
```
**Hero section ONLY** has `background: white` + `::after` fade. Every other page uses `var(--bg)`.

---

## Navigation screens
```
landing | browse | library | seats | booking
student-dash | owner-dash | add-library | edit-library | seat-editor | profile
```

---

## State shape (S)
```js
// Auth
user, profile, userMode          // profile.role = 'student' | 'owner'
authModal, authMode, authRole

// Student
libraries[], selectedLib, libReviews[]
seats[], selectedSeats[], selectedSlot, selectedPlan
selectedDate                     // 'YYYY-MM-DD', today → +30 days
myBookings[], mySubscriptions[]
announcements[]                  // from owner sendAnnouncement

// Owner
ownerLibrary, ownerBookings[], ownerSeats[], ownerTab

// Seat editor
gridFloors[], activeFloor, activeRoom
gridTool ('add'|'move'|'erase'), seatNaming, editorPreset, gridDrag

// Edit library form (temp — reset after saving)
addLibAmenities[], addLibPhotos[], addLibOpen, addLibClose, addLibShift[]

// UI
loading, lightboxUrl, reviewModal, reviewRating, reviewText
```

---

## AppContext — all functions
```js
initAuth()                // boot — restores session via getSession()
fetchLibraries()          // applies searchQ + filterTag
fetchSeats(libId)         // uses selectedDate + selectedSlot for live availability
fetchLibReviews(libId)
fetchOwnerData()          // loads ownerLibrary → restores gridFloors via cloneFloorsConfig()
createBooking()           // uses selectedSeats, selectedSlot, selectedDate, payMethod
createSubscription(plan)  // 'monthly'|'quarterly'|'halfyear'|'annual'
cancelBooking(id)
submitReview()
saveLibrary(data)         // → { ok, error } — see CRITICAL above
sendAnnouncement(msg)
fetchAnnouncements(libId) // called after login for students
cloneFloorsConfig(fc)     // safe deep-clone helper — returns null if input invalid
```

---

## Key component behaviours

### EditLibrary
- All fields are controlled `useState` — initialised from `ownerLibrary` on mount
- Opens at last saved state automatically
- Save: `const res = await saveLibrary(data)` → check `res?.ok`
- Photos: 📁 file picker · 📷 camera (`capture="environment"`) · URL paste
- Production photos → Supabase Storage bucket `library-photos` (public)
- **Shift slots**: `customShifts` state — array of `{start:'HH:MM', end:'HH:MM'}`. Initialized from `lib.custom_shifts` if saved, otherwise built via `buildDefaultShifts(open, close, durations)`. Duration buttons are templates only — selecting one rebuilds `customShifts` (remainder becomes a final slot). Changing open/close also rebuilds. Saved as `custom_shifts` in DB.
- **`ShiftTimelineEditor`**: interactive — visual bar of all slots + editable time inputs per slot + add/remove slot. Replaces the old read-only `ShiftTimeline`.
- **`computeShifts(lib)`**: checks `lib.custom_shifts` first (priority); falls through to duration-based logic only if absent.

### SeatEditor
- **Naming modes**: `alpha-num` (A1,B2) · `col-alpha` (A1,B1) · `sequential` (1,2,3)
- **Drag**: immediate press-drag in Move mode only (`gridTool === 'move'`)
- **Scroll separation**: `touchAction: 'pan-x pan-y'` normally → `'none'` + body scroll lock during drag
- **`cloneFloorsConfig()`**: used everywhere floors_config is restored — never spread directly
- **Persistence**: save → `floors_config` in DB → `fetchOwnerData()` restores `gridFloors`

### AuthModal (shared.jsx)
- Fully controlled inputs — `email`, `password`, `fullName` all useState
- Real auth: `signInWithPassword` / `signUp` / `resetPasswordForEmail`
- After student login → `fetchAnnouncements()` called automatically

### Seat booking flow
1. Pick date (today → +30 days) → resets slot + seats
2. Pick shift → `fetchSeats()` uses selectedDate
3. Pick seat — multi-floor/room tabs if `lib.floors_config` exists

---

## Component patterns — use these, don't create new ones
```
.card p-{16|22|24|26|28|32}   content cards
.btn-red       primary action
.btn-outline   secondary
.btn-ghost-sm  utility (white bg on cyan surface)
.btn-danger    destructive
.form-input    all text inputs and selects
.spill + .pill-{green|red|blue|yellow|muted}   status badges
toast('msg')            success
toast('msg', 'error')   error
```

---

## Supabase schema additions needed
```sql
alter table libraries add column if not exists hours_open      time;
alter table libraries add column if not exists hours_close     time;
alter table libraries add column if not exists shift_durations integer[] default '{3}';
alter table libraries add column if not exists floors_config   jsonb;
alter table libraries add column if not exists custom_shifts   jsonb;
alter table libraries add column if not exists seat_grid       jsonb;
alter table seats     add column if not exists grid_r          integer;
alter table seats     add column if not exists grid_c          integer;
alter table seats     add column if not exists floor           text;
alter table seats     add column if not exists room            text;

create table if not exists public.announcements (
  id uuid default gen_random_uuid() primary key,
  library_id uuid references libraries(id) on delete cascade,
  message text not null, created_at timestamptz default now()
);
alter table announcements enable row level security;
create policy "owners insert" on announcements for insert to authenticated
  with check (library_id in (select id from libraries where owner_id = auth.uid()));
create policy "all read" on announcements for select to authenticated using (true);

-- Storage
create policy "auth upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'library-photos');
create policy "public read" on storage.objects for select to public
  using (bucket_id = 'library-photos');

-- Auto-create profile on signup
create or replace function public.handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), new.email,
          coalesce(new.raw_user_meta_data->>'role','student'));
  return new;
end;
$$ language plpgsql security definer;
create or replace trigger on_auth_user_created
  after insert on auth.users for each row execute procedure public.handle_new_user();
```

---

## What Codex changed (for reference)
| Date | Change |
|---|---|
| 2026-04-27 12:09 | SeatEditor crash fix — `cloneFloorsConfig()`, `activeDrag` ref, drag helpers |
| 2026-04-27 12:39–13:02 | Mobile drag/scroll separation — `pan-x pan-y`, body scroll lock |
| 2026-04-27 21:00–21:07 | `saveLibrary()` → `{ok, error}`, payload normalisation, schema-mismatch detection |
| 2026-04-28 | Aqua/cyan theme applied — `--yellow` fixed back to amber, cyan-tinted borders/overlay, btn-ghost-sm white bg |
| 2026-04-28 | `demoLogin('student')` calls `fetchAnnouncements()` · `AuthModal` destructures `fetchAnnouncements` · photo preview operator-precedence fix |

## What Claude Code changed (for reference)
| Date | Change |
|---|---|
| 2026-04-30 | `ShiftTimeline` → interactive `ShiftTimelineEditor` — editable time inputs per slot, add/remove slots, visual bar |
| 2026-04-30 | `buildDefaultShifts(open, close, durations)` — auto-divides day, appends remainder as final slot |
| 2026-04-30 | `computeShifts()` checks `lib.custom_shifts` first (priority over duration-based logic) |
| 2026-04-30 | `custom_shifts jsonb` column added to libraries schema; saved in `saveLibrary()` payload |

---

## Pending features
- [ ] Razorpay payment integration
- [ ] PWA / service worker
- [x] Date picker (today → +30 days)
- [x] Multi-floor seat display on booking screen
- [x] Owner announcements tab + student display
- [x] Real Supabase auth (sign in / sign up / forgot / session restore)
- [x] Photo upload — device + camera + URL
- [x] Hero white background (Landing only)
- [x] EditLibrary — controlled inputs, opens at last saved state
- [x] saveLibrary {ok,error} with schema-mismatch detection
- [x] Seat editor — floors, rooms, naming, drag, scroll separation, persistence
- [x] ErrorBoundary — no blank pages on crash
- [x] Aqua/cyan theme — softened, yellow fixed, borders fixed
- [x] Shift slot editor — remainder as final slot, per-slot time pickers, add/remove, saves as `custom_shifts`

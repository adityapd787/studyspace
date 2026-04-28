# StudySpace — AI Project Map
> Read this file first every session. It replaces reading all source files.
> Last updated: reflects all changes through hero white background session.
> Mandatory acknowledgement rule: when Claude (or any assistant) is asked to read this file, it must explicitly acknowledge the `Codex Fix Log (Timestamped)` section and confirm each timestamped entry is understood before suggesting new edits.

## Stack
Vite + React 18, Supabase (Postgres + Auth + Storage), deployed on Vercel.
Demo mode auto-activates when `CFG.url === 'YOUR_SUPABASE_URL'` in `src/lib/supabase.js`.

## File map
| File | Purpose | Edit when... |
|---|---|---|
| `src/App.jsx` | Router + boot (calls `fetchLibraries` + `initAuth`) | Adding a new screen |
| `src/lib/supabase.js` | Supabase client (`sb`) + `DEMO_MODE` flag | Connecting real DB |
| `src/lib/constants.js` | Demo data, LAYOUT_PRESETS, SUB_PLANS, computeShifts() | Changing demo data or shift logic |
| `src/lib/AppContext.jsx` | ALL state (S), set(), go(), every data fetch/mutation, initAuth | Adding state or API calls |
| `src/lib/ui-config.js` | Config arrays for repetitive UI (stats, tabs, labels) | Changing dashboard stats, tabs |
| `src/components/shared.jsx` | Nav, AuthModal (real Supabase auth), ReviewModal, SeatLayout, AmenityInput, toast() | Shared UI, auth flow |
| `src/pages/Pages.jsx` | Landing, Browse, LibraryDetail, Seats, Booking, StudentDash, Profile | Student-facing screens |
| `src/pages/OwnerPages.jsx` | OwnerDash, EditLibrary, SeatEditor, ShiftTimeline, AnnouncementsPanel | Owner-facing screens |
| `src/styles/global.css` | Theme vars + all component CSS. Hero section has background:white | Theme/brand changes |
| `src/styles/utils.css` | Layout utility classes (flex, grid, spacing, text, photo-row) | Adding new utilities |

## State shape (S)
```js
// Auth
user, profile, userMode         // profile.role = 'student' | 'owner'
authModal, authMode, authRole

// Student flows
libraries[], selectedLib, libReviews[]
seats[], selectedSeats[], selectedSlot, selectedPlan
selectedDate                    // 'YYYY-MM-DD', defaults to today, up to 30 days ahead
myBookings[], mySubscriptions[]

// Owner flows
ownerLibrary, ownerBookings[], ownerSeats[], ownerTab

// Seat editor
gridFloors[], activeFloor, activeRoom, gridTool, seatNaming, editorPreset, gridDrag

// Edit library form (temp state, populated before navigating to edit-library)
addLibAmenities[], addLibPhotos[], addLibOpen, addLibClose, addLibShift[]

// UI
loading, lightboxUrl
reviewModal, reviewRating, reviewText
announcements[]                 // [{id, library_id, lib_name, message, created_at}]
```

## Navigation
```
landing | browse | library | seats | booking
student-dash | owner-dash | add-library | edit-library | seat-editor | profile
```
Navigate: `go('screen-name')` — always scrolls to top.

## Key functions in AppContext
```js
initAuth()                // boot — restores session, sets user+profile+role
fetchLibraries()          // applies S.searchQ + S.filterTag
fetchSeats(libId)         // uses S.selectedDate + S.selectedSlot for live availability
fetchLibReviews(libId)
fetchOwnerData()          // loads ownerLibrary + ownerBookings + ownerSeats
createBooking()           // uses selectedSeats, selectedSlot, selectedDate, payMethod
createSubscription(plan)  // plan = 'monthly'|'quarterly'|'halfyear'|'annual'
cancelBooking(id)
submitReview()            // uses reviewRating, reviewText, reviewModal
saveLibrary(data)         // insert or update based on S.ownerLibrary existence
sendAnnouncement(msg)     // writes to announcements table, updates S.announcements
fetchAnnouncements(libId)
```

## Auth flow (real Supabase)
- AuthModal uses fully controlled inputs (useState) — no querySelector, no FormData
- Sign in: sb.auth.signInWithPassword() → load profiles row → set role → route to dashboard
- Sign up: sb.auth.signUp() → upsert profiles row → auto-login or email confirm
- Forgot: sb.auth.resetPasswordForEmail() → redirectTo window.location.origin
- initAuth() on boot: getSession() → restore user silently
- onAuthStateChange handles token refresh + cross-tab sign-out

## SeatEditor — full feature list
- **Seat Naming Format**: 3 modes — alpha-num (A1,B2), col-alpha (A1,B1), sequential (1,2,3)
- **Floor Plan canvas**: draggable/resizable room boxes, inline rename, add/remove floors & rooms
- **Long-press drag**: hold seat ~500ms → `longTimer` ref fires → `activeDrag.current=true` → drag to empty cell → `dropSeat()` places it
- **Scroll separation**: `touchAction:'none'` only when `activeDrag.current===true`; otherwise `pan-y` so normal scroll works
- **FloorPlanCanvas**: separate component, `dragState` ref for move/resize, SVG dot grid bg, touch support
- **seatNaming** state in AppContext drives autoLabel across all 3 modes
- **Save persistence**: `saveLibrary()` updates `S.gridFloors` from `floors_config`; `fetchOwnerData()` restores `gridFloors` on load; SeatEditor `useEffect` loads from `lib.floors_config` if exists
- **OwnerDash button**: only resets `gridFloors` if none saved — preserves layout between visits

## Seat booking flow
1. Student picks date (today to +30 days) → resets slot + seats
2. Student picks shift → fetchSeats() uses selectedDate for live availability  
3. Student picks seat(s) — multi-floor/room tabs if lib.floors_config exists
4. selectedDate stored in booking (not hardcoded to today)

## EditLibrary form
- Fully controlled inputs — all fields use useState, NO defaultValue, NO FormData
- State vars: name, tag, location, desc, mapsUrl, priceHr, priceM, price3, price6, priceA, openT, closeT, shifts[], amenities[], photos[], busy
- Validation: manual per-field with specific toast() messages

## Photo uploads (EditLibrary)
- 3 options: file picker (📁) | camera (📷, capture="environment") | URL paste
- Demo: URL.createObjectURL() — temporary
- Production: Supabase Storage bucket named library-photos (must be public)

## CSS conventions
- Hero ONLY has background:white + ::after fade to var(--bg) — all other pages use var(--bg) cream
- Use classNames from utils.css, not inline style={{}} for layout
- Theme vars: --red, --green, --blue, --yellow, --purple, --bg, --surface, --card, --border, --mutedl, --muted

## Schema additions needed
```sql
alter table libraries add column if not exists hours_open      time;
alter table libraries add column if not exists hours_close     time;
alter table libraries add column if not exists shift_durations integer[] default '{3}';
alter table libraries add column if not exists floors_config   jsonb;
alter table libraries add column if not exists seat_grid       jsonb;
alter table seats     add column if not exists grid_r          integer;
alter table seats     add column if not exists grid_c          integer;
alter table seats     add column if not exists floor           text;
alter table seats     add column if not exists room            text;

create table if not exists public.announcements (
  id uuid default gen_random_uuid() primary key,
  library_id uuid references libraries(id) on delete cascade,
  message text not null,
  created_at timestamptz default now()
);
alter table announcements enable row level security;
create policy "owners insert" on announcements for insert to authenticated
  with check (library_id in (select id from libraries where owner_id = auth.uid()));
create policy "all read" on announcements for select to authenticated using (true);

-- Storage RLS (library-photos bucket)
create policy "auth upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'library-photos');
create policy "public read" on storage.objects for select to public
  using (bucket_id = 'library-photos');
create policy "auth delete" on storage.objects for delete to authenticated
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

## Pending features
- [ ] Razorpay payment integration
- [ ] PWA / service worker
- [x] Date picker for bookings
- [x] Seat editor save/load persistence (floors_config round-trips correctly)
- [x] Long-press drag for seats (no Move tool required)
- [x] Mobile scroll/drag separation (touchAction switches dynamically)
- [x] Multi-floor seat display
- [x] Owner announcements tab
- [x] Real Supabase auth (sign in / sign up / forgot / session restore)
- [x] Photo upload from device + camera
- [x] Hero white background (Landing only)
- [x] EditLibrary save bug fixed
- [x] Storage RLS policies

## Codex Fix Log (Timestamped)
- 2026-04-27 12:07:18 +05:30 (IST): Investigation confirmed `SeatEditor` crash root cause as `ReferenceError: activeDrag is not defined` with missing long-press helper functions (`startPress`, `cancelPress`).
- 2026-04-27 12:09:57 +05:30 (IST): Implemented targeted runtime stability fixes:
  - `src/pages/OwnerPages.jsx`:
    - Added `cloneFloorsConfig()` guard/clone helper for safe `floors_config` restoration.
    - Updated Owner Dashboard `Seat Editor` navigation restore path to use guarded `cloneFloorsConfig()`.
    - In `SeatEditor`, added missing refs: `activeDrag`, `longTimer`.
    - Added missing long-press helpers: `startPress()` and `cancelPress()`.
    - Updated `SeatEditor` init restore path to use guarded `cloneFloorsConfig()`.
  - `src/lib/AppContext.jsx`:
    - Added `cloneFloorsConfig()` helper.
    - Updated `fetchOwnerData()` to restore grid floors via guarded helper.
    - Updated `saveLibrary()` (demo branch) to restore grid floors via guarded helper.
  - Validation:
    - Ran `npm run build` successfully at 2026-04-27 12:09:57 +05:30 (IST).
- 2026-04-27 12:39:06 +05:30 (IST): Refined SeatEditor mobile/trackpad scrolling without changing other behavior:
  - `src/pages/OwnerPages.jsx`:
    - Updated seat-canvas `touchAction` fallback from `pan-y` to `pan-x pan-y` when not dragging.
    - Preserved drag rule: while actively dragging, `touchAction` remains `none`.
    - Result: left/right/up/down scrolling is available again, and long-press drag still works only in `Move` mode.
  - Validation:
    - Ran `npm run build` successfully after this change.
- 2026-04-27 12:47:03 +05:30 (IST): Updated SeatEditor drag trigger behavior exactly for Move mode:
  - `src/pages/OwnerPages.jsx`:
    - Removed long-press delay requirement for seat dragging in `Move` mode.
    - Drag now starts immediately on press/click (`onMouseDown`/`onTouchStart`) when the target cell contains a seat.
    - Kept scroll locking only during active drag selection (`activeDrag.current === true`), and normal scrolling otherwise.
    - Removed obsolete timer-based press logic (`longTimer`, `startPress`, `cancelPress`) to avoid side-effects.
    - Updated in-editor help copy to reflect immediate press+drag behavior.
  - Validation:
    - Build verified successfully after changes.
- 2026-04-27 12:55:46 +05:30 (IST): Fixed mobile drag stability for SeatEditor without altering baseline behavior:
  - `src/pages/OwnerPages.jsx`:
    - While a seat is actively selected for drag (`activeDrag.current === true`), canvas overflow is now temporarily locked (`overflow: hidden`).
    - On drop/cancel, canvas overflow automatically returns to normal (`overflow: auto`), restoring regular left/right/up/down scrolling.
    - This prevents the seat-arrangement panel from scrolling along with finger movement during drag on mobile.
  - Validation:
    - Ran `npm run build` successfully after this adjustment.
- 2026-04-27 13:02:38 +05:30 (IST): Fixed remaining vertical scroll bleed during active seat drag on mobile:
  - `src/pages/OwnerPages.jsx`:
    - Added drag-state effect tied to `S.gridDrag` that temporarily locks page-level scrolling (`body` + `html`) only while a seat is actively selected/dragging.
    - Applied temporary global drag lock styles during active drag:
      - `overflow: hidden`
      - `touch-action: none` (body)
      - `overscroll-behavior: none`
    - Automatically restores all styles immediately on drop/cancel/unmount.
    - Existing behavior preserved:
      - No lock when not dragging (normal left/right/up/down scrolling stays available).
      - Canvas-local lock while dragging remains in place.
  - Validation:
    - Ran `npm run build` successfully after this adjustment.
- 2026-04-27 21:00:57 +05:30 (IST): Improved EditLibrary save reliability and error visibility:
  - `src/lib/AppContext.jsx`:
    - Updated `saveLibrary()` to normalize shift duration values before DB write.
    - Added compatibility retry path for legacy schemas (retries save after removing newer columns if DB reports unknown-column/schema-cache errors).
    - Changed return shape to `{ ok, error }` so callers can show the actual failure reason.
  - `src/pages/OwnerPages.jsx`:
    - Updated `EditLibrary` save submit path to use `res.ok` and display detailed failure message from `res.error`.
    - Updated `SeatEditor` save path to the same `{ ok, error }` response handling.
  - Validation:
    - Ran `npm run build` successfully after changes.
- 2026-04-27 21:07:55 +05:30 (IST): Switched EditLibrary save behavior to strict production-grade schema enforcement:
  - `src/lib/AppContext.jsx`:
    - Removed legacy schema-downgrade retry logic from `saveLibrary()` (no silent field dropping).
    - Added explicit schema-mismatch error shaping for missing-column/schema-cache failures.
    - Save now fails loudly with actionable migration-required error instead of pretending success.
  - Validation:
    - Ran `npm run build` successfully after this change.

### Claude acknowledgement required on next read
- On the next request to read this file, Claude must include this exact line first:
`Acknowledged Codex Fix Log entries dated 2026-04-27 12:07:18 +05:30 and 2026-04-27 12:09:57 +05:30.`

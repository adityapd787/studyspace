# StudySpace — React App

## Project Structure
```
src/
  App.jsx              — Router + root component
  main.jsx             — Entry point
  lib/
    supabase.js        — Supabase client (replace YOUR_* keys)
    constants.js       — Demo data, layout presets, shift helpers
    AppContext.jsx      — Global state + all data functions
  components/
    shared.jsx         — Nav, Modals, SeatLayout, AmenityInput, toast
  pages/
    Pages.jsx          — Landing, Browse, LibraryDetail, Seats, Booking, StudentDash, Profile
    OwnerPages.jsx     — OwnerDash, EditLibrary, SeatEditor, ShiftTimeline
  styles/
    global.css         — All styles (warm cream/red theme)
```

## Setup
```bash
npm install
npm run dev        # development
npm run build      # production build → dist/
```

## Connect to Supabase
Edit `src/lib/supabase.js`:
```js
export const CFG = {
  url: 'https://xxxx.supabase.co',
  key: 'your-anon-key',
}
```

Run the schema SQL from the v7 HTML project in your Supabase SQL editor.

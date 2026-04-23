import { useEffect } from 'react'
import { AppProvider, useApp } from './lib/AppContext'
import { DEMO_MODE } from './lib/supabase'
import { Nav, AuthModal, ReviewModal, toast } from './components/shared'
import { Landing, Browse, LibraryDetail, Seats, Booking, StudentDash, Profile } from './pages/Pages'
import { OwnerDash, EditLibrary, SeatEditor } from './pages/OwnerPages'
import './styles/global.css'
import './styles/utils.css'

const SCREENS = {
  landing: Landing, browse: Browse, library: LibraryDetail,
  seats: Seats, booking: Booking, 'student-dash': StudentDash,
  'owner-dash': OwnerDash, 'add-library': EditLibrary,
  'edit-library': EditLibrary, 'seat-editor': SeatEditor, profile: Profile,
}

function AppInner() {
  const { S, fetchLibraries, initAuth } = useApp()
  useEffect(() => { fetchLibraries(); if(!DEMO_MODE && initAuth) initAuth() }, [])
  const Screen = SCREENS[S.view] || Landing
  return (
    <>
      {DEMO_MODE && (
        <div id="setup-banner">
          <span>⚡ <strong>Demo Mode</strong> — Add Supabase keys to activate real database.</span>
          <a style={{ color:'var(--red)', fontWeight:600, cursor:'pointer' }}
            onClick={() => toast('1. Create project at supabase.com  2. Replace keys in src/lib/supabase.js','success')}>
            How to connect →
          </a>
        </div>
      )}
      <Nav />
      <div id="app"><Screen /><AuthModal /><ReviewModal /></div>
      <div id="toast" />
    </>
  )
}

export default function App() {
  return <AppProvider><AppInner /></AppProvider>
}

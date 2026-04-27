import { useEffect, Component } from 'react'

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(err) { return { error: err } }
  componentDidCatch(err, info) { console.error('StudySpace crash:', err, info) }
  render() {
    if (this.state.error) return (
      <div style={{padding:40,fontFamily:'DM Sans,sans-serif',maxWidth:600,margin:'60px auto',textAlign:'center'}}>
        <div style={{fontSize:48,marginBottom:16}}>⚠️</div>
        <h2 style={{fontFamily:'Cormorant Garamond,serif',fontSize:28,marginBottom:12}}>Something went wrong</h2>
        <p style={{color:'#7A5040',marginBottom:24,lineHeight:1.6}}>{this.state.error.message}</p>
        <button onClick={()=>window.location.reload()}
          style={{background:'#C8364A',color:'white',border:'none',padding:'12px 28px',borderRadius:10,cursor:'pointer',fontSize:15}}>
          Reload App
        </button>
        <details style={{marginTop:20,textAlign:'left',fontSize:12,color:'#999'}}>
          <summary style={{cursor:'pointer'}}>Technical details</summary>
          <pre style={{marginTop:8,padding:12,background:'#f5f0eb',borderRadius:8,overflow:'auto'}}>{this.state.error.stack}</pre>
        </details>
      </div>
    )
    return this.props.children
  }
}
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
  return <ErrorBoundary><AppProvider><AppInner /></AppProvider></ErrorBoundary>
}

import { createClient } from '@supabase/supabase-js'

export const CFG = {
  url: 'https://ilpfklratppteompxvps.supabase.co',
  key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlscGZrbHJhdHBwdGVvbXB4dnBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzNzUyNzksImV4cCI6MjA5MDk1MTI3OX0.U0TPaUA1qaZBObGnuuLZKi_LQ5U4Qx5-WgZ8qelsfXE',
}

export const DEMO_MODE = CFG.url === 'YOUR_SUPABASE_URL'
export const sb = DEMO_MODE ? null : createClient(CFG.url, CFG.key)

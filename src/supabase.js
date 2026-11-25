import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
if (!url || !key?.startsWith('sb_publishable_')) {
  throw new Error('Missing Supabase public configuration: set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.')
}
// Only public configuration belongs in VITE_* variables, which enter the browser bundle.
export const supabase = createClient(url, key)

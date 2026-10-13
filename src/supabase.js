import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// True when the build was made without the Supabase env vars (e.g. not set in Vercel).
export const configMissing = !url || !key

// createClient throws on an empty URL, which blanks the whole page, so fall back to
// placeholders and let <App /> show a readable configuration error instead.
export const supabase = createClient(url || 'https://placeholder.supabase.co', key || 'placeholder-key')

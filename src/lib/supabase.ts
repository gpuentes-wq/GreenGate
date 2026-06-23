import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Los fallbacks evitan que la app crashee si falta el .env; la pantalla
// muestra un aviso para completar la clave.
export const supabase = createClient(
  url || 'http://localhost',
  anonKey || 'placeholder',
)

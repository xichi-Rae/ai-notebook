import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes('YOUR_PROJECT_REF') &&
    !supabaseAnonKey.includes('YOUR_SUPABASE_ANON_KEY'),
)

if (
  !supabaseUrl ||
  !supabaseAnonKey ||
  supabaseUrl.includes('YOUR_PROJECT_REF') ||
  supabaseAnonKey.includes('YOUR_SUPABASE_ANON_KEY')
) {
  console.warn(
    'Supabase 环境变量未配置。请在 .env 中填写 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY。',
  )
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')

import 'server-only'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Service-role Supabase client. NEVER import this into a client component
 * or expose it to the browser — it bypasses Row Level Security entirely.
 * Use only inside API routes / server actions for trusted operations like
 * payment webhooks, admin actions, and AI usage logging.
 */
export const createAdminClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error('Supabase service role credentials are not configured')
  }

  return createSupabaseClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

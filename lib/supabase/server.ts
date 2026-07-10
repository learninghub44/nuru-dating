import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export const createServerClient = async () => {
  const cookieStore = await cookies()

  return createSupabaseServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll called from a Server Component - safe to ignore
            // when middleware is refreshing sessions.
          }
        },
      },
    }
  )
}

export async function getSession() {
  const supabase = await createServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return null
  }

  return session
}

export async function requireAuth() {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  return session
}

export async function getCurrentUser() {
  const session = await getSession()

  if (!session) {
    return null
  }

  const supabase = await createServerClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single()

  return profile
}

export async function isCurrentUserAdmin() {
  const session = await getSession()
  if (!session) return false

  const supabase = await createServerClient()
  const { data } = await supabase
    .from('admins')
    .select('id, role, permissions')
    .eq('user_id', session.user.id)
    .maybeSingle()

  return data ?? null
}

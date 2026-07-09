import { createServerClient } from './client'
import { redirect } from 'next/navigation'

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

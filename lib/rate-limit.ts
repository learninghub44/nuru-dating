import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Durable rate limiter backed by the `rate_limits` table so counts are
 * consistent across Cloudflare Worker isolates (unlike an in-memory map).
 * Returns { allowed, remaining, retryAfterSeconds }.
 */
export async function checkRateLimit(
  identifier: string,
  action: string,
  limit: number,
  windowSeconds: number
) {
  const supabase = createAdminClient()
  const key = `${action}:${identifier}`
  const now = new Date()
  const windowStart = new Date(now.getTime() - windowSeconds * 1000)

  const { data: existing } = await supabase
    .from('rate_limits')
    .select('id, count, window_started_at')
    .eq('key', key)
    .maybeSingle()

  if (!existing || new Date(existing.window_started_at) < windowStart) {
    await supabase
      .from('rate_limits')
      .upsert({ key, count: 1, window_started_at: now.toISOString() }, { onConflict: 'key' })
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 }
  }

  if (existing.count >= limit) {
    const retryAfterSeconds = Math.max(
      0,
      windowSeconds - Math.floor((now.getTime() - new Date(existing.window_started_at).getTime()) / 1000)
    )
    return { allowed: false, remaining: 0, retryAfterSeconds }
  }

  await supabase
    .from('rate_limits')
    .update({ count: existing.count + 1 })
    .eq('id', existing.id)

  return { allowed: true, remaining: limit - existing.count - 1, retryAfterSeconds: 0 }
}

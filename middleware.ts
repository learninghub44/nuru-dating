import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Simple in-memory sliding-window limiter. Good enough as a first line of
// defense against abusive bursts; each Cloudflare Worker isolate keeps its
// own counters, so this is deliberately combined with a durable per-user
// check inside AI/payment routes (see lib/rate-limit.ts) for real limits.
const buckets = new Map<string, { count: number; resetAt: number }>()

function checkEdgeRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (bucket.count >= limit) {
    return false
  }

  bucket.count += 1
  return true
}

const PROTECTED_API_PREFIXES = ['/api/ai/', '/api/payments/', '/api/notifications']

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Basic edge rate limiting on sensitive API routes, keyed by IP + route.
  if (PROTECTED_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    const ip =
      request.headers.get('cf-connecting-ip') ||
      request.headers.get('x-forwarded-for') ||
      'unknown'
    const allowed = checkEdgeRateLimit(`${ip}:${pathname}`, 20, 60_000) // 20 req/min/route
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.' },
        { status: 429 }
      )
    }
    if (!user && pathname !== '/api/payments/webhook') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  // Guard the admin dashboard at the edge (defense in depth; each admin
  // page/API route still re-checks the admins table server-side).
  if (pathname.startsWith('/admin')) {
    if (!user) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(loginUrl)
    }

    const { data: admin } = await supabase
      .from('admins')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!admin) {
      return NextResponse.redirect(new URL('/discover', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/ai/:path*',
    '/api/payments/:path*',
    '/api/notifications/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { paymentInitializeSchema, formatZodError } from '@/lib/validation'
import { CREDIT_PACKAGES } from '@/lib/credit-packages'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = paymentInitializeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 })
    }

    const rate = await checkRateLimit(user.id, 'payment_initialize', 10, 3600)
    if (!rate.allowed) {
      return NextResponse.json(
        { error: `Too many payment attempts. Try again in ${rate.retryAfterSeconds}s.` },
        { status: 429 }
      )
    }

    const pkg = CREDIT_PACKAGES[parsed.data.packageId]
    const reference = `nuru_${Date.now()}_${user.id.slice(0, 8)}`

    const admin = createAdminClient()
    const { error: insertError } = await admin.from('payments').insert({
      user_id: user.id,
      amount: pkg.price,
      currency: 'KES',
      status: 'pending',
      payment_method: 'paystack',
      reference,
      metadata: { package_id: pkg.id, package_name: pkg.name, credits: pkg.credits },
    })

    if (insertError) {
      console.error('Payment insert error:', insertError)
      return NextResponse.json({ error: 'Failed to initialize payment' }, { status: 500 })
    }

    return NextResponse.json({
      reference,
      amount: pkg.price,
      amountInKobo: pkg.price * 100,
      publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
      email: user.email,
      packageName: pkg.name,
    })
  } catch (error) {
    console.error('Payment initialize error:', error)
    return NextResponse.json({ error: 'Failed to initialize payment' }, { status: 500 })
  }
}

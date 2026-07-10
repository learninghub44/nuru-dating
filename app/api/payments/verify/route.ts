import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { paymentVerifySchema, formatZodError } from '@/lib/validation'

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
    const parsed = paymentVerifySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 })
    }
    const { reference } = parsed.data

    if (!process.env.PAYSTACK_SECRET_KEY) {
      console.error('PAYSTACK_SECRET_KEY not configured')
      return NextResponse.json({ error: 'Payments are not configured' }, { status: 500 })
    }

    const admin = createAdminClient()

    const { data: payment, error: paymentFetchError } = await admin
      .from('payments')
      .select('*')
      .eq('reference', reference)
      .eq('user_id', user.id)
      .maybeSingle()

    if (paymentFetchError || !payment) {
      return NextResponse.json({ error: 'Payment record not found' }, { status: 404 })
    }

    // Already processed — return success idempotently instead of double-crediting.
    if (payment.status === 'completed') {
      return NextResponse.json({ success: true, alreadyProcessed: true })
    }

    // Confirm with Paystack directly using the secret key — never trust the
    // client's "onSuccess" callback alone, since it can be forged in devtools.
    const verifyResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    )

    if (!verifyResponse.ok) {
      return NextResponse.json({ error: 'Failed to verify payment with Paystack' }, { status: 502 })
    }

    const verifyData = await verifyResponse.json()
    const txn = verifyData?.data

    if (!txn || txn.status !== 'success') {
      await admin.from('payments').update({ status: 'failed' }).eq('id', payment.id)
      return NextResponse.json({ error: 'Payment was not successful' }, { status: 400 })
    }

    // Confirm the amount actually paid matches what we expect (kobo vs KES).
    if (txn.amount !== payment.amount * 100) {
      console.error('Payment amount mismatch', { expected: payment.amount * 100, actual: txn.amount })
      await admin.from('payments').update({ status: 'failed' }).eq('id', payment.id)
      return NextResponse.json({ error: 'Payment amount mismatch' }, { status: 400 })
    }

    const credits = Number(payment.metadata?.credits || 0)

    // Credit the wallet via the atomic RPC (see supabase/policies.sql) so
    // concurrent verify calls can't double-credit the same payment.
    const { data: creditResult, error: creditError } = await admin.rpc('credit_wallet_for_payment', {
      p_user_id: user.id,
      p_payment_id: payment.id,
      p_credits: credits,
      p_description: `Purchased ${payment.metadata?.package_name || 'credits'} package`,
    })

    if (creditError) {
      console.error('Wallet credit error:', creditError)
      return NextResponse.json({ error: 'Failed to credit wallet' }, { status: 500 })
    }

    return NextResponse.json({ success: true, creditsAdded: credits, newBalance: creditResult })
  } catch (error) {
    console.error('Payment verify error:', error)
    return NextResponse.json({ error: 'Failed to verify payment' }, { status: 500 })
  }
}

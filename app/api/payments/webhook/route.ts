import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'

// Paystack webhook — a durable backstop in case the client closes the tab
// or loses connectivity before calling /api/payments/verify. Always verifies
// the request signature before trusting the payload.
export async function POST(request: NextRequest) {
  const secret = process.env.PAYSTACK_SECRET_KEY
  if (!secret) {
    console.error('PAYSTACK_SECRET_KEY not configured')
    return NextResponse.json({ error: 'Not configured' }, { status: 500 })
  }

  const rawBody = await request.text()
  const signature = request.headers.get('x-paystack-signature')

  const expectedSignature = crypto.createHmac('sha512', secret).update(rawBody).digest('hex')

  if (!signature || signature !== expectedSignature) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let event: any
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  if (event.event !== 'charge.success') {
    return NextResponse.json({ received: true })
  }

  const txn = event.data
  const reference = txn?.reference

  if (!reference) {
    return NextResponse.json({ received: true })
  }

  const admin = createAdminClient()

  const { data: payment } = await admin
    .from('payments')
    .select('*')
    .eq('reference', reference)
    .maybeSingle()

  if (!payment || payment.status === 'completed') {
    return NextResponse.json({ received: true })
  }

  if (txn.status !== 'success' || txn.amount !== payment.amount * 100) {
    await admin.from('payments').update({ status: 'failed' }).eq('id', payment.id)
    return NextResponse.json({ received: true })
  }

  const credits = Number(payment.metadata?.credits || 0)

  await admin.rpc('credit_wallet_for_payment', {
    p_user_id: payment.user_id,
    p_payment_id: payment.id,
    p_credits: credits,
    p_description: `Purchased ${payment.metadata?.package_name || 'credits'} package`,
  })

  return NextResponse.json({ received: true })
}

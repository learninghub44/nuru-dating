import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { MESSAGE_CREDIT_COST } from '@/lib/credit-packages'

const sendSchema = z.object({
  conversationId: z.string().uuid(),
  content: z.string().trim().min(1).max(2000),
})

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
    const parsed = sendSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Confirm the requesting user is actually part of this conversation's match.
    const { data: conversation, error: convError } = await admin
      .from('conversations')
      .select('id, match_id, matches!inner(user1_id, user2_id)')
      .eq('id', parsed.data.conversationId)
      .maybeSingle()

    if (convError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    const match = (conversation as any).matches
    if (match.user1_id !== user.id && match.user2_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: otherProfile } = await admin
      .from('profiles')
      .select('full_name')
      .eq('id', match.user1_id === user.id ? match.user2_id : match.user1_id)
      .maybeSingle()

    // Charge a small per-message fee instead of gating the whole
    // conversation behind an upfront unlock. Browsing and matching stay
    // free; only sending costs credits.
    const { error: spendError } = await admin.rpc('spend_credits', {
      p_user_id: user.id,
      p_amount: MESSAGE_CREDIT_COST,
      p_description: `Message to ${otherProfile?.full_name || 'match'}`,
      p_reference_id: conversation.id,
    })

    if (spendError) {
      if (spendError.message?.includes('Insufficient')) {
        return NextResponse.json(
          { error: 'Insufficient credits', code: 'INSUFFICIENT_CREDITS' },
          { status: 402 }
        )
      }
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
    }

    const { data: message, error: insertError } = await admin
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        sender_id: user.id,
        content: parsed.data.content,
        message_type: 'text',
      })
      .select()
      .single()

    if (insertError) {
      // Message failed after the credit was already spent — refund it so the
      // user isn't charged for a message that never sent.
      await admin.rpc('spend_credits', {
        p_user_id: user.id,
        p_amount: -MESSAGE_CREDIT_COST,
        p_description: 'Refund: message failed to send',
        p_reference_id: conversation.id,
      })
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
    }

    await admin
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversation.id)

    return NextResponse.json({ success: true, message })
  } catch (error) {
    console.error('Send message error:', error)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}

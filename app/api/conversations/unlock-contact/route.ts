import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const unlockSchema = z.object({
  conversationId: z.string().uuid(),
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
    const parsed = unlockSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Confirm the requesting user is actually part of this conversation's match.
    const { data: conversation, error: convError } = await admin
      .from('conversations')
      .select('id, contact_unlocked, contact_unlock_cost, match_id, matches!inner(user1_id, user2_id)')
      .eq('id', parsed.data.conversationId)
      .maybeSingle()

    if (convError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    const match = (conversation as any).matches
    if (match.user1_id !== user.id && match.user2_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (conversation.contact_unlocked) {
      return NextResponse.json({ success: true, alreadyUnlocked: true })
    }

    const otherUserId = match.user1_id === user.id ? match.user2_id : match.user1_id

    const { data: otherProfile } = await admin
      .from('profiles')
      .select('full_name, whatsapp_number')
      .eq('id', otherUserId)
      .maybeSingle()

    if (!otherProfile?.whatsapp_number) {
      return NextResponse.json(
        { error: "This member hasn't added a WhatsApp number yet." },
        { status: 400 }
      )
    }

    const { error: spendError } = await admin.rpc('spend_credits', {
      p_user_id: user.id,
      p_amount: conversation.contact_unlock_cost,
      p_description: `Unlocked contact for ${otherProfile.full_name || 'match'}`,
      p_reference_id: conversation.id,
    })

    if (spendError) {
      const message = spendError.message?.includes('Insufficient')
        ? 'Insufficient credits. Please purchase more.'
        : 'Failed to unlock contact'
      const code = spendError.message?.includes('Insufficient') ? 'INSUFFICIENT_CREDITS' : undefined
      return NextResponse.json({ error: message, code }, { status: spendError.message?.includes('Insufficient') ? 402 : 400 })
    }

    const { error: updateError } = await admin
      .from('conversations')
      .update({ contact_unlocked: true, contact_unlocked_at: new Date().toISOString() })
      .eq('id', conversation.id)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to unlock contact' }, { status: 500 })
    }

    return NextResponse.json({ success: true, whatsappNumber: otherProfile.whatsapp_number })
  } catch (error) {
    console.error('Unlock contact error:', error)
    return NextResponse.json({ error: 'Failed to unlock contact' }, { status: 500 })
  }
}

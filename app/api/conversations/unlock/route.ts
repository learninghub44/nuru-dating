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
      .select('id, is_unlocked, unlock_cost, match_id, matches!inner(user1_id, user2_id)')
      .eq('id', parsed.data.conversationId)
      .maybeSingle()

    if (convError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    const match = (conversation as any).matches
    if (match.user1_id !== user.id && match.user2_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (conversation.is_unlocked) {
      return NextResponse.json({ success: true, alreadyUnlocked: true })
    }

    const { data: otherProfile } = await admin
      .from('profiles')
      .select('full_name')
      .eq('id', match.user1_id === user.id ? match.user2_id : match.user1_id)
      .maybeSingle()

    const { error: spendError } = await admin.rpc('spend_credits', {
      p_user_id: user.id,
      p_amount: conversation.unlock_cost,
      p_description: `Unlocked conversation with ${otherProfile?.full_name || 'match'}`,
      p_reference_id: conversation.id,
    })

    if (spendError) {
      const message = spendError.message?.includes('Insufficient')
        ? 'Insufficient credits. Please purchase more.'
        : 'Failed to unlock conversation'
      return NextResponse.json({ error: message }, { status: 400 })
    }

    const { error: updateError } = await admin
      .from('conversations')
      .update({ is_unlocked: true, unlocked_at: new Date().toISOString() })
      .eq('id', conversation.id)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to unlock conversation' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unlock conversation error:', error)
    return NextResponse.json({ error: 'Failed to unlock conversation' }, { status: 500 })
  }
}

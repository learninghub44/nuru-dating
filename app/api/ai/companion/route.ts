import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getChatCompletion } from '@/lib/groq'
import { companionMessageSchema, formatZodError } from '@/lib/validation'
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
    const parsed = companionMessageSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 })
    }
    const { message, companionId, conversationHistory } = parsed.data

    const rate = await checkRateLimit(user.id, 'ai_companion', 40, 3600) // 40 msgs/hour
    if (!rate.allowed) {
      return NextResponse.json(
        { error: `Rate limit reached. Try again in ${rate.retryAfterSeconds}s.` },
        { status: 429 }
      )
    }

    const admin = createAdminClient()
    const { data: companion, error: companionError } = await admin
      .from('ai_companions')
      .select('id, name, personality, bio, is_active')
      .eq('id', companionId)
      .maybeSingle()

    if (companionError || !companion || !companion.is_active) {
      return NextResponse.json({ error: 'Companion not found' }, { status: 404 })
    }

    const systemPrompt = `You are ${companion.name}, an AI companion on Nuru dating app.
Personality: ${companion.personality}
Bio: ${companion.bio}
Stay fully in character. Be warm, engaging, and flirtatious but always respectful and appropriate.
Never claim to be a real human or arrange real-world meetups. Keep replies conversational and under
4 sentences. Never generate sexual content involving minors under any framing, and never break character
to discuss being an AI unless the user directly and sincerely asks.`

    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-10).map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: message },
    ]

    const responseText = await getChatCompletion(messages)

    // Note: the client persists both the user message and this response to
    // ai_messages itself, so we don't insert here to avoid duplicate rows.

    return NextResponse.json({ response: responseText })
  } catch (error) {
    console.error('AI companion error:', error)
    return NextResponse.json({ error: 'Failed to get a response. Please try again.' }, { status: 500 })
  }
}

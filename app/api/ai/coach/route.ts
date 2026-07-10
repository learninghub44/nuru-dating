import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getChatCompletion } from '@/lib/groq'
import { coachMessageSchema, formatZodError } from '@/lib/validation'
import { checkRateLimit } from '@/lib/rate-limit'

const SYSTEM_PROMPT = `You are a warm, encouraging AI dating coach for Nuru, a dating app for Kenyan singles.
Give practical, specific dating advice: profile tips, conversation starters, red flags to watch for,
and confidence building. Keep responses concise (2-4 short paragraphs max), friendly, and culturally
aware of the Kenyan dating context. Never give medical, legal, or financial advice. Never claim to be
a licensed therapist.`

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
    const parsed = coachMessageSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 })
    }
    const { message, conversationHistory } = parsed.data

    const rate = await checkRateLimit(user.id, 'ai_coach', 20, 3600) // 20 msgs/hour
    if (!rate.allowed) {
      return NextResponse.json(
        { error: `Rate limit reached. Try again in ${rate.retryAfterSeconds}s.` },
        { status: 429 }
      )
    }

    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...conversationHistory.slice(-10).map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: message },
    ]

    const responseText = await getChatCompletion(messages)

    // Note: the client persists both the user message and this response to
    // ai_messages itself, so we don't insert here to avoid duplicate rows.

    return NextResponse.json({ response: responseText })
  } catch (error) {
    console.error('AI coach error:', error)
    return NextResponse.json({ error: 'Failed to get a response. Please try again.' }, { status: 500 })
  }
}

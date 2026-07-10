import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getChatCompletion } from '@/lib/groq'
import { bioGeneratorSchema, formatZodError } from '@/lib/validation'
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
    const parsed = bioGeneratorSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 })
    }
    const { interests, personality, goals, funFact } = parsed.data

    const rate = await checkRateLimit(user.id, 'ai_bio_generator', 10, 3600) // 10/hour
    if (!rate.allowed) {
      return NextResponse.json(
        { error: `Rate limit reached. Try again in ${rate.retryAfterSeconds}s.` },
        { status: 429 }
      )
    }

    const prompt = `Write one dating profile bio (2-4 sentences, under 300 characters) for a Kenyan
dating app user. Make it warm, authentic, and a little fun — not cheesy or generic.

Interests: ${interests}
Personality traits: ${personality}
${goals ? `Looking for: ${goals}` : ''}
${funFact ? `Fun fact to weave in (optional, use if it fits naturally): ${funFact}` : ''}

Return ONLY the bio text, with no labels, quotes, or extra commentary.`

    const bio = await getChatCompletion([
      {
        role: 'system',
        content:
          'You write concise, authentic dating profile bios. You never fabricate identifying personal details beyond what the user gives you.',
      },
      { role: 'user', content: prompt },
    ])

    return NextResponse.json({ bio })
  } catch (error) {
    console.error('Bio generator error:', error)
    return NextResponse.json({ error: 'Failed to generate bios. Please try again.' }, { status: 500 })
  }
}

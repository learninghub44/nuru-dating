import 'server-only'
import Groq from 'groq-sdk'

let client: Groq | null = null

export function getGroqClient() {
  if (!client) {
    if (!process.env.GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY is not configured')
    }
    client = new Groq({ apiKey: process.env.GROQ_API_KEY })
  }
  return client
}

export const GROQ_MODEL = 'llama-3.3-70b-versatile'

export async function getChatCompletion(messages: { role: 'system' | 'user' | 'assistant'; content: string }[]) {
  const groq = getGroqClient()
  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages,
    temperature: 0.8,
    max_tokens: 500,
  })

  return completion.choices[0]?.message?.content?.trim() || ''
}

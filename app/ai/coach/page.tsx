'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Heart, ArrowLeft, Sparkles, Send, Bot } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function DatingCoachPage() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hi! I'm your AI dating coach. I'm here to help you navigate the world of dating, improve your profile, and give you tips for meaningful connections. What would you like to talk about?",
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const supabase = createClient()

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Call AI API (Groq or OpenRouter)
      const response = await fetch('/api/ai/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          userId: user.id,
          conversationHistory: messages,
        }),
      })

      if (!response.ok) throw new Error('Failed to get AI response')

      const data = await response.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }])

      // Save conversation to database
      await supabase.from('ai_messages').insert({
        user_id: user.id,
        ai_companion_id: null,
        conversation_id: 'dating-coach',
        role: 'user',
        content: userMessage,
      })

      await supabase.from('ai_messages').insert({
        user_id: user.id,
        ai_companion_id: null,
        conversation_id: 'dating-coach',
        role: 'assistant',
        content: data.response,
      })
    } catch (error) {
      console.error('Error getting AI response:', error)
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 glass border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/discover">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gold-500/20 flex items-center justify-center">
              <Bot className="h-5 w-5 text-gold-500" />
            </div>
            <div>
              <h2 className="font-semibold">AI Dating Coach</h2>
              <p className="text-xs text-muted-foreground">Your personal dating advisor</p>
            </div>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto pt-20 pb-24 px-4">
        <div className="container mx-auto max-w-2xl space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-gold-500 text-black'
                    : 'bg-muted'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  <div className="h-2 w-2 bg-gold-500 rounded-full animate-bounce" />
                  <div className="h-2 w-2 bg-gold-500 rounded-full animate-bounce delay-100" />
                  <div className="h-2 w-2 bg-gold-500 rounded-full animate-bounce delay-200" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="fixed bottom-0 w-full glass border-t border-border p-4">
        <div className="container mx-auto max-w-2xl">
          <div className="flex gap-2">
            <Input
              placeholder="Ask for dating advice..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              disabled={loading}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!input.trim() || loading}
              className="bg-gold-500 text-black hover:bg-gold-600"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

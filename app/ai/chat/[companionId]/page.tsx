'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Heart, ArrowLeft, Send, Sparkles, Bot } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatTime } from '@/lib/utils'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  created_at: string
}

interface AICompanion {
  id: string
  name: string
  age: number
  gender: string
  bio: string
  personality: string
  avatar_url: string
  photos: string[]
  interests: string[]
}

export default function AIChatPage() {
  const router = useRouter()
  const params = useParams()
  const companionId = params.companionId as string

  const [messages, setMessages] = useState<Message[]>([])
  const [companion, setCompanion] = useState<AICompanion | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const supabase = createClient()

  useEffect(() => {
    loadCompanion()
    loadMessages()
  }, [companionId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadCompanion = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_companions')
        .select('*')
        .eq('id', companionId)
        .single()

      if (error) throw error
      setCompanion(data)
    } catch (error) {
      console.error('Error loading companion:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadMessages = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('ai_messages')
        .select('*')
        .eq('user_id', user.id)
        .eq('ai_companion_id', companionId)
        .eq('conversation_id', companionId)
        .order('created_at', { ascending: true })

      if (error) throw error
      setMessages(data || [])
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !companion || sending) return

    setSending(true)
    const messageContent = newMessage.trim()
    setNewMessage('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not found')

      // Save user message
      await supabase.from('ai_messages').insert({
        user_id: user.id,
        ai_companion_id: companionId,
        conversation_id: companionId,
        role: 'user',
        content: messageContent,
      })

      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'user',
        content: messageContent,
        created_at: new Date().toISOString(),
      }])

      // Get AI response
      const response = await fetch('/api/ai/companion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companionId,
          message: messageContent,
          conversationHistory: messages,
          companion: companion,
        }),
      })

      if (!response.ok) throw new Error('Failed to get AI response')

      const data = await response.json()

      // Save AI response
      await supabase.from('ai_messages').insert({
        user_id: user.id,
        ai_companion_id: companionId,
        conversation_id: companionId,
        role: 'assistant',
        content: data.response,
        tokens_used: data.tokens_used,
      })

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        created_at: new Date().toISOString(),
      }])
    } catch (error) {
      console.error('Error sending message:', error)
      setNewMessage(messageContent)
      alert('Failed to send message. Please try again.')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500 mx-auto mb-4" />
          <p className="text-muted-foreground">Loading conversation...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 glass border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/ai/companions">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <Avatar className="h-10 w-10">
            <AvatarImage src={companion?.avatar_url} />
            <AvatarFallback>
              {companion?.name.charAt(0) || 'A'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold">{companion?.name}</h2>
              <Badge variant="outline" className="border-gold-500 text-gold-500">
                <Sparkles className="h-3 w-3 mr-1" />
                AI
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {companion && `${companion.age} • ${companion.gender}`}
            </p>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto pt-20 pb-24 px-4">
        <div className="container mx-auto max-w-2xl space-y-4">
          {messages.length === 0 && (
            <Card className="glass-card">
              <CardContent className="p-6 text-center">
                <Bot className="h-12 w-12 text-gold-500 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Start a conversation</h3>
                <p className="text-sm text-muted-foreground">
                  Say hello to {companion?.name} and start chatting!
                </p>
              </CardContent>
            </Card>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
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
                <p className={`text-xs mt-1 ${message.role === 'user' ? 'text-black/70' : 'text-muted-foreground'}`}>
                  {formatTime(new Date(message.created_at))}
                </p>
              </div>
            </div>
          ))}
          {sending && (
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
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="fixed bottom-0 w-full glass border-t border-border p-4">
        <div className="container mx-auto max-w-2xl">
          <div className="flex gap-2">
            <Input
              placeholder={`Message ${companion?.name}...`}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              disabled={sending}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || sending}
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

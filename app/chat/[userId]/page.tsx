'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Heart, ArrowLeft, Send, Sparkles, Zap } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { calculateAge, formatTime } from '@/lib/utils'
import { MESSAGE_CREDIT_COST } from '@/lib/credit-packages'

interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  message_type: string
  is_read: boolean
  created_at: string
}

interface Profile {
  id: string
  full_name: string
  birth_date: string
  location: string
  photos: string[]
  verified: boolean
  is_ai_companion: boolean
}

interface Conversation {
  id: string
  match_id: string
}

export default function ChatPage() {
  const router = useRouter()
  const params = useParams()
  const userId = params.userId as string

  const [messages, setMessages] = useState<Message[]>([])
  const [otherUser, setOtherUser] = useState<Profile | null>(null)
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [outOfCredits, setOutOfCredits] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setCurrentUserId(user?.id || null))
  }, [])

  useEffect(() => {
    loadConversation()
    loadOtherUser()
  }, [userId])

  useEffect(() => {
    if (conversation?.id) {
      loadMessages()
      subscribeToMessages()
    }
  }, [conversation])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadOtherUser = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      setOtherUser(data)
    } catch (error) {
      console.error('Error loading user:', error)
    }
  }

  const loadConversation = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Find existing conversation
      const { data: matches } = await supabase
        .from('matches')
        .select('id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .single()

      if (!matches) {
        router.push('/discover')
        return
      }

      const { data: convData, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('match_id', matches.id)
        .single()

      if (error && error.code !== 'PGRST116') throw error

      if (convData) {
        setConversation(convData)
      } else {
        // Create conversation — chatting is open by default. Credits are
        // only charged per message sent, not for opening the thread.
        const { data: newConv, error: createError } = await supabase
          .from('conversations')
          .insert({ match_id: matches.id })
          .select()
          .single()

        if (createError) throw createError
        setConversation(newConv)
      }
    } catch (error) {
      console.error('Error loading conversation:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadMessages = async () => {
    if (!conversation?.id) return

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: true })

      if (error) throw error
      setMessages(data || [])

      // Mark messages as read
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('messages')
          .update({ is_read: true, read_at: new Date().toISOString() })
          .eq('conversation_id', conversation.id)
          .neq('sender_id', user.id)
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  const subscribeToMessages = () => {
    if (!conversation?.id) return

    const channel = supabase
      .channel(`messages:${conversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new as Message])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !conversation?.id || sending) return

    setSending(true)
    const messageContent = newMessage.trim()
    setNewMessage('')
    setOutOfCredits(false)

    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: conversation.id, content: messageContent }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.code === 'INSUFFICIENT_CREDITS') {
          // Don't block the thread — just surface an upgrade prompt and
          // give the user their draft back so they can retry after topping up.
          setOutOfCredits(true)
          setNewMessage(messageContent)
          return
        }
        throw new Error(data.error || 'Failed to send message')
      }

      // Realtime subscription also delivers this insert; the RLS-scoped
      // client sees it via postgres_changes, so no local state push needed here.
    } catch (error) {
      console.error('Error sending message:', error)
      setNewMessage(messageContent)
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
          <Link href="/matches">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <Avatar className="h-10 w-10">
            <AvatarImage src={otherUser?.photos[0]} />
            <AvatarFallback>
              {otherUser?.full_name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold">{otherUser?.full_name}</h2>
              {otherUser?.verified && (
                <Badge className="bg-gold-500 text-black text-xs">Verified</Badge>
              )}
              {otherUser?.is_ai_companion && (
                <Badge variant="outline" className="border-gold-500 text-gold-500 text-xs">
                  <Sparkles className="h-3 w-3 mr-1" />
                  AI
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {otherUser && `${calculateAge(otherUser.birth_date)} • ${otherUser.location}`}
            </p>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto pt-20 pb-24 px-4">
        <div className="container mx-auto max-w-2xl space-y-4">
          {messages.map((message) => {
            const isOwn = message.sender_id === currentUserId

            return (
              <div
                key={message.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                    isOwn
                      ? 'bg-gold-500 text-black'
                      : 'bg-muted'
                  }`}
                >
                  <p>{message.content}</p>
                  <p className={`text-xs mt-1 ${isOwn ? 'text-black/70' : 'text-muted-foreground'}`}>
                    {formatTime(new Date(message.created_at))}
                    {isOwn && message.is_read && ' • Read'}
                  </p>
                </div>
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message Input */}
      <div className="fixed bottom-0 w-full glass border-t border-border p-4">
        <div className="container mx-auto max-w-2xl">
          {outOfCredits && (
            <Card className="glass-card border-gold-500/50 mb-3">
              <CardContent className="p-4 flex items-center gap-3">
                <Zap className="h-8 w-8 text-gold-500 shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-sm">Out of credits</p>
                  <p className="text-xs text-muted-foreground">
                    Top up to keep messaging — {MESSAGE_CREDIT_COST} credits per message.
                  </p>
                </div>
                <Button
                  size="sm"
                  className="bg-gold-500 text-black hover:bg-gold-600 shrink-0"
                  onClick={() => router.push('/wallet')}
                >
                  Upgrade
                </Button>
              </CardContent>
            </Card>
          )}
          <div className="flex gap-2">
            <Input
              placeholder="Type a message..."
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

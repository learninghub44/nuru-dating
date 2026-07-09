'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Heart, ArrowLeft, Send, Sparkles, Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { calculateAge, formatTime } from '@/lib/utils'

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
  is_unlocked: boolean
  unlock_cost: number
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
  const [unlocking, setUnlocking] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const supabase = createClient()

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
        // Create conversation
        const { data: newConv, error: createError } = await supabase
          .from('conversations')
          .insert({
            match_id: matches.id,
            is_unlocked: false,
            unlock_cost: 100,
          })
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

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not found')

      const { error } = await supabase.from('messages').insert({
        conversation_id: conversation.id,
        sender_id: user.id,
        content: messageContent,
        message_type: 'text',
      })

      if (error) throw error

      // Update last_message_at
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversation.id)
    } catch (error) {
      console.error('Error sending message:', error)
      setNewMessage(messageContent)
    } finally {
      setSending(false)
    }
  }

  const handleUnlockConversation = async () => {
    if (!conversation || unlocking) return

    setUnlocking(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not found')

      // Check wallet balance
      const { data: wallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .single()

      if (!wallet || wallet.balance < conversation.unlock_cost) {
        alert('Insufficient credits. Please purchase more credits.')
        router.push('/wallet')
        return
      }

      // Deduct credits
      await supabase
        .from('wallets')
        .update({ balance: wallet.balance - conversation.unlock_cost })
        .eq('user_id', user.id)

      // Record transaction
      await supabase.from('wallet_transactions').insert({
        wallet_id: wallet.id,
        type: 'spend',
        amount: conversation.unlock_cost,
        description: `Unlocked conversation with ${otherUser?.full_name}`,
        reference_id: conversation.id,
      })

      // Unlock conversation
      const { error } = await supabase
        .from('conversations')
        .update({
          is_unlocked: true,
          unlocked_at: new Date().toISOString(),
        })
        .eq('id', conversation.id)

      if (error) throw error

      setConversation({ ...conversation, is_unlocked: true })
    } catch (error: any) {
      console.error('Error unlocking conversation:', error)
      alert(error.message || 'Failed to unlock conversation')
    } finally {
      setUnlocking(false)
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
          {conversation && !conversation.is_unlocked && (
            <Card className="glass-card border-gold-500/50">
              <CardContent className="p-6 text-center">
                <Lock className="h-12 w-12 text-gold-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Unlock this conversation</h3>
                <p className="text-muted-foreground mb-4">
                  Send {conversation.unlock_cost} credits to start messaging
                </p>
                <Button
                  onClick={handleUnlockConversation}
                  disabled={unlocking}
                  className="bg-gold-500 text-black hover:bg-gold-600"
                >
                  {unlocking ? 'Unlocking...' : `Unlock for ${conversation.unlock_cost} credits`}
                </Button>
              </CardContent>
            </Card>
          )}

          {messages.map((message) => {
            const { data: { user } } = supabase.auth.getUser()
            const isOwn = message.sender_id === user?.then?.(u => u.data.user?.id)

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
          <div className="flex gap-2">
            <Input
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              disabled={!conversation?.is_unlocked || sending}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || !conversation?.is_unlocked || sending}
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

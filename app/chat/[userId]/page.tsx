'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Heart, ArrowLeft, Send, Sparkles, Lock, MessageCircle, Zap } from 'lucide-react'
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
  contact_unlocked: boolean
  contact_unlock_cost: number
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
  const [unlockingContact, setUnlockingContact] = useState(false)
  const [contactError, setContactError] = useState('')
  const [whatsappNumber, setWhatsappNumber] = useState<string | null>(null)
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
        .select('id, full_name, birth_date, location, photos, verified, is_ai_companion')
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

      let activeConversation = convData

      if (convData) {
        setConversation(convData)
      } else {
        // Create conversation — messaging is open by default and free.
        // Contact is a separate, paid unlock (see contact_unlocked below).
        const { data: newConv, error: createError } = await supabase
          .from('conversations')
          .insert({ match_id: matches.id })
          .select()
          .single()

        if (createError) throw createError
        activeConversation = newConv
        setConversation(newConv)
      }

      if (activeConversation?.contact_unlocked) {
        const { data: number } = await supabase.rpc('get_unlocked_whatsapp', {
          p_conversation_id: activeConversation.id,
        })
        setWhatsappNumber(number ?? null)
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

      // In-app messaging is free and unlimited once matched — no credits
      // involved here. The only paid action is unlocking WhatsApp contact
      // (handleUnlockContact below).
      const { error } = await supabase.from('messages').insert({
        conversation_id: conversation.id,
        sender_id: user.id,
        content: messageContent,
        message_type: 'text',
      })

      if (error) throw error

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

  const handleUnlockContact = async () => {
    if (!conversation || unlockingContact) return

    setUnlockingContact(true)
    setContactError('')
    setOutOfCredits(false)

    try {
      const res = await fetch('/api/conversations/unlock-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: conversation.id }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.code === 'INSUFFICIENT_CREDITS') {
          setOutOfCredits(true)
          return
        }
        setContactError(data.error || 'Failed to unlock contact')
        return
      }

      setConversation({ ...conversation, contact_unlocked: true })
      setWhatsappNumber(data.whatsappNumber ?? null)
    } catch (error) {
      console.error('Error unlocking contact:', error)
      setContactError('Failed to unlock contact')
    } finally {
      setUnlockingContact(false)
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
          {/* Contact unlock — chatting in-app is always free; this is the
              paid upsell to move the conversation to WhatsApp. */}
          {conversation && (
            whatsappNumber ? (
              <Card className="glass-card border-gold-500/50">
                <CardContent className="p-4 flex items-center gap-3">
                  <MessageCircle className="h-8 w-8 text-gold-500 shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold text-sm">Contact unlocked</p>
                    <p className="text-xs text-muted-foreground">{whatsappNumber}</p>
                  </div>
                  <a
                    href={`https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button size="sm" className="bg-gold-500 text-black hover:bg-gold-600 shrink-0">
                      Chat on WhatsApp
                    </Button>
                  </a>
                </CardContent>
              </Card>
            ) : (
              <Card className="glass-card border-gold-500/50">
                <CardContent className="p-6 text-center">
                  <Lock className="h-12 w-12 text-gold-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Unlock {otherUser?.full_name || 'their'} contact</h3>
                  <p className="text-muted-foreground mb-4">
                    Get their WhatsApp number and continue chatting outside the app
                  </p>
                  {contactError && (
                    <p className="text-sm text-destructive mb-3">{contactError}</p>
                  )}
                  <Button
                    onClick={handleUnlockContact}
                    disabled={unlockingContact}
                    className="bg-gold-500 text-black hover:bg-gold-600"
                  >
                    {unlockingContact
                      ? 'Unlocking...'
                      : `Unlock for ${conversation.contact_unlock_cost} credits`}
                  </Button>
                </CardContent>
              </Card>
            )
          )}

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
                    Top up to unlock contact details.
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

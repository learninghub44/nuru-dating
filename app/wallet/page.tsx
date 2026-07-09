'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Heart, Wallet, ArrowLeft, CreditCard, History, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatDate, formatTime } from '@/lib/utils'

interface Wallet {
  id: string
  balance: number
}

interface Transaction {
  id: string
  type: string
  amount: number
  description: string
  created_at: string
}

const CREDIT_PACKAGES = [
  { credits: 100, price: 200, name: 'Starter' },
  { credits: 250, price: 450, name: 'Popular' },
  { credits: 500, price: 800, name: 'Value' },
  { credits: 1000, price: 1500, name: 'Premium' },
]

export default function WalletPage() {
  const router = useRouter()
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState<number | null>(null)

  const supabase = createClient()

  useEffect(() => {
    loadWallet()
    loadTransactions()
  }, [])

  const loadWallet = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') throw error

      if (!data) {
        // Create wallet
        const { data: newWallet, error: createError } = await supabase
          .from('wallets')
          .insert({ user_id: user.id, balance: 0 })
          .select()
          .single()

        if (createError) throw createError
        setWallet(newWallet)
      } else {
        setWallet(data)
      }
    } catch (error) {
      console.error('Error loading wallet:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadTransactions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('wallet_id', wallet?.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error
      setTransactions(data || [])
    } catch (error) {
      console.error('Error loading transactions:', error)
    }
  }

  const handlePurchase = async (packageIndex: number) => {
    const pkg = CREDIT_PACKAGES[packageIndex]
    setPurchasing(packageIndex)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not found')

      // Initialize Paystack payment
      const paystack = new (window as any).PaystackPop()
      const reference = `nuru_${Date.now()}_${user.id}`

      paystack.newTransaction({
        key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
        email: user.email,
        amount: pkg.price * 100, // Paystack expects amount in kobo
        currency: 'KES',
        reference,
        metadata: {
          custom_fields: [
            {
              display_name: 'Package',
              variable_name: 'package',
              value: pkg.name,
            },
          ],
        },
        onSuccess: async () => {
          try {
            // Record payment
            const { error: paymentError } = await supabase.from('payments').insert({
              user_id: user.id,
              amount: pkg.price,
              currency: 'KES',
              status: 'completed',
              payment_method: 'paystack',
              reference,
              metadata: { package: pkg.name, credits: pkg.credits },
              completed_at: new Date().toISOString(),
            })

            if (paymentError) throw paymentError

            // Add credits to wallet
            const { error: walletError } = await supabase
              .from('wallets')
              .update({ balance: (wallet?.balance || 0) + pkg.credits })
              .eq('id', wallet?.id)

            if (walletError) throw walletError

            // Record transaction
            await supabase.from('wallet_transactions').insert({
              wallet_id: wallet?.id,
              type: 'purchase',
              amount: pkg.credits,
              description: `Purchased ${pkg.name} package`,
              reference_id: reference,
            })

            loadWallet()
            loadTransactions()
            alert(`Successfully purchased ${pkg.credits} credits!`)
          } catch (error) {
            console.error('Error processing payment:', error)
            alert('Payment successful but failed to add credits. Please contact support.')
          }
        },
        onCancel: () => {
          alert('Payment cancelled')
        },
        onError: (error: any) => {
          console.error('Payment error:', error)
          alert('Payment failed. Please try again.')
        },
      })
    } catch (error) {
      console.error('Error initiating payment:', error)
      alert('Failed to initiate payment. Please try again.')
    } finally {
      setPurchasing(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500 mx-auto mb-4" />
          <p className="text-muted-foreground">Loading wallet...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 glass border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/discover">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/" className="flex items-center gap-2">
              <Heart className="h-8 w-8 text-gold-500 fill-gold-500" />
              <span className="text-2xl font-bold text-gold-500">Nuru</span>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/discover">
              <Button variant="ghost">Discover</Button>
            </Link>
            <Link href="/matches">
              <Button variant="ghost">Matches</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="pt-20 pb-24 px-4">
        <div className="container mx-auto max-w-4xl">
          {/* Balance Card */}
          <Card className="glass-card mb-6 border-gold-500/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-6 w-6 text-gold-500" />
                Your Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <div className="text-5xl font-bold text-gold-500 mb-2">
                  {wallet?.balance || 0}
                </div>
                <p className="text-muted-foreground">Credits</p>
              </div>
            </CardContent>
          </Card>

          {/* Credit Packages */}
          <Card className="glass-card mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-gold-500" />
                Purchase Credits
              </CardTitle>
              <CardDescription>
                Unlock premium features with credits
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {CREDIT_PACKAGES.map((pkg, index) => (
                  <Card
                    key={pkg.name}
                    className={`glass-card hover:border-gold-500/50 transition-colors cursor-pointer ${
                      pkg.name === 'Popular' ? 'border-gold-500' : ''
                    }`}
                  >
                    <CardContent className="pt-6 text-center">
                      {pkg.name === 'Popular' && (
                        <Badge className="bg-gold-500 text-black mb-2">Popular</Badge>
                      )}
                      <h3 className="text-lg font-semibold mb-2">{pkg.name}</h3>
                      <div className="text-3xl font-bold text-gold-500 mb-2">
                        {pkg.credits}
                      </div>
                      <p className="text-muted-foreground mb-4">Credits</p>
                      <div className="text-2xl font-bold mb-4">
                        KES {pkg.price}
                      </div>
                      <Button
                        onClick={() => handlePurchase(index)}
                        disabled={purchasing === index}
                        className={`w-full ${
                          pkg.name === 'Popular'
                            ? 'bg-gold-500 text-black hover:bg-gold-600'
                            : ''
                        }`}
                      >
                        {purchasing === index ? 'Processing...' : 'Purchase'}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Transaction History */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-6 w-6 text-gold-500" />
                Recent Transactions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No transactions yet
                </p>
              ) : (
                <div className="space-y-4">
                  {transactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`h-10 w-10 rounded-full flex items-center justify-center ${
                            transaction.type === 'purchase'
                              ? 'bg-green-500/20 text-green-500'
                              : transaction.type === 'spend'
                              ? 'bg-red-500/20 text-red-500'
                              : 'bg-gold-500/20 text-gold-500'
                          }`}
                        >
                          {transaction.type === 'purchase' && <CreditCard className="h-5 w-5" />}
                          {transaction.type === 'spend' && <Wallet className="h-5 w-5" />}
                          {transaction.type === 'bonus' && <Sparkles className="h-5 w-5" />}
                        </div>
                        <div>
                          <p className="font-medium">{transaction.description}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(new Date(transaction.created_at))}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={
                          transaction.type === 'purchase' || transaction.type === 'bonus'
                            ? 'default'
                            : 'destructive'
                        }
                        className={
                          transaction.type === 'purchase' || transaction.type === 'bonus'
                            ? 'bg-gold-500 text-black'
                            : ''
                        }
                      >
                        {transaction.type === 'purchase' || transaction.type === 'bonus'
                          ? `+${transaction.amount}`
                          : `-${transaction.amount}`}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

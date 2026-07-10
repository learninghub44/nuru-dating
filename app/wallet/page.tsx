'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Heart, Wallet, ArrowLeft, CreditCard, History, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import { CREDIT_PACKAGE_LIST, type CreditPackageId } from '@/lib/credit-packages'
import { useToast } from '@/components/ui/toast'

interface WalletData {
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

export default function WalletPage() {
  const router = useRouter()
  const [wallet, setWallet] = useState<WalletData | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState<CreditPackageId | null>(null)

  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    loadWallet()
  }, [])

  useEffect(() => {
    if (wallet?.id) {
      loadTransactions(wallet.id)
    }
  }, [wallet?.id])

  const loadWallet = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Wallets are auto-created by a DB trigger on profile creation, but
      // fall back to fetching in case an older account predates it.
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      setWallet(data)
    } catch (error) {
      console.error('Error loading wallet:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadTransactions = async (walletId: string) => {
    try {
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('wallet_id', walletId)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error
      setTransactions(data || [])
    } catch (error) {
      console.error('Error loading transactions:', error)
    }
  }

  const handlePurchase = async (packageId: CreditPackageId) => {
    setPurchasing(packageId)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Ask the server to create a pending payment record with the
      // authoritative price — the client never decides the amount charged.
      const initRes = await fetch('/api/payments/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId }),
      })

      if (!initRes.ok) {
        const err = await initRes.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to start payment')
      }

      const initData = await initRes.json()

      const paystack = new (window as any).PaystackPop()

      paystack.newTransaction({
        key: initData.publicKey,
        email: initData.email,
        amount: initData.amountInKobo,
        currency: 'KES',
        reference: initData.reference,
        metadata: {
          custom_fields: [
            { display_name: 'Package', variable_name: 'package', value: initData.packageName },
          ],
        },
        onSuccess: async () => {
          try {
            // The client's "success" callback is only a signal to check —
            // the server re-verifies directly with Paystack before crediting.
            const verifyRes = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ reference: initData.reference }),
            })

            if (!verifyRes.ok) {
              const err = await verifyRes.json().catch(() => ({}))
              throw new Error(err.error || 'Verification failed')
            }

            await loadWallet()
            toast({ title: 'Success', description: 'Credits added to your wallet!' })
          } catch (error) {
            console.error('Error verifying payment:', error)
            toast({
              title: 'Verification pending',
              description:
                'Payment received but verification failed. It will be reconciled automatically — contact support if your balance is not updated shortly.',
              variant: 'destructive',
            })
          } finally {
            setPurchasing(null)
          }
        },
        onCancel: () => {
          setPurchasing(null)
        },
        onError: (error: any) => {
          console.error('Payment error:', error)
          toast({ title: 'Payment failed', description: 'Please try again.', variant: 'destructive' })
          setPurchasing(null)
        },
      })
    } catch (error: any) {
      console.error('Error initiating payment:', error)
      toast({ title: 'Error', description: error.message || 'Failed to initiate payment. Please try again.', variant: 'destructive' })
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
                {CREDIT_PACKAGE_LIST.map((pkg) => (
                  <Card
                    key={pkg.id}
                    className={`glass-card hover:border-gold-500/50 transition-colors cursor-pointer ${
                      pkg.id === 'popular' ? 'border-gold-500' : ''
                    }`}
                  >
                    <CardContent className="pt-6 text-center">
                      {pkg.id === 'popular' && (
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
                        onClick={() => handlePurchase(pkg.id)}
                        disabled={purchasing === pkg.id}
                        className={`w-full ${
                          pkg.id === 'popular'
                            ? 'bg-gold-500 text-black hover:bg-gold-600'
                            : ''
                        }`}
                      >
                        {purchasing === pkg.id ? 'Processing...' : 'Purchase'}
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

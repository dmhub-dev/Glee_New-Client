import { useState } from 'react'
import { useTopUpWallet, useWallet, useWalletTransactions } from '@glee/api'
import { Badge, Button, Input, Skeleton, useToast } from '@glee/ui'
import { ArrowDownLeft, ArrowUpRight, CreditCard, Wallet } from 'lucide-react'
import CustomerLayout from '../CustomerLayout'

function money(value: number) {
  return `KSh ${Math.max(0, value).toLocaleString()}`
}

export default function CustomerWalletPage() {
  const { data: wallet, isLoading } = useWallet()
  const { data: transactions, isLoading: transactionsLoading } = useWalletTransactions()
  const topUp = useTopUpWallet()
  const { toast } = useToast()
  const [amount, setAmount] = useState('1000')
  const balance = Number(wallet?.balance ?? 0)

  async function handleTopUp() {
    const value = Number(amount)
    if (!value || value < 1) return
    try {
      const intent = await topUp.mutateAsync(value)
      if (intent.authorization_url) window.location.href = intent.authorization_url
      else toast({ title: 'Top-up initiated' })
    } catch (error) {
      toast({ title: 'Top-up failed', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' })
    }
  }

  return (
    <CustomerLayout title="Wallet" subtitle="Top up and pay for event tickets from your Glee wallet.">
      <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <section className="overflow-hidden rounded-xl border border-admin bg-admin-surface shadow-admin-card">
          <div className="bg-admin-surface-2 p-6">
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <Wallet className="h-6 w-6" />
              </div>
              <Badge className="border-emerald-400/30 bg-emerald-500/10 text-emerald-500">{wallet?.currency ?? 'KES'}</Badge>
            </div>
            <p className="mt-8 text-xs uppercase tracking-wider text-admin-50">Available Balance</p>
            {isLoading ? <Skeleton className="mt-3 h-12 w-52" /> : <p className="mt-2 font-heading text-5xl font-black text-foreground">{money(balance)}</p>}
            <p className="mt-2 text-sm text-admin-60">Use your wallet for full payments or eligible ticket deposits.</p>
          </div>
          <div className="border-t border-admin bg-admin-input p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <CreditCard className="h-4 w-4 text-neon-pink" />
              Top up wallet
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <Input
                type="number"
                min={1}
                value={amount}
                onChange={event => setAmount(event.target.value)}
                className="h-11 border-admin bg-admin-surface text-foreground"
              />
              <Button onClick={handleTopUp} disabled={topUp.isPending} className="h-11 rounded-full bg-neon-pink px-6 text-white hover:bg-neon-pink/90">
                {topUp.isPending ? 'Starting...' : 'Top Up'}
              </Button>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-admin bg-admin-surface p-5 shadow-admin">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-heading text-xl font-black text-foreground">Transactions</h2>
              <p className="mt-1 text-sm text-admin-60">Wallet credits, ticket payments, and reservations.</p>
            </div>
            <Badge className="border-admin bg-admin-input text-admin-70">{transactions?.length ?? 0} total</Badge>
          </div>
          <div className="mt-5 space-y-3">
            {transactionsLoading ? (
              Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-16 rounded-lg" />)
            ) : (transactions ?? []).length === 0 ? (
              <div className="rounded-lg border border-admin bg-admin-input p-10 text-center">
                <Wallet className="mx-auto h-8 w-8 text-admin-40" />
                <p className="mt-3 text-sm font-semibold text-foreground">No wallet transactions yet</p>
                <p className="mt-1 text-xs text-admin-50">Top up your wallet or buy a ticket to see activity here.</p>
              </div>
            ) : (transactions ?? []).map(tx => {
              const isCredit = tx.type === 'CREDIT'
              return (
                <div key={tx.id} className="flex items-center justify-between gap-4 rounded-lg border border-admin bg-admin-input p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${isCredit ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {isCredit ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{tx.description ?? tx.type}</p>
                      <p className="mt-0.5 text-xs text-admin-50">{new Date(tx.createdAt).toLocaleString('en-KE')}</p>
                    </div>
                  </div>
                  <p className={`shrink-0 font-mono text-sm font-bold ${isCredit ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {isCredit ? '+' : '-'}{money(Number(tx.amount ?? 0))}
                  </p>
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </CustomerLayout>
  )
}

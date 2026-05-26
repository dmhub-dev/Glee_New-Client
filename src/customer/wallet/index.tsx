import { useState } from 'react'
import { useTopUpWallet, useWallet, useWalletTransactions } from '@glee/api'
import { Button, Input, Skeleton, useToast } from '@glee/ui'
import { ArrowDownLeft, ArrowUpRight, Wallet } from 'lucide-react'
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

  async function handleTopUp() {
    const value = Number(amount)
    if (!value || value < 1) return
    try {
      const intent = await topUp.mutateAsync(value)
      if (intent.authorization_url) {
        window.location.href = intent.authorization_url
      } else {
        toast({ title: 'Top-up initiated' })
      }
    } catch (error) {
      toast({ title: 'Top-up failed', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' })
    }
  }

  return (
    <CustomerLayout title="Wallet" subtitle="Top up and pay for event tickets from your Glee wallet.">
      <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <section className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neon-pink/10 text-neon-pink">
            <Wallet className="h-6 w-6" />
          </div>
          <p className="mt-6 text-xs uppercase tracking-wider text-white/40">Available Balance</p>
          {isLoading ? <Skeleton className="mt-2 h-10 w-40" /> : <p className="mt-2 font-heading text-4xl font-black text-white">{money(Number(wallet?.balance ?? 0))}</p>}
          <p className="mt-1 text-sm text-white/40">{wallet?.currency ?? 'KES'}</p>

          <div className="mt-6 space-y-3">
            <Input
              type="number"
              min={1}
              value={amount}
              onChange={event => setAmount(event.target.value)}
              className="border-white/10 bg-white/5 text-white"
            />
            <Button onClick={handleTopUp} disabled={topUp.isPending} className="w-full bg-neon-pink text-white hover:bg-neon-pink/90">
              {topUp.isPending ? 'Starting...' : 'Top Up Wallet'}
            </Button>
          </div>
        </section>

        <section className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
          <h2 className="font-heading text-lg font-black text-white">Transactions</h2>
          <div className="mt-4 space-y-2">
            {transactionsLoading ? (
              Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-14 rounded-lg" />)
            ) : (transactions ?? []).length === 0 ? (
              <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center text-sm text-white/40">No wallet transactions yet.</div>
            ) : (transactions ?? []).map(tx => {
              const isCredit = tx.type === 'CREDIT'
              return (
                <div key={tx.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/20 p-3">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-full ${isCredit ? 'bg-green-500/10 text-green-400' : 'bg-amber-500/10 text-amber-400'}`}>
                      {isCredit ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{tx.description ?? tx.type}</p>
                      <p className="text-xs text-white/40">{new Date(tx.createdAt).toLocaleString('en-KE')}</p>
                    </div>
                  </div>
                  <p className={`font-mono text-sm font-semibold ${isCredit ? 'text-green-400' : 'text-amber-400'}`}>
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

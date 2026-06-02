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
        <section className="overflow-hidden rounded-xl border border-emerald-100 bg-white shadow-sm">
          <div className="bg-gradient-to-br from-emerald-50 via-white to-rose-50 p-6">
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <Wallet className="h-6 w-6" />
              </div>
              <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">{wallet?.currency ?? 'KES'}</Badge>
            </div>
            <p className="mt-8 text-xs uppercase tracking-wider text-slate-500">Available Balance</p>
            {isLoading ? <Skeleton className="mt-3 h-12 w-52" /> : <p className="mt-2 font-heading text-5xl font-black text-slate-950">{money(balance)}</p>}
            <p className="mt-2 text-sm text-slate-500">Use your wallet for full payments or eligible ticket deposits.</p>
          </div>
          <div className="border-t border-slate-200 bg-slate-50 p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
              <CreditCard className="h-4 w-4 text-rose-600" />
              Top up wallet
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <Input
                type="number"
                min={1}
                value={amount}
                onChange={event => setAmount(event.target.value)}
                className="h-11 border-slate-200 bg-white text-slate-950"
              />
              <Button onClick={handleTopUp} disabled={topUp.isPending} className="h-11 rounded-full bg-rose-600 px-6 text-white hover:bg-rose-700">
                {topUp.isPending ? 'Starting...' : 'Top Up'}
              </Button>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-heading text-xl font-black text-slate-950">Transactions</h2>
              <p className="mt-1 text-sm text-slate-500">Wallet credits, ticket payments, and reservations.</p>
            </div>
            <Badge className="border-slate-200 bg-slate-50 text-slate-600">{transactions?.length ?? 0} total</Badge>
          </div>
          <div className="mt-5 space-y-3">
            {transactionsLoading ? (
              Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-16 rounded-lg" />)
            ) : (transactions ?? []).length === 0 ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-10 text-center">
                <Wallet className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-3 text-sm font-semibold text-slate-700">No wallet transactions yet</p>
                <p className="mt-1 text-xs text-slate-500">Top up your wallet or buy a ticket to see activity here.</p>
              </div>
            ) : (transactions ?? []).map(tx => {
              const isCredit = tx.type === 'CREDIT'
              return (
                <div key={tx.id} className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${isCredit ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {isCredit ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-950">{tx.description ?? tx.type}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{new Date(tx.createdAt).toLocaleString('en-KE')}</p>
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

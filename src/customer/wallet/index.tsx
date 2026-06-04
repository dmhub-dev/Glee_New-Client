import { useState } from 'react'
import { useTopUpWallet, useWallet, useWalletTransactions } from '@glee/api'
import { Badge, Button, Input, Skeleton, useToast } from '@glee/ui'
import { ArrowDownLeft, ArrowUpRight, CreditCard, Wallet } from 'lucide-react'
import CustomerLayout from '../CustomerLayout'

function money(value: number) {
  return `KSh ${Math.max(0, value).toLocaleString()}`
}

function signedMoney(value: number, isCredit: boolean) {
  return `${isCredit ? '+' : '-'}${money(value)}`
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('en-KE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function shortRef(value?: string | null) {
  if (!value) return '-'
  return value.length > 18 ? `${value.slice(0, 10)}...${value.slice(-6)}` : value
}

function transactionLabel(type: string) {
  if (type === 'CREDIT') return 'Credit'
  if (type === 'DEBIT') return 'Debit'
  return type.replace(/_/g, ' ').toLowerCase()
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
    <CustomerLayout title="Wallet" subtitle="Top up and pay for event tickets from your Glee wallet." hidePageHeader>
      <div className="mx-auto w-full max-w-7xl min-w-0 space-y-4 overflow-x-hidden px-3 pb-32 pt-5 sm:px-4 lg:px-8">
        <section className="min-w-0 rounded-3xl border border-white/12 bg-white/[0.08] p-4 shadow-[0_18px_55px_rgba(0,0,0,0.22)] sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-neon-pink">Glee wallet</p>
          <h1 className="mt-3 font-heading text-3xl font-black leading-none text-white">Wallet</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/58">Top up once. Pay for tickets, deposits, and eligible reservations faster.</p>
        </section>

      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(320px,420px)_1fr]">
        <section className="min-w-0 overflow-hidden rounded-3xl border border-white/12 bg-white/[0.08] shadow-[0_18px_55px_rgba(0,0,0,0.22)]">
          <div className="bg-gradient-to-br from-white/[0.14] to-white/[0.05] p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-200">
                <Wallet className="h-6 w-6" />
              </div>
              <Badge className="border-emerald-400/30 bg-emerald-500/10 text-emerald-500">{wallet?.currency ?? 'KES'}</Badge>
            </div>
            <p className="mt-7 text-xs uppercase tracking-wider text-white/45">Available Balance</p>
            {isLoading ? <Skeleton className="mt-3 h-12 w-44 max-w-full bg-white/10" /> : <p className="mt-2 break-words font-heading text-[2.35rem] font-black leading-none text-white">{money(balance)}</p>}
            <p className="mt-2 text-sm text-white/58">Use your wallet for full payments or eligible ticket deposits.</p>
          </div>
          <div className="border-t border-white/10 bg-black/20 p-4 sm:p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
              <CreditCard className="h-4 w-4 text-neon-pink" />
              Top up wallet
            </div>
            <div className="grid gap-3">
              <Input
                type="number"
                min={1}
                value={amount}
                onChange={event => setAmount(event.target.value)}
                className="h-11 rounded-full border-white/15 bg-white/[0.08] text-white placeholder:text-white/35"
              />
              <Button onClick={handleTopUp} disabled={topUp.isPending} className="h-11 rounded-full bg-neon-pink px-6 text-white hover:bg-neon-pink/90">
                {topUp.isPending ? 'Starting...' : 'Top Up'}
              </Button>
            </div>
          </div>
        </section>

        <section className="min-w-0 rounded-3xl border border-white/12 bg-white/[0.08] p-4 shadow-[0_18px_55px_rgba(0,0,0,0.22)] sm:p-5">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-heading text-xl font-black text-white">Transactions</h2>
              <p className="mt-1 text-sm text-white/58">Wallet credits, ticket payments, and reservations.</p>
            </div>
            <Badge className="shrink-0 border-white/10 bg-white/[0.08] text-white/70">{transactions?.length ?? 0} total</Badge>
          </div>
          <div className="mt-5">
            {transactionsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-16 rounded-2xl bg-white/10" />)}
              </div>
            ) : (transactions ?? []).length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-black/20 p-10 text-center">
                <Wallet className="mx-auto h-8 w-8 text-white/40" />
                <p className="mt-3 text-sm font-semibold text-white">No wallet transactions yet</p>
                <p className="mt-1 text-xs text-white/50">Top up your wallet or buy a ticket to see activity here.</p>
              </div>
            ) : (
                <div className="space-y-3">
                  {(transactions ?? []).map(tx => {
                    const isCredit = tx.type === 'CREDIT'
                    return (
                      <article key={tx.id} className="min-w-0 rounded-2xl border border-white/10 bg-black/20 p-3.5">
                        <div className="flex min-w-0 items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${isCredit ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                              {isCredit ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-white">{tx.description ?? tx.type}</p>
                              <p className="mt-0.5 text-xs text-white/50">{formatDate(tx.createdAt)}</p>
                            </div>
                          </div>
                          <p className={`shrink-0 whitespace-nowrap font-mono text-sm font-bold ${isCredit ? 'text-emerald-500' : 'text-amber-500'}`}>
                            {signedMoney(Number(tx.amount ?? 0), isCredit)}
                          </p>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                          <div className="rounded-xl border border-white/10 bg-white/[0.06] p-3">
                            <p className="text-white/40">Type</p>
                            <p className="mt-1 font-semibold text-white/75">{transactionLabel(tx.type)}</p>
                          </div>
                          <div className="rounded-xl border border-white/10 bg-white/[0.06] p-3">
                            <p className="text-white/40">Balance</p>
                            <p className="mt-1 font-mono font-semibold text-white/75">{money(Number(tx.balanceAfter ?? 0))}</p>
                          </div>
                          <div className="col-span-2 rounded-xl border border-white/10 bg-white/[0.06] p-3">
                            <p className="text-white/40">Reference</p>
                            <p className="mt-1 truncate font-mono text-white/65" title={tx.reference ?? undefined}>{shortRef(tx.reference)}</p>
                          </div>
                        </div>
                      </article>
                    )
                  })}
                </div>
            )}
          </div>
        </section>
      </div>
      </div>
    </CustomerLayout>
  )
}

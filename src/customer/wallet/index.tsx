import { useState } from 'react'
import { useTopUpWallet, useWallet, useWalletTransactions } from '@glee/api'
import { Badge, Button, Input, Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, useToast } from '@glee/ui'
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
          <div className="mt-5">
            {transactionsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-16 rounded-lg" />)}
              </div>
            ) : (transactions ?? []).length === 0 ? (
              <div className="rounded-lg border border-admin bg-admin-input p-10 text-center">
                <Wallet className="mx-auto h-8 w-8 text-admin-40" />
                <p className="mt-3 text-sm font-semibold text-foreground">No wallet transactions yet</p>
                <p className="mt-1 text-xs text-admin-50">Top up your wallet or buy a ticket to see activity here.</p>
              </div>
            ) : (
              <>
                <div className="hidden overflow-hidden rounded-xl border border-admin lg:block">
                  <Table>
                    <TableHeader className="bg-admin-input">
                      <TableRow className="border-admin hover:bg-admin-input">
                        <TableHead className="text-admin-60">Date</TableHead>
                        <TableHead className="text-admin-60">Description</TableHead>
                        <TableHead className="text-admin-60">Type</TableHead>
                        <TableHead className="text-right text-admin-60">Amount</TableHead>
                        <TableHead className="text-right text-admin-60">Balance</TableHead>
                        <TableHead className="text-admin-60">Reference</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(transactions ?? []).map(tx => {
                        const isCredit = tx.type === 'CREDIT'
                        return (
                          <TableRow key={tx.id} className="border-admin hover:bg-admin-overlay">
                            <TableCell className="whitespace-nowrap font-mono text-xs text-admin-60">{formatDate(tx.createdAt)}</TableCell>
                            <TableCell>
                              <div className="flex min-w-0 items-center gap-3">
                                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${isCredit ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                  {isCredit ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                                </div>
                                <p className="max-w-[260px] truncate font-semibold text-foreground">{tx.description ?? tx.type}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={isCredit ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-500' : 'border-amber-400/30 bg-amber-500/10 text-amber-500'}>
                                {transactionLabel(tx.type)}
                              </Badge>
                            </TableCell>
                            <TableCell className={`whitespace-nowrap text-right font-mono font-bold ${isCredit ? 'text-emerald-500' : 'text-amber-500'}`}>
                              {signedMoney(Number(tx.amount ?? 0), isCredit)}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-right font-mono text-admin-80">{money(Number(tx.balanceAfter ?? 0))}</TableCell>
                            <TableCell className="font-mono text-xs text-admin-50" title={tx.reference ?? undefined}>{shortRef(tx.reference)}</TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>

                <div className="space-y-3 lg:hidden">
                  {(transactions ?? []).map(tx => {
                    const isCredit = tx.type === 'CREDIT'
                    return (
                      <article key={tx.id} className="rounded-xl border border-admin bg-admin-input p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${isCredit ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                              {isCredit ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-foreground">{tx.description ?? tx.type}</p>
                              <p className="mt-0.5 text-xs text-admin-50">{formatDate(tx.createdAt)}</p>
                            </div>
                          </div>
                          <p className={`shrink-0 font-mono text-sm font-bold ${isCredit ? 'text-emerald-500' : 'text-amber-500'}`}>
                            {signedMoney(Number(tx.amount ?? 0), isCredit)}
                          </p>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                          <div className="rounded-lg border border-admin bg-admin-surface p-3">
                            <p className="text-admin-40">Type</p>
                            <p className="mt-1 font-semibold text-admin-80">{transactionLabel(tx.type)}</p>
                          </div>
                          <div className="rounded-lg border border-admin bg-admin-surface p-3">
                            <p className="text-admin-40">Balance</p>
                            <p className="mt-1 font-mono font-semibold text-admin-80">{money(Number(tx.balanceAfter ?? 0))}</p>
                          </div>
                          <div className="col-span-2 rounded-lg border border-admin bg-admin-surface p-3">
                            <p className="text-admin-40">Reference</p>
                            <p className="mt-1 truncate font-mono text-admin-70" title={tx.reference ?? undefined}>{shortRef(tx.reference)}</p>
                          </div>
                        </div>
                      </article>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </CustomerLayout>
  )
}

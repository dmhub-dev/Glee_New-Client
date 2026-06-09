import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../client'

export interface WalletTransaction {
  id: string
  type: 'CREDIT' | 'DEBIT' | string
  amount: string | number
  balanceAfter: string | number
  description?: string | null
  reference?: string | null
  createdAt: string
}

export interface Wallet {
  id: string
  userId: string
  balance: string | number
  currency: string
  isActive: boolean
  recentTransactions?: WalletTransaction[]
}

export const walletKeys = {
  wallet: ['wallet'] as const,
  transactions: ['wallet', 'transactions'] as const,
}

export function getWallet(): Promise<Wallet> {
  return apiFetch<{ success: boolean; data: Wallet }>('/api/v1/wallet').then(r => r.data)
}

export function getWalletTransactions(): Promise<WalletTransaction[]> {
  return apiFetch<{ success: boolean; data: { items: WalletTransaction[] } }>('/api/v1/wallet/transactions?page=1&limit=100')
    .then(r => r.data?.items ?? [])
}

export function topUpWallet(amount: number, callbackUrl?: string): Promise<{ authorization_url?: string; access_code?: string; reference?: string }> {
  return apiFetch<{ success: boolean; data: { authorization_url?: string; access_code?: string; reference?: string } }>('/api/v1/wallet/top-up', {
    method: 'POST',
    body: JSON.stringify({ amount, currency: 'KES', callbackUrl }),
  }).then(r => r.data)
}

export function useWallet() {
  return useQuery({ queryKey: walletKeys.wallet, queryFn: getWallet })
}

export function useWalletTransactions() {
  return useQuery({ queryKey: walletKeys.transactions, queryFn: getWalletTransactions })
}

export function useTopUpWallet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { amount: number; callbackUrl?: string }) => topUpWallet(params.amount, params.callbackUrl),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: walletKeys.wallet })
      qc.invalidateQueries({ queryKey: walletKeys.transactions })
    },
  })
}

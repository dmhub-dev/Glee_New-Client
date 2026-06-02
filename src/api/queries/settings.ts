import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../client'

export interface EventCheckoutSettings {
  walletInstallmentDepositType: 'PERCENTAGE' | 'FIXED'
  walletInstallmentDepositPercent: number
  walletInstallmentDepositAmount: number
  walletInstallmentSecurityFeeType: 'PERCENTAGE' | 'FIXED'
  walletInstallmentSecurityFeePercent: number
  walletInstallmentSecurityFeeAmount: number
}

export const settingsKeys = {
  eventCheckout: ['settings', 'event-checkout'] as const,
}

export function getEventCheckoutSettings(): Promise<EventCheckoutSettings> {
  return apiFetch<{ success: boolean; data: EventCheckoutSettings }>('/api/v1/settings/event-checkout', { skipAuth: true })
    .then(r => r.data)
}

export function updateEventCheckoutSettings(payload: EventCheckoutSettings): Promise<EventCheckoutSettings> {
  return apiFetch<{ success: boolean; data: EventCheckoutSettings }>('/api/v1/settings/event-checkout', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }).then(r => r.data)
}

export function useEventCheckoutSettings() {
  return useQuery({
    queryKey: settingsKeys.eventCheckout,
    queryFn: getEventCheckoutSettings,
    staleTime: 0,
  })
}

export function useUpdateEventCheckoutSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: updateEventCheckoutSettings,
    onSuccess: () => qc.invalidateQueries({ queryKey: settingsKeys.eventCheckout }),
  })
}

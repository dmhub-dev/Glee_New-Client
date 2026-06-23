import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Button, Input, Label, cn } from '@glee/ui'
import type { PayoutMethod, UpdatePayoutProfilePayload, VendorPayoutProfile } from '@glee/api'
import PayoutStatusBadge from './PayoutStatusBadge'

function profileDefaults(profile?: VendorPayoutProfile | null): UpdatePayoutProfilePayload {
  return {
    method: profile?.method ?? 'BANK_TRANSFER',
    accountName: profile?.accountName ?? '',
    bankName: profile?.bankName ?? '',
    bankCode: profile?.bankCode ?? '',
    accountNumber: profile?.accountNumber ?? '',
    mobileMoneyProvider: profile?.mobileMoneyProvider ?? '',
    mobileMoneyNumber: profile?.mobileMoneyNumber ?? '',
    currency: 'KES',
  }
}

export default function PayoutProfileForm({
  profile,
  readOnly,
  isSaving,
  onSubmit,
}: {
  profile?: VendorPayoutProfile | null
  readOnly: boolean
  isSaving?: boolean
  onSubmit: (payload: UpdatePayoutProfilePayload) => void
}) {
  const { register, handleSubmit, watch, reset, setValue } = useForm<UpdatePayoutProfilePayload>({
    defaultValues: profileDefaults(profile),
  })
  const method = watch('method')

  useEffect(() => {
    reset(profileDefaults(profile))
  }, [profile, reset])

  function chooseMethod(value: PayoutMethod) {
    if (readOnly) return
    setValue('method', value, { shouldDirty: true })
  }

  return (
    <section className="rounded-2xl border border-admin bg-admin-surface p-5 shadow-admin-card">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-heading text-base font-bold text-foreground">Payout Profile</h2>
          <p className="mt-1 text-sm text-admin-40">Bank and mobile money details are KES-only for v1.</p>
        </div>
        {profile?.status && <PayoutStatusBadge status={profile.status} />}
      </div>

      {profile?.status === 'PENDING_VERIFICATION' && (
        <div className="mb-4 rounded-lg border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Your payout details are pending Glee verification.
        </div>
      )}
      {profile?.status === 'REJECTED' && (
        <div className="mb-4 rounded-lg border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {profile.rejectionReason ?? 'Your payout details were rejected. Update and resubmit them.'}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-2">
          {(['BANK_TRANSFER', 'MOBILE_MONEY'] as PayoutMethod[]).map(option => (
            <button
              key={option}
              type="button"
              disabled={readOnly}
              onClick={() => chooseMethod(option)}
              className={cn(
                'rounded-lg border px-4 py-3 text-left text-sm font-semibold',
                method === option ? 'border-neon-pink/40 bg-neon-pink/10 text-neon-pink' : 'border-admin bg-admin-overlay text-admin-50',
                readOnly && 'cursor-not-allowed opacity-70',
              )}
            >
              {option === 'BANK_TRANSFER' ? 'Bank Transfer' : 'Mobile Money'}
            </button>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs text-admin-50">Account Name</Label>
            <Input disabled={readOnly} {...register('accountName')} className="border-admin bg-admin-input" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-admin-50">Currency</Label>
            <Input value="KES" readOnly className="border-admin bg-admin-input" />
          </div>
          {method === 'BANK_TRANSFER' ? (
            <>
              <div className="space-y-1">
                <Label className="text-xs text-admin-50">Bank Name</Label>
                <Input disabled={readOnly} {...register('bankName')} className="border-admin bg-admin-input" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-admin-50">Bank Code</Label>
                <Input disabled={readOnly} {...register('bankCode')} className="border-admin bg-admin-input" />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label className="text-xs text-admin-50">Account Number</Label>
                <Input disabled={readOnly} {...register('accountNumber')} className="border-admin bg-admin-input" />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1">
                <Label className="text-xs text-admin-50">Mobile Money Provider</Label>
                <Input disabled={readOnly} {...register('mobileMoneyProvider')} className="border-admin bg-admin-input" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-admin-50">Mobile Money Number</Label>
                <Input disabled={readOnly} {...register('mobileMoneyNumber')} className="border-admin bg-admin-input" />
              </div>
            </>
          )}
        </div>

        {!readOnly && (
          <Button type="submit" disabled={isSaving} className="bg-neon-pink text-white hover:bg-neon-pink/90">
            {isSaving ? 'Saving...' : 'Save Payout Details'}
          </Button>
        )}
      </form>
    </section>
  )
}

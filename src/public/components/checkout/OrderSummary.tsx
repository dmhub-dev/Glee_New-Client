import { Separator, Button } from '@glee/ui'

interface OrderSummaryProps {
  eventTitle: string
  eventDate: string
  tierName: string
  tierPrice: number
  onPayNow: () => void
  isProcessing: boolean
  isFormValid: boolean
}

export default function OrderSummary({
  eventTitle,
  eventDate,
  tierName,
  tierPrice,
  onPayNow,
  isProcessing,
  isFormValid,
}: OrderSummaryProps) {
  return (
    <div className="sticky top-24 rounded-lg border border-border bg-card p-6 flex flex-col gap-4">
      <h2 className="font-heading font-bold text-lg text-foreground">Order Summary</h2>

      <div className="flex flex-col gap-1">
        <p className="font-semibold text-foreground">{eventTitle}</p>
        <p className="text-xs text-muted-foreground font-mono">{eventDate}</p>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{tierName}</span>
        <span className="font-mono text-foreground">KSh {tierPrice.toLocaleString()}</span>
      </div>

      <Separator className="bg-neon-pink/40" />

      <div className="flex items-center justify-between font-bold">
        <span className="text-foreground">Total</span>
        <span className="font-mono text-neon-pink text-lg">KSh {tierPrice.toLocaleString()}</span>
      </div>

      <Button
        onClick={onPayNow}
        disabled={isProcessing || !isFormValid}
        className="w-full bg-neon-pink hover:bg-neon-hover text-white font-semibold shadow-neon disabled:opacity-40"
      >
        {isProcessing ? 'Processing…' : 'Pay Now'}
      </Button>

      <p className="text-xs text-muted-foreground text-center">Secured by Paystack</p>
    </div>
  )
}

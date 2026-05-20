import { useState, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { usePaystackPayment } from 'react-paystack'
import { Button, useToast } from '@glee/ui'
import PageWrapper from '../../components/layout/PageWrapper'
import BuyerForm from '../../components/checkout/BuyerForm'
import OrderSummary from '../../components/checkout/OrderSummary'
import { checkoutSchema, type CheckoutFormValues } from '../../lib/schemas/checkout'

interface CheckoutState {
  eventId: string
  tierId: string
  tierName: string
  tierPrice: number
  eventTitle: string
  eventDate: string
}

export default function CheckoutPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as CheckoutState | null
  const { toast } = useToast()

  const [isProcessing, setIsProcessing] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const paymentRef = useRef(`glee-${Date.now()}-${Math.random().toString(36).slice(2)}`)

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    mode: 'onChange',
    defaultValues: { fullName: '', email: '', phone: '' },
  })

  const watchedValues = form.watch()

  const initializePayment = usePaystackPayment({
    reference: paymentRef.current,
    email: watchedValues.email || 'placeholder@glee.app',
    amount: (state?.tierPrice ?? 0) * 100,
    currency: 'KES',
    publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY ?? '',
    metadata: {
      custom_fields: [
        { display_name: 'Full Name', variable_name: 'full_name', value: watchedValues.fullName ?? '' },
        { display_name: 'Phone', variable_name: 'phone', value: watchedValues.phone ?? '' },
        { display_name: 'Event ID', variable_name: 'event_id', value: state?.eventId ?? '' },
        { display_name: 'Tier ID', variable_name: 'tier_id', value: state?.tierId ?? '' },
      ],
    },
  })

  if (!state) {
    navigate('/', { replace: true })
    return null
  }

  const handlePayNow = async () => {
    const isValid = await form.trigger()
    if (!isValid) return
    setIsProcessing(true)
    initializePayment({
      onSuccess: () => {
        setIsProcessing(false)
        setIsSuccess(true)
      },
      onClose: () => {
        setIsProcessing(false)
        paymentRef.current = `glee-${Date.now()}-${Math.random().toString(36).slice(2)}`
        toast({ title: 'Payment cancelled', description: 'You can try again.', variant: 'destructive' })
      },
    })
  }

  if (isSuccess) {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-6">
          <div className="text-6xl">🎉</div>
          <h1 className="font-heading font-black text-4xl text-foreground">Ticket Confirmed!</h1>
          <p className="text-muted-foreground text-lg">{state.eventTitle}</p>
          <p className="text-muted-foreground font-mono text-sm">
            {state.tierName} · KSh {state.tierPrice.toLocaleString()}
          </p>
          <p className="text-muted-foreground text-sm max-w-sm">
            A confirmation has been sent to <strong>{watchedValues.email}</strong>. See you at the event!
          </p>
          <Button
            onClick={() => navigate('/')}
            className="bg-neon-pink hover:bg-neon-hover text-white font-semibold shadow-neon"
          >
            Back to Events
          </Button>
        </div>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper>
      <div className="mb-8">
        <h1 className="font-heading font-black text-3xl text-foreground">Checkout</h1>
        <p className="text-muted-foreground mt-1">
          {state.eventTitle} · {state.tierName}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
        <div className="lg:col-span-3">
          <h2 className="font-heading font-bold text-lg text-foreground mb-4">Your Details</h2>
          <BuyerForm form={form} />
        </div>

        <div className="lg:col-span-2">
          <OrderSummary
            eventTitle={state.eventTitle}
            eventDate={state.eventDate}
            tierName={state.tierName}
            tierPrice={state.tierPrice}
            onPayNow={handlePayNow}
            isProcessing={isProcessing}
            isFormValid={form.formState.isValid}
          />
        </div>
      </div>
    </PageWrapper>
  )
}

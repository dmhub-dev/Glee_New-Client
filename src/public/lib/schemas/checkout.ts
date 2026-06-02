import { z } from 'zod'

export const checkoutSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
})

export type CheckoutFormValues = z.infer<typeof checkoutSchema>

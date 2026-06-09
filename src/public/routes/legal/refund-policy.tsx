import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

const LAST_UPDATED = 'June 2026'

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-[#10101d] px-4 py-10 text-white">
      <div className="mx-auto max-w-2xl">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-white/50 transition-colors hover:text-white mb-8">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>

        <p className="text-xs font-bold uppercase tracking-widest text-neon-pink mb-2">Legal</p>
        <h1 className="font-heading text-3xl font-black text-white mb-1">Refund &amp; Returns Policy</h1>
        <p className="text-sm text-white/40 mb-10">Last updated: {LAST_UPDATED}</p>

        <div className="space-y-8 text-[15px] leading-relaxed text-white/75">
          <section>
            <h2 className="mb-3 text-lg font-bold text-white">1. All Sales Are Final</h2>
            <p>Ticket purchases on Glee are non-refundable and non-transferable unless the event is cancelled or significantly changed by the event organiser. We strongly encourage you to confirm event details before purchasing.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-white">2. Event Cancellation by Organiser</h2>
            <p>If an event is officially cancelled by the organiser, you are entitled to a full refund of the ticket price paid. Refunds will be processed to your original payment method within 7–14 business days, or credited to your Glee wallet at your election.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-white">3. Event Postponement</h2>
            <p>If an event is postponed to a future date, your ticket remains valid for the rescheduled date. If the new date does not work for you, contact the event organiser directly. Glee does not guarantee refunds for postponed events.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-white">4. Duplicate Purchases</h2>
            <p>If you accidentally purchased the same ticket twice, contact us within 24 hours at <a href="mailto:support@dmhub.cloud" className="text-neon-pink hover:underline">support@dmhub.cloud</a> with your order references. Duplicate refunds are subject to review.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-white">5. Installment Plans</h2>
            <p>Tickets purchased on an installment plan are non-refundable. The deposit and any paid installments are forfeited if you fail to complete the payment plan by the stated deadline. Your ticket will be cancelled automatically.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-white">6. Wallet Credits</h2>
            <p>Wallet top-ups are non-refundable and can only be used for purchases on the Glee platform. Wallet balances do not expire.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-white">7. Menu Pre-Orders</h2>
            <p>Pre-ordered food and drink add-ons are non-refundable once the order has been confirmed. Please review your menu selections carefully before completing your purchase.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-white">8. How to Request a Refund</h2>
            <p>For eligible refunds, email <a href="mailto:support@dmhub.cloud" className="text-neon-pink hover:underline">support@dmhub.cloud</a> with your order ID and the reason for your request. We aim to respond within 2 business days.</p>
          </section>
        </div>

        <div className="mt-12 flex flex-wrap gap-4 border-t border-white/10 pt-8 text-sm text-white/40">
          <Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link>
          <Link to="/terms" className="hover:text-white transition-colors">Terms of Use</Link>
        </div>
      </div>
    </div>
  )
}

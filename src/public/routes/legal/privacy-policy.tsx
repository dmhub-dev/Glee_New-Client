import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

const LAST_UPDATED = 'June 2026'

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#10101d] px-4 py-10 text-white">
      <div className="mx-auto max-w-2xl">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-white/50 transition-colors hover:text-white mb-8">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>

        <p className="text-xs font-bold uppercase tracking-widest text-neon-pink mb-2">Legal</p>
        <h1 className="font-heading text-3xl font-black text-white mb-1">Privacy Policy</h1>
        <p className="text-sm text-white/40 mb-10">Last updated: {LAST_UPDATED}</p>

        <div className="space-y-8 text-[15px] leading-relaxed text-white/75">
          <section>
            <h2 className="mb-3 text-lg font-bold text-white">1. Information We Collect</h2>
            <p>When you create an account, purchase tickets, or interact with Glee, we collect information you provide directly — such as your name, email address, phone number, and payment details. We also collect usage data such as pages visited, device type, and IP address to improve our services.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-white">2. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>To process ticket purchases and send order confirmations</li>
              <li>To send event reminders, announcements, and updates from event hosts</li>
              <li>To manage your account and wallet balance</li>
              <li>To prevent fraud and ensure platform security</li>
              <li>To comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-white">3. Sharing of Information</h2>
            <p>We do not sell your personal data. We share your information only with:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Event organisers, to the extent necessary to fulfill your ticket purchase</li>
              <li>Payment processors (Paystack) to complete transactions securely</li>
              <li>Service providers operating on our behalf under strict confidentiality</li>
              <li>Law enforcement when required by applicable law</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-white">4. Data Retention</h2>
            <p>We retain your account data for as long as your account is active or as needed to provide services. You may request deletion of your account by contacting support. Transaction records are retained for the period required by financial regulations.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-white">5. Security</h2>
            <p>We use industry-standard encryption and access controls to protect your data. However, no method of transmission over the internet is 100% secure. We encourage you to use a strong, unique password and enable two-factor authentication on your account.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-white">6. Your Rights</h2>
            <p>You have the right to access, correct, or delete your personal data. To exercise these rights, contact us at <a href="mailto:support@dmhub.cloud" className="text-neon-pink hover:underline">support@dmhub.cloud</a>.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-white">7. Changes to This Policy</h2>
            <p>We may update this policy periodically. Continued use of Glee after changes are posted constitutes acceptance of the updated policy.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-white">8. Contact</h2>
            <p>Questions about this policy? Email <a href="mailto:support@dmhub.cloud" className="text-neon-pink hover:underline">support@dmhub.cloud</a>.</p>
          </section>
        </div>

        <div className="mt-12 flex flex-wrap gap-4 border-t border-white/10 pt-8 text-sm text-white/40">
          <Link to="/terms" className="hover:text-white transition-colors">Terms of Use</Link>
          <Link to="/refund-policy" className="hover:text-white transition-colors">Refund Policy</Link>
        </div>
      </div>
    </div>
  )
}

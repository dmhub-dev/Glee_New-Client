import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

const LAST_UPDATED = 'June 2026'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#10101d] px-4 py-10 text-white">
      <div className="mx-auto max-w-2xl">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-white/50 transition-colors hover:text-white mb-8">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>

        <p className="text-xs font-bold uppercase tracking-widest text-neon-pink mb-2">Legal</p>
        <h1 className="font-heading text-3xl font-black text-white mb-1">Terms of Use</h1>
        <p className="text-sm text-white/40 mb-10">Last updated: {LAST_UPDATED}</p>

        <div className="space-y-8 text-[15px] leading-relaxed text-white/75">
          <section>
            <h2 className="mb-3 text-lg font-bold text-white">1. Acceptance of Terms</h2>
            <p>By accessing or using Glee, you agree to be bound by these Terms of Use and our Privacy Policy. If you do not agree, do not use the platform.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-white">2. Use of the Platform</h2>
            <p>Glee is a ticketing and event discovery platform. You agree to use it only for lawful purposes and in accordance with these terms. You must not:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Attempt to gain unauthorised access to any part of the platform</li>
              <li>Use automated tools to scrape or extract data</li>
              <li>Impersonate another person or entity</li>
              <li>Resell tickets in violation of event terms</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-white">3. Accounts</h2>
            <p>You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. Notify us immediately of any unauthorised use.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-white">4. Ticket Purchases</h2>
            <p>All ticket sales are final unless the event is cancelled by the organiser. Tickets are non-transferable unless explicitly permitted by the event organiser. Glee acts as an intermediary between you and the event organiser; the organiser is solely responsible for the event.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-white">5. Wallet</h2>
            <p>Funds added to your Glee wallet are held for use within the platform. Wallet balances are non-refundable except where required by law. Glee reserves the right to suspend wallets suspected of fraudulent activity.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-white">6. Intellectual Property</h2>
            <p>All content on Glee — including logos, design, and code — is owned by or licensed to Glee. You may not reproduce or distribute it without written permission.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-white">7. Limitation of Liability</h2>
            <p>To the fullest extent permitted by law, Glee is not liable for any indirect, incidental, or consequential damages arising from your use of the platform or attendance at events booked through it.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-white">8. Modifications</h2>
            <p>We may update these terms at any time. Continued use of the platform after updates constitutes acceptance of the revised terms.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-white">9. Contact</h2>
            <p>Questions? Email <a href="mailto:support@dmhub.cloud" className="text-neon-pink hover:underline">support@dmhub.cloud</a>.</p>
          </section>
        </div>

        <div className="mt-12 flex flex-wrap gap-4 border-t border-white/10 pt-8 text-sm text-white/40">
          <Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link>
          <Link to="/refund-policy" className="hover:text-white transition-colors">Refund Policy</Link>
        </div>
      </div>
    </div>
  )
}

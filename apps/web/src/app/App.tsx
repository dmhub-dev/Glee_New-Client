import { Routes, Route } from 'react-router-dom'
import { Toaster } from '@glee/ui'
import LandingPage from '../routes/index'
import EventDetailPage from '../routes/events/$eventId'
import CheckoutPage from '../routes/checkout/index'

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/events/:eventId" element={<EventDetailPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
      </Routes>
      <Toaster />
    </>
  )
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { configureEventFetchers } from '@glee/api'
import { getMockEvents, getMockEvent } from './lib/mock/events'
import '@glee/ui/globals.css'
import App from './app/App'

configureEventFetchers(getMockEvents, getMockEvent)

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)

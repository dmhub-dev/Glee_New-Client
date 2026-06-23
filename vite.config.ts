import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) return 'react-vendor'
          if (id.includes('/recharts/') || id.includes('/d3-')) return 'charts-vendor'
          if (id.includes('/@radix-ui/')) return 'radix-vendor'
          if (id.includes('/@tanstack/')) return 'query-vendor'
          if (id.includes('/lucide-react/')) return 'icons-vendor'
          if (id.includes('/react-hook-form/') || id.includes('/@hookform/') || id.includes('/zod/')) return 'forms-vendor'
          if (id.includes('/date-fns/') || id.includes('/react-day-picker/')) return 'date-vendor'
          if (id.includes('/embla-carousel')) return 'carousel-vendor'
          if (id.includes('/socket.io-client/') || id.includes('/engine.io-client/')) return 'socket-vendor'
          if (id.includes('/react-paystack/')) return 'payments-vendor'
          return undefined
        },
      },
    },
  },
  resolve: {
    alias: {
      '@glee/types': resolve(__dirname, 'src/types/index.ts'),
      '@glee/api': resolve(__dirname, 'src/api/index.ts'),
      '@glee/ui/globals.css': resolve(__dirname, 'src/ui/globals.css'),
      '@glee/ui': resolve(__dirname, 'src/ui/index.ts'),
      '@glee/utils': resolve(__dirname, 'src/utils/index.ts'),
    },
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 3000,
  },
})

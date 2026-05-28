import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@glee/types': resolve(__dirname, '../../packages/types/src'),
      '@glee/api': resolve(__dirname, '../../packages/api/src'),
      '@glee/ui': resolve(__dirname, '../../packages/ui/src'),
      '@glee/utils': resolve(__dirname, '../../packages/utils/src'),
    },
    dedupe: [
      'react',
      'react-dom',
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-avatar',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-label',
      '@radix-ui/react-popover',
      '@radix-ui/react-progress',
      '@radix-ui/react-radio-group',
      '@radix-ui/react-scroll-area',
      '@radix-ui/react-select',
      '@radix-ui/react-separator',
      '@radix-ui/react-slot',
      '@radix-ui/react-switch',
      '@radix-ui/react-tabs',
      '@radix-ui/react-toast',
    ],
  },
  server: {
    port: 3002,
    proxy: {
      '/api': {
        target: 'http://localhost:8003',
        changeOrigin: true,
        secure: false,
      },
    },
    fs: {
      allow: ['../..'],
    },
  },
  css: {
    postcss: './postcss.config.js',
  },
})

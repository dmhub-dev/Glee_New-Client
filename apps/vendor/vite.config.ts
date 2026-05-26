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
  },
  server: {
    port: 3001,
  },
  css: {
    postcss: './postcss.config.js',
  },
})

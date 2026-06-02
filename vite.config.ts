import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@glee/types': resolve(__dirname, 'src/types'),
      '@glee/api': resolve(__dirname, 'src/api'),
      '@glee/ui/globals.css': resolve(__dirname, 'src/ui/globals.css'),
      '@glee/ui': resolve(__dirname, 'src/ui'),
      '@glee/utils': resolve(__dirname, 'src/utils'),
    },
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 3000,
  },
})

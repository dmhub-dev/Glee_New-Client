import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
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

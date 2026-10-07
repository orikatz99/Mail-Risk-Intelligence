/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  optimizeDeps: {
    include: ['reactflow'],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tests/**/*.test.tsx', 'tests/**/*.test.ts'],
    passWithNoTests: true,
  },
})

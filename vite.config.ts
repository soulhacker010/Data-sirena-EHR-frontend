import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
// Test config lives in vitest.config.ts so the production build (Vercel,
// Render, etc.) doesn't trip on the `test` property when vitest types are
// stripped out of the build environment.
export default defineConfig({
  plugins: [react(), tailwindcss()],
})

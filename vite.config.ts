import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Served from a GitHub Pages project page at /TheCharlatan/, so asset URLs
  // need the prefix. Overridable so `vite dev` and other hosts still work.
  base: process.env.BASE_PATH ?? '/TheCharlatan/',
})

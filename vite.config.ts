import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: process.env.NODE_ENV === 'production' ? '/tgdashboard/' : '/',
  server: {
    port: 5000,
    strictPort: false, // If 5000 is taken, will try 5001, 5002, etc.
  },
})

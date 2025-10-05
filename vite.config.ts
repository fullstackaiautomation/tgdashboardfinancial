import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: process.env.NODE_ENV === 'production' ? '/tgdashboard/' : '/',
  server: {
    port: 4000,
    strictPort: false, // If 4000 is taken, will try 4001, 4002, etc.
  },
})

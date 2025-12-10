import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Ensuring process.env is available for API_KEY usage in this specific code structure
    'process.env': process.env
  }
})
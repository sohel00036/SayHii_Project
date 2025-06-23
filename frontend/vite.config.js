import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
    server: {
    port: 5174, // or any other port you prefer
    strictPort: true // will throw an error if the port is already in use
  }
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Esto obliga a Vite a usar la variable de Render, y si no existe en el entorno, usa la de producción directamente
    'import.meta.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL || 'https://obd2-backend.onrender.com/api')
  }
})

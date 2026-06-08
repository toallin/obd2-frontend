import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/" // Asegura que las rutas y assets se resuelvan desde la raíz para evitar errores 404 al recargar
})
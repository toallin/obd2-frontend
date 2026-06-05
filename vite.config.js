import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "./" // Esto asegura que Render encuentre la carpeta assets sin importar la ruta
})
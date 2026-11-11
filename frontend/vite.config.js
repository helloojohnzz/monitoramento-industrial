import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Caminho relativo para funcionar no GitHub Pages
  base: './',
})

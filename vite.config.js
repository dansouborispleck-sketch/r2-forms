import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Site servi sur dansouborispleck-sketch.github.io/r2-forms/ (page de projet, pas de
// domaine personnalise) -> les assets doivent etre resolus sous ce sous-chemin.
export default defineConfig({
  base: '/r2-forms/',
  plugins: [react()],
})

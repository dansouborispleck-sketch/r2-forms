import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Site servi depuis un domaine personnalise (transqi.com) a la racine -> les assets
// doivent etre resolus depuis "/", pas depuis un sous-chemin de page de projet GitHub.
export default defineConfig({
  base: '/',
  plugins: [react()],
})

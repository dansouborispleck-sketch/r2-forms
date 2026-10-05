import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Site servi depuis un domaine personnalise (transqi.com) a la racine -> les assets
// doivent etre resolus depuis "/", pas depuis un sous-chemin de page de projet GitHub.
// Mode "demo" (npm run build:demo) : apercu autonome a serveur simule, chemins relatifs.
export default defineConfig(({ mode }) => ({
  base: mode === 'demo' ? './' : '/',
  plugins: [react()],
  build: mode === 'demo' ? { outDir: 'dist-demo', assetsInlineLimit: 100000 } : {},
}))

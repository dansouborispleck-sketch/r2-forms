import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { LangProvider } from './lib/LangContext';
import App from './App.jsx';
import './index.css';

// En demo, le serveur est simule dans le navigateur (voir lib/demo.js) — module absent du
// vrai site (IS_DEMO est remplace a la compilation, la branche est supprimee).
if (import.meta.env.VITE_DEMO === 'true') await import('./lib/demo.js').then((m) => m.installDemo());

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LangProvider>
      <App />
    </LangProvider>
  </StrictMode>
);

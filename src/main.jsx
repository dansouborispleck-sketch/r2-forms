import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { LangProvider } from './lib/LangContext';
import App from './App.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LangProvider>
      <App />
    </LangProvider>
  </StrictMode>
);

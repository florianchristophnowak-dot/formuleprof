import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { AppProvider } from './state/AppContext';
import './styles/index.css';

const container = document.getElementById('root');
if (!container) throw new Error('Der Wurzelknoten #root fehlt im Dokument.');

createRoot(container).render(
  <StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </StrictMode>,
);

// Service Worker nur im Produktionsbuild registrieren – ermöglicht die
// Offline-Nutzung und die Installation als PWA.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Relativ zum Dokument, damit die App auch aus einem Unterordner funktioniert.
    navigator.serviceWorker.register(new URL('sw.js', document.baseURI).href).catch(() => {
      // Ohne Service Worker funktioniert die App weiterhin, nur ohne Offline-Cache.
    });
  });
}

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const root = document.getElementById('root');
if (!root) throw new Error('No se encontró el elemento #root en el DOM.');

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

if ('serviceWorker' in navigator) {
  if (import.meta.env.DEV) {
    // Elimina cualquier SW legacy (ej. "vinamed-shell-v2") y limpia sus caches.
    // No registra un SW nuevo para no interferir con el HMR de Vite.
    navigator.serviceWorker.getRegistrations().then(async (registrations) => {
      for (const reg of registrations) {
        await reg.unregister();
      }
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map((key) => caches.delete(key)));
    });
  } else {
    // En producción: registrar el SW del PWA eco-mobile.
    navigator.serviceWorker
      .register('/sw.js')
      .catch((err) => console.warn('[SW] No registrado:', err));
  }
}

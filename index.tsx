import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { AuthProvider } from './context/AuthContext';

registerSW({
  immediate: true,
  onOfflineReady() {
    console.log('QuizQuest lista para funcionar sin conexion.');
  },
  onNeedRefresh() {
    console.log('Nueva version disponible. Recarga para actualizar.');
  },
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);

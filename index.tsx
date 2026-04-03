import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// DEV helper: expose supabase + stores on window for one-time admin fixes
// Remove after use
if (import.meta.env.DEV) {
  import('./services/supabaseService').then(m => { (window as any)._sb = m.supabase });
  import('./stores/characterStore').then(m => { (window as any)._chars = m.useCharacterStore });
  import('./stores/galleryStore').then(m => { (window as any)._gallery = m.useGalleryStore });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
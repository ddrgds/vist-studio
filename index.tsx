import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// DEV helper: expose supabase + stores on window for admin fixes
// Run _dedupGallery() in console to clean duplicates
if (import.meta.env.DEV) {
  import('./services/supabaseService').then(m => { (window as any)._sb = m.supabase });
  import('./stores/characterStore').then(m => { (window as any)._chars = m.useCharacterStore });
  import('./stores/galleryStore').then(m => { (window as any)._gallery = m.useGalleryStore });
  (window as any)._dedupGallery = async () => {
    const sb = (window as any)._sb;
    if (!sb) { console.error('_sb not ready'); return; }
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { console.error('Not logged in'); return; }
    const { data, error } = await sb.from('gallery_items').select('id, url').eq('user_id', user.id);
    if (error) { console.error(error); return; }
    const seen = new Map<string, string>();
    const dupes: string[] = [];
    for (const row of data) {
      if (seen.has(row.url)) dupes.push(row.id);
      else seen.set(row.url, row.id);
    }
    if (dupes.length === 0) { console.log('No duplicates found'); return; }
    console.log(`Found ${dupes.length} duplicates. Removing...`);
    for (let i = 0; i < dupes.length; i += 50) {
      const batch = dupes.slice(i, i + 50);
      await sb.from('gallery_items').delete().in('id', batch);
    }
    console.log(`Removed ${dupes.length} duplicates. Reload the page.`);
  };
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
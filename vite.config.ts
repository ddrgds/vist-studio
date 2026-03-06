import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          // Proxy Replicate API calls to avoid CORS in dev.
          // The token is injected server-side here so the browser never
          // sends an Authorization header (which triggers CORS preflight failures).
          '/replicate-api': {
            target: 'https://api.replicate.com',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/replicate-api/, ''),
            secure: true,
            configure: (proxy) => {
              proxy.on('proxyReq', (proxyReq) => {
                proxyReq.setHeader(
                  'Authorization',
                  `Token ${env.REPLICATE_API_TOKEN}`
                );
              });
            },
          },
          '/ideogram-api': {
            target: 'https://api.ideogram.ai',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/ideogram-api/, ''),
            secure: true,
            configure: (proxy) => {
              proxy.on('proxyReq', (proxyReq) => {
                proxyReq.setHeader('Api-Key', env.IDEOGRAM_API_KEY);
                proxyReq.removeHeader('origin');
              });
            },
          },
          // Proxy para URLs efímeras de imágenes de Ideogram
          // (ideogram.ai/api/images/ephemeral/...) que no tienen CORS correcto
          '/ideogram-ephemeral': {
            target: 'https://ideogram.ai',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/ideogram-ephemeral/, ''),
            secure: true,
          },
          '/openai-api': {
            target: 'https://api.openai.com',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/openai-api/, ''),
            secure: true,
            configure: (proxy) => {
              proxy.on('proxyReq', (proxyReq) => {
                proxyReq.setHeader('Authorization', `Bearer ${env.OPENAI_API_KEY}`);
                proxyReq.removeHeader('origin');
              });
            },
          },
        },
      },
      plugins: [react()],
      define: {
        // Direct client-side APIs (key needed in bundle)
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.FAL_KEY': JSON.stringify(env.FAL_KEY),
        'process.env.MODELSLAB_API_KEY': JSON.stringify(env.MODELSLAB_API_KEY),
        // Proxied APIs — keys injected server-side via Cloudflare Functions (prod)
        // or Vite dev proxy (dev). Keys must NOT be baked into the client bundle.
        // Supabase public anon key — safe to expose
        'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
        'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});

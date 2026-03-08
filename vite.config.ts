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
          // Proxy for ephemeral Ideogram image URLs
          // (ideogram.ai/api/images/ephemeral/...) that don't have correct CORS
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
          '/gemini-api': {
            target: 'https://generativelanguage.googleapis.com',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/gemini-api/, ''),
            secure: true,
            configure: (proxy) => {
              proxy.on('proxyReq', (proxyReq, req) => {
                // Append key= query param to the target URL
                const url = new URL(proxyReq.path, 'https://generativelanguage.googleapis.com');
                url.searchParams.set('key', env.GEMINI_API_KEY);
                proxyReq.path = url.pathname + url.search;
              });
            },
          },
          '/fal-api': {
            target: 'https://queue.fal.run',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/fal-api/, ''),
            secure: true,
            configure: (proxy) => {
              proxy.on('proxyReq', (proxyReq) => {
                proxyReq.setHeader('Authorization', `Key ${env.FAL_KEY}`);
                proxyReq.removeHeader('origin');
              });
            },
          },
          '/modelslab-api': {
            target: 'https://modelslab.com/api',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/modelslab-api/, ''),
            secure: true,
          },
        },
      },
      plugins: [react()],
      define: {
        // API keys are now proxied server-side — never baked into the client bundle.
        // Supabase public anon key — safe to expose
        'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
        'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY),
      },
      build: {
        rollupOptions: {
          output: {
            manualChunks: {
              'vendor-supabase': ['@supabase/supabase-js'],
              'vendor-fal': ['@fal-ai/client'],
              'vendor-react': ['react', 'react-dom'],
            },
          },
        },
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});

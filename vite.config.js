import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';


// Load environment variables for server-side API usage
dotenv.config();

// Helper to read JSON body from Node request
async function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        const json = body ? JSON.parse(body) : {};
        resolve(json);
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

// Plugin to serve admin-dashboard.html at /admin route and provide API middleware
const adminRoutePlugin = () => {

  return {
    name: 'admin-route',
    configureServer(server) {
      // Admin dashboard HTML
      server.middlewares.use('/admin', (req, res, next) => {
        const adminHtmlPath = path.resolve(__dirname, 'admin-dashboard.html');
        
        if (fs.existsSync(adminHtmlPath)) {
          const html = fs.readFileSync(adminHtmlPath, 'utf-8');
          res.setHeader('Content-Type', 'text/html');
          res.end(html);
        } else {
          res.statusCode = 404;
          res.end('Admin dashboard not found');
        }
      });

      // API: Ensure bucket using service role key to bypass RLS
      server.middlewares.use('/api/storage/ensure-bucket', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: false, error: 'Method Not Allowed' }));
          return;
        }

        try {
          const { bucketName } = await readJsonBody(req);
          if (!bucketName || typeof bucketName !== 'string') {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: false, error: 'bucketName is required' }));
            return;
          }

          const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
          const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

          if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: false, error: 'Server missing Supabase URL or SERVICE_ROLE key' }));
            return;
          }

          // Lazy-load Supabase client to avoid running on server startup
          const { createClient } = await import('@supabase/supabase-js');
          const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
            auth: { autoRefreshToken: false, persistSession: false },
          });

          // List buckets and create/update as needed
          const { data: buckets, error: listErr } = await adminClient.storage.listBuckets();
          if (listErr) throw listErr;

          const existing = (buckets || []).find((b) => b.name === bucketName);
          const desiredAllowed = [
            'image/*',
            'image/svg+xml',
            'video/*',
            'audio/*',
            'application/pdf',
            'text/*',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          ];
          if (!existing) {
            const { error: createErr } = await adminClient.storage.createBucket(bucketName, {
              public: true,
              allowedMimeTypes: desiredAllowed,
              fileSizeLimit: 50 * 1024 * 1024, // 50MB
            });
            if (createErr) throw createErr;
          } else {
            const allowed = existing.allowed_mime_types || [];
            const missing = desiredAllowed.filter((t) => !allowed.includes(t));
            if (missing.length > 0) {
              const { error: updateErr } = await adminClient.storage.updateBucket(bucketName, {
                allowedMimeTypes: Array.from(new Set([...allowed, ...missing])),
              });
              if (updateErr) throw updateErr;
            }
          }

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: true }));
        } catch (e) {
          console.error('ensure-bucket API error:', e);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: false, error: e.message || 'Unknown error' }));
        }
      });
    }
  };
};

// Custom plugin to serve admin routes to index.html during dev
function adminRouteRedirectPlugin() {
  return {
    name: 'admin-route-redirect-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // Only redirect /admin and /admin/ to React app, not static HTML files
        if (req.url === '/admin' || req.url === '/admin/') {
          req.url = '/index.html';
        }
        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), adminRoutePlugin(), adminRouteRedirectPlugin()],
  base: '/',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          admin: path.resolve(__dirname, 'admin-dashboard.html'),
          adminLogin: path.resolve(__dirname, 'admin-login.html'),
          diagnose: path.resolve(__dirname, 'diagnose-fetch-errors.html'),
          testSupabase: path.resolve(__dirname, 'test-supabase-connection.html'),
        },
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'scheduler'],
            'radix-ui': [
                '@radix-ui/react-dialog',
                '@radix-ui/react-dropdown-menu',
                '@radix-ui/react-tabs',
                '@radix-ui/react-toast',
                '@radix-ui/react-icons',
                '@radix-ui/react-select',
                '@radix-ui/react-switch',
                '@radix-ui/react-slider'
              ],
            'framer-motion': ['framer-motion'],
            'styling': ['tailwindcss', 'clsx', 'tailwind-merge'],
            'ai-google': ['@google/generative-ai']
          }
        }
      }
  },
  server: {
    port: 3002,
    strictPort: false,
    host: true,
    // Removed hardcoded HMR host/port to let Vite infer correct websocket settings
    cors: {
      origin: ['http://localhost:3002', 'http://127.0.0.1:3002', 'file://', 'app://'],
      credentials: true
    },
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    },
    fs: {
      strict: false, // Allow serving files outside of root
      allow: ['..'] // Allow access to parent directories
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/renderer'),
      '@components': path.resolve(__dirname, './src/renderer/components'),
      '@pages': path.resolve(__dirname, './src/renderer/pages'),
      '@services': path.resolve(__dirname, './src/renderer/services'),
      '@utils': path.resolve(__dirname, './src/renderer/utils'),
      '@stores': path.resolve(__dirname, './src/renderer/stores'),
      '@assets': path.resolve(__dirname, './assets')
    }
  },
  define: {
    __IS_DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
    global: 'globalThis',
    'process.env': {
      NODE_ENV: JSON.stringify(process.env.NODE_ENV)
    },
    'process.stdout': JSON.stringify({ isTTY: false }),
    'process.stderr': JSON.stringify({ isTTY: false })
  },
  optimizeDeps: {
    include: ['googleapis', 'google-auth-library', 'react', 'react-dom', 'framer-motion'],
    exclude: []
  }
});
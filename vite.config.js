import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

// Plugin to serve admin-dashboard.html at /admin route
const adminRoutePlugin = () => {
  return {
    name: 'admin-route',
    configureServer(server) {
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
    },
    generateBundle() {
      // Copy admin and diagnostic HTML files to dist folder during build
      const adminFiles = ['admin-dashboard.html', 'admin-login.html', 'diagnose-fetch-errors.html', 'test-supabase-connection.html'];
      
      adminFiles.forEach(file => {
        const filePath = path.resolve(__dirname, file);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8');
          this.emitFile({
            type: 'asset',
            fileName: file,
            source: content
          });
        }
      });
    }
  };
};

export default defineConfig({
  plugins: [react(), adminRoutePlugin()],
  base: '/',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Core React libraries
          if (id.includes('react') || id.includes('react-dom')) {
            return 'react-vendor';
          }
          
          // AI/ML libraries - these are typically large
          if (id.includes('@google/generative-ai') || id.includes('@google/genai')) {
            return 'ai-google';
          }
          
          if (id.includes('@huggingface/transformers')) {
            return 'ai-huggingface';
          }
          

          
          // UI component libraries
          if (id.includes('@radix-ui')) {
            return 'radix-ui';
          }
          
          if (id.includes('framer-motion')) {
            return 'framer-motion';
          }
          
          if (id.includes('lucide-react')) {
            return 'lucide-icons';
          }
          
          // Router
          if (id.includes('react-router-dom')) {
            return 'router';
          }
          
          // Tailwind and styling
          if (id.includes('tailwind') || id.includes('clsx') || id.includes('class-variance-authority')) {
            return 'styling';
          }
          
          // Other vendor libraries
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
      }
    }
  },
  server: {
    port: 3002,
    strictPort: true,
    host: '127.0.0.1',
    hmr: {
      host: 'localhost',
      port: 3002
    },
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
    include: ['googleapis', 'google-auth-library']
  }
});
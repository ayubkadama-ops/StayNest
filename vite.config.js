import { defineConfig } from 'vite';
import { cpSync, mkdirSync } from 'node:fs';
import path from 'node:path';

export default defineConfig({
  plugins: [{
    name: 'copy-sequence-assets',
    closeBundle() {
      const target = path.resolve(process.cwd(), 'dist', 'assets');
      mkdirSync(target, { recursive: true });
      cpSync(path.resolve(process.cwd(), 'assets'), target, { recursive: true });
    }
  }],
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(process.cwd(), 'index.html'),
        admin: path.resolve(process.cwd(), 'admin.html'),
        listings: path.resolve(process.cwd(), 'listings.html'),
        listingDetail: path.resolve(process.cwd(), 'listing-detail.html')
      }
    }
  },
  server: {
    host: true,
    proxy: {
      '/api': {
        target: process.env.API_PROXY_TARGET || 'http://127.0.0.1:3000',
        changeOrigin: true
      },
      '/admin': {
        target: process.env.API_PROXY_TARGET || 'http://127.0.0.1:3000',
        changeOrigin: true
      },
      '/media': {
        target: process.env.API_PROXY_TARGET || 'http://127.0.0.1:3000',
        changeOrigin: true
      }
    }
  }
});

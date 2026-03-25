import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  base: '/hit-the-answer/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon-192.svg', 'icon-512.svg'],
      manifest: {
        name: 'Hit the Answer',
        short_name: 'HitAnswer',
        description: 'Shoot the right number! A math space shooter game.',
        theme_color: '#06080F',
        background_color: '#06080F',
        display: 'fullscreen',
        orientation: 'portrait',
        start_url: '/hit-the-answer/',
        icons: [
          {
            src: 'icon-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: 'icon-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@hit-the-answer/common': path.resolve(__dirname, '../common/src/index.ts'),
    },
  },
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@hit-the-answer/common': path.resolve(__dirname, '../common/src/index.ts'),
    },
  },
});

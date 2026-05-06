import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/stormwater-sp-calculator/',
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});

import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          babylon: [
            '@babylonjs/core',
            '@babylonjs/gui',
            '@babylonjs/inspector',
            '@babylonjs/loaders',
          ],
          network: ['socket.io-client'],
        },
      },
    },
    chunkSizeWarningLimit: 13000,
  },
});

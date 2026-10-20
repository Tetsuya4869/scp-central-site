import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { serviceWorkerBuildRevision } from './scripts/build-service-worker.mjs'

export default defineConfig({
  plugins: [react(), serviceWorkerBuildRevision()],
  base: '/scp-central-site/',
  build: {
    // The service worker consumes this manifest during installation so every
    // hashed entry, dynamic chunk, stylesheet and emitted asset is available
    // on the very first offline launch.
    manifest: 'asset-manifest.json',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
        },
      },
    },
  },
})

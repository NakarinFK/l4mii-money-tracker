import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor dependencies
          vendor: ['react', 'react-dom'],
          // Split UI library
          ui: ['@dnd-kit/core', '@dnd-kit/sortable'],
          // Split database
          database: ['sql.js'],
        },
      },
    },
    // Optimize chunks
    chunkSizeWarningLimit: 1000,
    // Enable source maps in development
    sourcemap: process.env.NODE_ENV === 'development',
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
})

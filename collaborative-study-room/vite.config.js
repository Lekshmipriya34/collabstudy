import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    // Suppresses the arbitrary 500kb warning
    chunkSizeWarningLimit: 1500, 
    rollupOptions: {
      output: {
        manualChunks(id) {
          // ONLY split Firebase. Leave React alone!
          if (id.includes('node_modules') && id.includes('firebase')) {
            return 'firebase';
          }
        }
      }
    }
  }
})
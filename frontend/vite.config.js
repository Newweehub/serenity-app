import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://serenity-backend-c4cxeedyfahpfpac.southeastasia-01.azurewebsites.net', //'http://localhost:3001'
        changeOrigin: true,
      },
    },
  },
});
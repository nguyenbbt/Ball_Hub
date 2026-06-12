import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path'; // Cần import path để xử lý đường dẫn

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Cấu hình @ trỏ thẳng vào thư mục src
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
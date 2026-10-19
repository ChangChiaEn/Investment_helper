import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'next/link': path.resolve(__dirname, './src/compat/link.tsx'),
      'next/navigation': path.resolve(__dirname, './src/compat/navigation.ts'),
      'next/image': path.resolve(__dirname, './src/compat/image.tsx'),
      'next/dynamic': path.resolve(__dirname, './src/compat/dynamic.tsx'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
})

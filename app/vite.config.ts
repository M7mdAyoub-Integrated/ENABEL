import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // 5173, and only 5173. The evidence store's CORS rule names the dev
    // server by origin, and Vite's default is to take the next free port
    // without a word when 5173 is busy -- which is how a second dev server
    // came up on 5174 on 15 September 2026 and every upload from it was
    // refused by the bucket. strictPort makes that a refusal to start
    // instead. A second server is a second origin; run one.
    port: 5173,
    strictPort: true,
  },
})

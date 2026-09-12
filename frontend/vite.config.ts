import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: '0.0.0.0',     // Mengizinkan Vite menerima koneksi dari IP publik VPS
    port: 5173,          // Menentukan port (opsional, default 5173)
    allowedHosts: true   // Mengizinkan semua host/IP untuk mengakses (atau isi dengan IP publik VPS Anda)
  },
});

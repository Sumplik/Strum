# Strum Frontend

Dashboard monitoring mesin untuk **Strum** (React 19 + Vite 7 + TypeScript, TanStack Query, shadcn/radix-ui, Tailwind 4). Mengambil data dari `Strum-Backend` lewat REST API dan menyegarkannya setiap 5 detik.

## Menjalankan

```bash
npm install
cp .env.example .env      # isi VITE_API_BASE_URL, default http://127.0.0.1:3001
npm run dev               # http://localhost:5173
```

| Script | Fungsi |
|---|---|
| `npm run dev` | Dev server Vite dengan HMR |
| `npm run build` | Type-check (`tsc -b`) lalu build produksi ke `dist/` |
| `npm run preview` | Menyajikan hasil build |
| `npm run lint` | ESLint (`eslint.config.js`) |

## Environment

| Variabel | Keterangan |
|---|---|
| `VITE_API_BASE_URL` | URL backend, misal `http://127.0.0.1:3001` |
| `VITE_SOCKET_URL` | Opsional. Jika diisi, klien Socket.IO aktif untuk update realtime; jika kosong dashboard memakai polling |

## Struktur

```
src/
 ├─ app/              ThemeProvider, useTheme, Providers (react-query, tooltip, toaster), navigation
 ├─ components/
 │   ├─ layout/       AppShell (sidebar, topbar, KPI bar)
 │   ├─ ui/           komponen shadcn/radix
 │   └─ Logo/         aset logo
 ├─ features/
 │   ├─ auth/         halaman login
 │   └─ dashboard/    halaman Overview, Monitoring Mesin, Summary Harian, Trend, Pengaturan
 │       ├─ components/   KPI cards, tabel mesin, dialog detail, peta lokasi
 │       ├─ hooks/        useDevices (polling + seam untuk update realtime)
 │       ├─ utils/        status efektif mesin, kalkulasi KPI
 │       └─ config/       posisi slot mesin di denah
 ├─ lib/              api (klien REST), http (fetch wrapper), socket, utils/format
 └─ types/            tipe respons API dan Device
```

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
 ├─ app/              ThemeProvider/useTheme, BranchProvider/useBranch (cakupan cabang terpilih),
 │                    session (cek login, auto-logout saat 401), navigation (definisi rute), Providers
 ├─ assets/images/    denah per cabang: `denah UP2W <n>.svg`
 ├─ components/
 │   ├─ layout/       AppShell (sidebar, topbar + dropdown cabang, KPI bar)
 │   ├─ ui/           komponen shadcn/radix
 │   └─ Logo/         aset logo
 ├─ features/
 │   ├─ auth/         halaman login
 │   └─ dashboard/    halaman Overview, Monitoring Mesin, Summary Harian, Trend, Pengaturan
 │       ├─ components/   KPI (DashboardKpis, KpiCards), tabel & badge mesin, dialog detail, peta lokasi,
 │       │                BranchSelect/ScopeSelect (dropdown cabang), ExportCsvButton
 │       ├─ hooks/        useDevices (daftar mesin, polling), useSummary (uptime/availability per cakupan)
 │       ├─ utils/        deviceStatus (label status, kalkulasi KPI), summary (format jam, warna availability)
 │       └─ config/       branchMaps (denah + ruangan per cabang), mapRoomGrid (posisi slot)
 ├─ lib/              api (klien REST + export CSV), http (fetch wrapper), query (pesan error), socket, utils
 └─ types/            tipe respons API dan Device
```

## Pemilihan cabang

Dropdown lokasi di pojok kanan atas topbar berlaku untuk isi halaman **dan** KPI bar di atasnya:

- **Monitoring Mesin, Summary Harian, Trend**: satu cabang atau **Semua cabang** (memakai endpoint lintas cabang `GET /api/devices`, `/api/summary`, `/api/exports/...`).
- **Overview, Pengaturan**: selalu satu cabang (denah dan jam operasional memang per cabang); saat pilihan terakhir "Semua cabang", halaman ini memakai cabang konkret yang terakhir dipilih.

Pilihan tersimpan di `localStorage` dan divalidasi terhadap daftar cabang dari `GET /api/branches`.

## Denah cabang

Gambar denah tiap cabang ada di `src/assets/images/denah UP2W <n>.svg` dan didaftarkan di
`features/dashboard/config/branchMaps.ts` bersama posisi ruangannya (`mapRoomGrid.ts`, dalam % lebar/tinggi
gambar). Saat ini keenam cabang memakai gambar yang sama; bila satu cabang diganti gambar berbeda, buat
konfigurasi ruangan baru untuk cabang itu.

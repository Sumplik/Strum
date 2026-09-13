# ⚡ Strum-Backend (IoT Telemetry Server, multi-cabang)

Backend untuk memproses dan menyimpan telemetri mesin dari **6 kantor cabang** (UP2W1 … UP2W6, semuanya setara). Dibangun dengan **Bun**, **ElysiaJS**, **Prisma ORM** (PostgreSQL), dan **MQTT**.

- Cabang dikenali dari topic MQTT `mesin/telemetry/<ID_CABANG>` (ID di-uppercase, spasi diabaikan); perangkat lama yang masih publish ke `mesin/telemetry` atau `mesin/telemetry/<ID_MESIN>` tetap diterima dan otomatis masuk cabang **UP2W6**.
- Data yang masuk divalidasi dan dinormalisasi sebelum disimpan (tidak ada JSON mentah di database).
- REST API terpisah per cabang, siap dipakai frontend mana pun; export log per mesin atau per cabang ke **Excel (.xlsx)** atau **CSV**.

---

## 📋 Persyaratan

1. **[Bun](https://bun.sh/)** v1.1+
2. **PostgreSQL** 13+ (untuk `gen_random_uuid()`; versi lebih lama butuh extension `pgcrypto`)
3. **MQTT Broker** (misal Eclipse Mosquitto)

## 🚀 Quick Start

```bash
bun install
cp .env.example .env        # isi DATABASE_URL, JWT_SECRET, MQTT_*
bun run db:generate         # generate Prisma Client
bun run db:migrate          # jalankan migrasi (termasuk upgrade multi-cabang)
bun run db:seed             # buat 6 cabang + user admin
bun run dev                 # http://localhost:3001
```

> **Upgrade dari versi 1 cabang**: migrasi `20260912100000_multi_branch` mempertahankan data lama. Semua mesin/log yang sudah ada dipindahkan ke cabang **UP2W6** — cabang yang sama dengan tujuan topic lama (`LEGACY_BRANCH_ID`), sehingga riwayat mesin lama tersambung dengan data barunya. Jika kantor lama adalah cabang lain, ubah nilai `legacyBranchId` di bagian atas `prisma/migrations/20260912100000_multi_branch/migration.sql` **dan** `LEGACY_BRANCH_ID` di `.env` **sebelum** `db:migrate`. Jam operasional global lama disalin ke setiap cabang.

### Script

| Script | Fungsi |
|---|---|
| `bun run dev` / `bun run start` | Server dengan / tanpa auto-reload |
| `bun test` | Unit test. Tambahkan `TEST_DATABASE_URL=postgresql://...` (database uji terpisah yang sudah dimigrasi) untuk ikut menjalankan integration test |
| `bun run typecheck` | `tsc --noEmit` |
| `bun run db:generate` / `db:migrate` / `db:seed` | Prisma generate / migrate dev / seed cabang + admin |
| `bun run mqtt:simulate [ID_CABANG]` | Kirim telemetri palsu ke broker (default UP2W1) |
| `bun run mqtt:watch` | Tampilkan payload mentah yang masuk ke `mesin/telemetry/#` |

### Environment

| Variabel | Keterangan |
|---|---|
| `DATABASE_URL` | Connection string PostgreSQL |
| `JWT_SECRET` | Secret cookie sesi — wajib saat `NODE_ENV=production` (server menolak start jika kosong) |
| `MQTT_BROKER_URL`, `MQTT_USERNAME`, `MQTT_PASSWORD` | Koneksi broker |
| `LEGACY_BRANCH_ID` | Cabang penampung perangkat yang masih memakai topic lama, default `UP2W6` (harus ada di tabel `Branch`) |
| `PORT` | Port HTTP, default `3001` |
| `TIMEZONE` | Zona untuk hari kalender, jam operasional, dan waktu di export. Default `Asia/Jakarta` |
| `COOKIE_SECURE` | `true` = cookie hanya lewat HTTPS. Default `true` di production; set `false` jika dashboard diakses via `http://IP:port` |
| `CORS_ORIGINS` | Daftar origin dipisah koma; default di `src/config.ts` |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD` | Kredensial yang dibuat `db:seed` (default `admin` / `admin123`) |

## 📂 Struktur

```
Strum-Backend/
 ├── prisma/                 schema, migrasi, seed (6 cabang + admin)
 ├── scripts/                mqtt-simulator.ts, mqtt-subscriber.ts
 ├── test/integration.test.ts  end-to-end terhadap PostgreSQL uji (TEST_DATABASE_URL)
 └── src/
      ├── index.ts           bootstrap: validasi env, cache cabang, HTTP, MQTT, graceful shutdown
      ├── app.ts             komposisi Elysia: error handler, CORS, routes
      ├── config.ts          env + konstanta
      ├── db.ts              Prisma Client + adapter pg
      ├── mqtt.ts            subscriber → antrean berbatas → ingestion (retry untuk error DB transien)
      ├── lib/               time (timezone-aware), errors, rateLimit
      ├── plugins/           jwt, auth (session + requireAuth)
      ├── routes/            health, auth, branches, devices, exports, shared (validasi umum)
      └── services/
           ├── telemetry.ts  normalisasi & validasi payload (pure, unit-tested)
           ├── ingestion.ts  simpan ke DB, dedup, counter statistik
           ├── branches.ts   CRUD cabang + cache ID cabang untuk ingestion
           ├── devices.ts    daftar/detail/log mesin
           ├── stats.ts      agregasi status per cabang (groupBy)
           ├── summary.ts    kalkulasi uptime/availability
           └── export/       csv (stream), xlsx (tanpa dependensi berat), reports
```

## 🗄️ Skema Database

```
Branch    id (UP2W1..), name, opsStart, opsEnd
Device    id (uuid), branchId → Branch, code, status (enum off|idle|on_duty), reportedStatus,
          lastSeen, location, ipAddress, firmwareVersion, threshold, arus, voltase, suhu, kelembapan
          UNIQUE (branchId, code)   INDEX (branchId, status)   INDEX (branchId, lastSeen)
DeviceLog id (uuid), deviceId → Device (cascade), branchId → Branch, timestamp, status, reportedStatus,
          threshold, arus, voltase, suhu, kelembapan, ipAddress
          UNIQUE (deviceId, timestamp)   INDEX (branchId, timestamp)
User      id, username (unique), password (argon2 via Bun.password)
```

Kode mesin unik **per cabang** (mesin `6CNC1` boleh ada di UP2W1 dan UP2W2). Log dengan `(deviceId, timestamp)` yang sama dianggap duplikat dan diabaikan.

## 📡 Integrasi IoT (MQTT)

Perangkat publish ke **`mesin/telemetry/<ID_CABANG>`** (contoh `mesin/telemetry/UP2W3`; huruf kecil tetap diterima dan di-uppercase). Contoh:

```bash
mosquitto_pub -h <broker> -p 1883 -u admin -P admin123 -t "mesin/telemetry/UP2W1" -m '{
  "device_id": "6CNC1",
  "location": "Ruang CNC",
  "version": "1.0",
  "threshold": 22,
  "data": {
    "arus": 25.4,
    "suhu": 38.2,
    "voltase": 220.1,
    "kelembapan": 70.5,
    "status_mesin": "ON"
  }
}'
```

Field opsional: `connection.ts` (unix detik/milidetik atau string waktu) dan `connection.ipaddress`.

### Penentuan cabang dari topic

Segmen pertama setelah `mesin/telemetry/` dinormalisasi (spasi dibuang, huruf besar), lalu:

| Topic | Hasil |
|---|---|
| `mesin/telemetry/UP2W1`, `mesin/telemetry/up2w 1`, `mesin/telemetry/UP2W1/apa-saja` | Cabang **UP2W1** (harus terdaftar) |
| `mesin/telemetry/UP2W9` (berbentuk cabang tapi belum terdaftar) | **Ditolak** — dianggap salah konfigurasi, tidak dicampur ke cabang lain |
| `mesin/telemetry/6CNC1` (format lama: ID mesin di topic) | Cabang **`LEGACY_BRANCH_ID`** (UP2W6); ID mesin diambil dari `device_id`, atau dari topic bila payload tidak punya `device_id` |
| `mesin/telemetry` (format lama tanpa tambahan) | Cabang **`LEGACY_BRANCH_ID`** (UP2W6) |

Jumlah pesan yang masuk lewat jalur lama tercatat di `/api/health` (`ingestion.legacyTopic`) dan setiap mesin lama dicatat sekali di log server, sehingga migrasi perangkat ke topic cabang bisa dipantau.

Aturan normalisasi (semua terjadi sebelum data masuk database):

| Hal | Aturan |
|---|---|
| Cabang | Dari topic (lihat tabel di atas). |
| `device_id` | Trim + uppercase; hanya huruf/angka/`.`/`_`/`-`, maks 50 karakter. |
| `status_mesin` | `off`/`0`/`false`/`mati` → **off**. Selain itu: `arus >= threshold` → **on_duty**, jika tidak → **idle**. Nilai asli disimpan di `reportedStatus`. |
| `threshold` | Angka ≥ 0. Jika tidak dikirim, memakai threshold terakhir mesin tersebut. |
| `arus`, `voltase`, `suhu`, `kelembapan` | Angka (string numerik dan koma desimal diterima). Nilai bukan angka / di luar rentang wajar → `null` + peringatan di log server. |
| `connection.ts` | Detik atau milidetik unix, ISO 8601, atau `YYYY-MM-DD HH:mm:ss` (dianggap zona `TIMEZONE`). Tidak ada / tidak valid / sebelum 2020 / >5 menit di masa depan → waktu server. |
| `location`, `version` | Trim, spasi ganda dirapikan, dipotong 100 / 20 karakter. |
| Pesan terlambat | Log tetap disimpan, tetapi status & `lastSeen` mesin tidak mundur. |
| Payload | Maks 16 KB, harus JSON objek dengan `device_id` dan `data`. |

Mesin dianggap **disconnect** jika tidak mengirim data selama > 6 menit (2 × interval 3 menit, `src/config.ts`).

## 🌐 REST API

Base URL `http://localhost:3001`. Semua respons JSON berbentuk `{ "success": true, "data": ... }` atau `{ "success": false, "message": "..." }` dengan status HTTP yang sesuai (400 validasi, 401 belum login, 404 tidak ada, 409 konflik, 413 export terlalu besar, 429 terlalu banyak percobaan login).

Semua endpoint kecuali `/api/health` dan `/api/auth/login` memerlukan cookie `auth_session` (HttpOnly) hasil login; kirim request dengan `credentials: "include"`.

### Publik & autentikasi

| Method | Endpoint | Keterangan |
|---|---|---|
| GET | `/api/health` | Status DB, koneksi MQTT, statistik ingestion (`received`, `stored`, `duplicates`, `rejected`, `rejectedByReason`) |
| POST | `/api/auth/login` | Body `{ "username", "password" }`. Maks 10 percobaan gagal / 15 menit per username+IP |
| POST | `/api/auth/logout` | Hapus cookie |
| GET | `/api/auth/me` | User yang sedang login |
| PUT | `/api/auth/password` | Body `{ "currentPassword", "newPassword" }` (min 8 karakter) |

### Cabang

| Method | Endpoint | Keterangan |
|---|---|---|
| GET | `/api/overview` | Semua cabang + statistik masing-masing + `totals` |
| GET | `/api/branches` | Daftar cabang (`id`, `name`, `operationalHours`, `deviceCount`) |
| POST | `/api/branches` | Body `{ "id": "UP2W7", "name"?, "operationalHours"? }` → 201 |
| GET | `/api/branches/:branchId` | Detail cabang + `stats` |
| PATCH | `/api/branches/:branchId` | Body `{ "name"?, "operationalHours"?: { "start": "08:00", "end": "17:00" } }` |
| DELETE | `/api/branches/:branchId` | Hanya jika cabang tidak punya mesin (409 jika masih ada) |
| GET | `/api/branches/:branchId/stats` | `{ total, online, disconnect, on, onDuty, idle, off, percentOnDuty, percentIdle, percentOff }` |

### Mesin

| Method | Endpoint | Keterangan |
|---|---|---|
| GET | `/api/devices?status=&search=` | Semua mesin di **semua cabang** (urut cabang lalu kode), filter sama seperti di bawah |
| GET | `/api/branches/:branchId/devices?status=&search=` | Daftar mesin satu cabang. `status`: `on_duty`/`idle`/`off`/`disconnect`; `search` cocok ke kode, lokasi, IP |
| GET | `/api/branches/:branchId/devices/:code` | Detail mesin (kode tidak peka huruf besar/kecil) |
| DELETE | `/api/branches/:branchId/devices/:code` | Hapus mesin beserta lognya (destruktif) |
| GET | `/api/branches/:branchId/devices/:code/logs?limit=200&before=&start=&end=` | Log terbaru lebih dulu, maks 1000/halaman; lanjutkan dengan `meta.nextBefore` |

Objek mesin:

```json
{
  "id": "uuid", "branchId": "UP2W1", "code": "6CNC1",
  "status": "on_duty", "effectiveStatus": "on_duty", "online": true, "reportedStatus": "on",
  "lastSeen": "2026-09-12T10:19:55.000Z", "location": "Ruang CNC", "ipAddress": null,
  "firmwareVersion": "1.0", "threshold": 22, "arus": 25.4, "voltase": 220.1, "suhu": 38.2, "kelembapan": 70.5,
  "createdAt": "...", "updatedAt": "..."
}
```

`effectiveStatus` sudah memperhitungkan disconnect (`online: false` → `"disconnect"`).

### Summary (uptime / availability)

| Method | Endpoint | Keterangan |
|---|---|---|
| GET | `/api/summary?start=YYYY-MM-DD&end=YYYY-MM-DD` | Semua mesin di **semua cabang** (jam operasional per cabang); respons punya `branches[]` + `devices[]` + `averageAvailabilityPercent` |
| GET | `/api/branches/:branchId/summary?start=YYYY-MM-DD&end=YYYY-MM-DD` | Semua mesin di cabang, maks 93 hari |
| GET | `/api/branches/:branchId/devices/:code/summary?start=&end=` | Satu mesin |

`start`/`end` adalah hari kalender **inklusif** dalam zona `TIMEZONE`. Respons:

```json
{
  "branchId": "UP2W1",
  "range": { "start": "2026-01-04T17:00:00.000Z", "end": "2026-01-05T16:59:59.999Z", "effectiveEnd": "..." },
  "operationalHours": { "start": "08:00", "end": "17:00" },
  "averageAvailabilityPercent": 66.67,
  "devices": [
    {
      "device": { "...objek mesin..." },
      "summary": {
        "onDutyHours": 5.25, "idleHours": 1.5, "onTotalHours": 6.75, "offHours": 0.5, "disconnectHours": 1.25,
        "operationalOnHours": 6, "operationalIdleHours": 1, "operationalOffHours": 0.5, "operationalDisconnectHours": 1,
        "totalOperationalHours": 9, "availabilityPercent": 66.67
      }
    }
  ]
}
```

`availabilityPercent = operationalOnHours / totalOperationalHours × 100`, di mana `operational*` hanya menghitung waktu di dalam jam operasional cabang dan `totalOperationalHours` adalah jam operasional yang sudah berjalan dalam rentang (hari ini dihitung sampai sekarang, bukan sampai jam tutup).

### Export (Excel / CSV)

| Method | Endpoint | Keterangan |
|---|---|---|
| GET | `/api/exports/logs?format=xlsx\|csv&start=&end=` | Log semua mesin di **semua cabang** |
| GET | `/api/branches/:branchId/exports/logs?format=xlsx\|csv&start=&end=` | Log semua mesin di cabang |
| GET | `/api/branches/:branchId/devices/:code/exports/logs?format=&start=&end=` | Log **satu mesin** |
| GET | `/api/exports/summary?format=&start=&end=` | Tabel availability per mesin, **semua cabang** |
| GET | `/api/branches/:branchId/exports/summary?format=&start=&end=` | Tabel availability per mesin di cabang |

- Kolom log: Waktu (zona `TIMEZONE`), Cabang, ID Mesin, Lokasi, Status, Status Dilaporkan, Arus (A), Voltase (V), Suhu (°C), Kelembapan (%), Threshold (A), IP Address.
- `xlsx`: header tebal, baris pertama dibekukan, angka tersimpan sebagai angka. Dibatasi 200.000 baris (413 jika lebih; persempit rentang atau pakai CSV).
- `csv`: UTF-8 dengan BOM dan baris `CRLF` (langsung terbaca Excel). Tambahkan `&delimiter=semicolon` bila Excel di komputer memakai pemisah `;`. CSV di-stream, tidak ada batas baris.
- Rentang maks 93 hari. Nama file: `strum-logs-UP2W1_6CNC1-2026-09-01_2026-09-30.xlsx` (semua cabang: `strum-logs-SEMUA-CABANG-...`).

Contoh (browser sudah login):

```js
const res = await fetch(`${API}/api/branches/UP2W1/devices/6CNC1/exports/logs?format=xlsx&start=2026-09-01&end=2026-09-30`, { credentials: "include" });
const blob = await res.blob(); // simpan sebagai file
```

## 🔁 Perubahan untuk frontend (dari API versi 1 cabang)

| Lama | Baru |
|---|---|
| `GET /api/devices`, `/api/devices/:id`, `/api/devices-metadata` | `GET /api/branches/:branchId/devices`, `/devices/:code` |
| `GET /api/stats` | `GET /api/branches/:branchId/stats` atau `GET /api/overview` |
| `GET /api/summary/harian/:tanggal`, `/mingguan`, `/bulanan`, `/range` | `GET /api/branches/:branchId/summary?start&end` (frontend menentukan rentang) |
| `GET/POST /api/set-operasional` | `GET /api/branches/:branchId` (`operationalHours`) / `PATCH /api/branches/:branchId` |
| `GET /api/logs/download?format=csv\|json` | `.../exports/logs?format=csv\|xlsx` (JSON tidak lagi tersedia) |
| Field summary `idle_hours` (string) dll. | `idleHours` (angka) dll., lihat tabel di atas |
| `device.id` = kode mesin, `rawData`, `thresholdDuty` | `device.code` = kode mesin, `device.id` = uuid, `threshold`; `rawData` dihapus |
| Login sukses `{ success, message }` | `{ success, data: { id, username } }` |

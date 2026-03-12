# 🚀 Strum – IoT Telemetry Dashboard

Dashboard web real‑time untuk memantau status dan data telemetri dari perangkat IoT (Internet of Things). Proyek ini terdiri dari **backend server** yang menerima data via MQTT dan menyimpannya di PostgreSQL, serta **frontend React** yang menampilkan visualisasi interaktif.

## 📋 Prasyarat

Sebelum memulai, pastikan sistem Anda telah terinstal:

### Umum
- **Node.js** (versi 18 atau lebih baru) – untuk menjalankan frontend.
- **Bun** (versi 1.0+) – runtime untuk backend (lebih cepat dari Node.js).
- **PostgreSQL** (versi 15+) – database untuk menyimpan data telemetri.
- **Git** – untuk mengelola repositori.

### MQTT Broker
- **Eclipse Mosquitto** – broker MQTT yang akan menerima data dari perangkat IoT.

### Sistem Operasi
Panduan ini mencakup instalasi untuk **Windows** dan **Linux (Ubuntu)**. Untuk macOS, langkah‑langkahnya serupa dengan Linux.

---

## 🛠️ Instalasi MQTT Broker (Mosquitto)

### Windows
1. Unduh installer dari [mosquitto‑download](https://mosquitto.org/download/).
2. Jalankan installer dan ikuti wizard.
3. Setelah terinstal, buka **Services** (layanan) dan pastikan layanan `Mosquitto` berjalan.
4. Untuk testing, buka Command Prompt dan jalankan:
   
```bash
   mosquitto_sub -h localhost -t test
   
```
   Di jendela lain:
   
```bash
   mosquitto_pub -h localhost -t test -m "hello"
   
```
   Jika pesan muncul, broker berfungsi.

### Ubuntu / Debian
1. Update paket dan instal Mosquitto:
   
```bash
   sudo apt update
   sudo apt install mosquitto mosquitto-clients
```
2. Jalankan layanan:
   
```bash
   sudo systemctl start mosquitto
   sudo systemctl enable mosquitto
```
3. Verifikasi:
   
```bash
   mosquitto_sub -h localhost -t test &
   mosquitto_pub -h localhost -t test -m "hello"
```

---

## 📦 Instalasi Backend

Backend dibangun dengan **Bun**, **ElysiaJS**, **Prisma ORM**, dan **MQTT client**.

### 1. Clone Repositori
```bash
git clone <URL-repositori-anda>
cd Strum
```

### 2. Masuk ke Direktori Backend
```bash
cd Strum-Backend
```

### 3. Instalasi Dependensi dengan Bun
```bash
bun install
```

### 4. Konfigurasi Environment Variables
Salin file contoh environment dan sesuaikan dengan setting lokal Anda:
```bash
cp .env.example .env
```
Buka file `.env` dan isi nilai‑nilai berikut:
```
env
DATABASE_URL="postgresql://user:password@localhost:5432/iot_db?schema=public"
MQTT_BROKER_URL="mqtt://localhost:1883"
MQTT_USERNAME=""
MQTT_PASSWORD=""
```

### 5. Setup Database
Generate client Prisma dan jalankan migrasi:
```bash
bunx prisma generate
bunx prisma migrate dev
```

### 6. (Opsional) Seed Database
Jika ada file seed, jalankan:
```bash
bunx prisma db seed
```

---

## 🖥️ Instalasi Frontend

Frontend adalah aplikasi React dengan TypeScript, Vite, dan shadcn/ui.

### 1. Masuk ke Direktori Frontend
```bash
cd ../frontend
```

### 2. Instalasi Dependensi dengan npm (atau bun)
```bash
npm install
# atau
bun install
```

### 3. Konfigurasi Environment Variables (jika diperlukan)
Frontend biasanya tidak memerlukan file `.env` untuk development, tetapi jika ada variabel seperti `VITE_API_URL`, buat file `.env` di dalam `frontend/`:
```env
VITE_API_URL=http://localhost:3000
```

---

## 🚀 Menjalankan Server Development

### Backend
Di direktori `Strum-Backend`, jalankan:
```bash
bun --watch src/index.ts
```
Server akan berjalan di **http://localhost:3000** dan otomatis reload saat ada perubahan.

### Frontend
Di direktori `frontend`, jalankan:
```bash
npm run dev
# atau
bun run dev
```
Frontend akan berjalan di **http://localhost:5173** (default Vite).

---

## 🌐 Mengakses Dashboard

1. Pastikan kedua server (backend & frontend) sedang berjalan.
2. Buka browser dan akses **http://localhost:5173**.
3. Dashboard akan menampilkan halaman login (jika ada) atau langsung ke halaman overview.
4. Untuk menguji integrasi MQTT, Anda dapat menggunakan skrip simulator yang disediakan di `Strum-Backend/test-mqtt-simulator.ts`:
   
```bash
   cd Strum-Backend
   bun run test-mqtt-simulator.ts
```
   Data dummy akan dikirim ke broker dan muncul di dashboard.

---

## ☁️ Deployment & Tunneling dengan Cloudflared

Jika Anda ingin mengekspose server lokal ke internet (misalnya untuk testing remote), Anda dapat menggunakan **Cloudflare Tunnel**.

### 1. Instal Cloudflared
- **Windows**: Unduh dari [cloudflared‑download](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/) dan ekstrak.
- **Ubuntu**:
  
```bash
  wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
  sudo dpkg -i cloudflared-linux-amd64.deb
```

### 2. Login dan Dapatkan Authtoken
```
bash
cloudflared tunnel login
```
Ikuti petunjuk untuk login ke akun Cloudflare.

### 3. Buat Tunnel
```
bash
cloudflared tunnel create <nama-tunnel>
```
Catat **Tunnel ID** yang dihasilkan.

### 4. Konfigurasi Tunnel
Buat file konfigurasi (misal `config.yml`) di `~/.cloudflared/`:
```
yaml
tunnel: <tunnel-id>
credentials-file: /path/to/credentials.json

ingress:
  - hostname: dashboard.example.com
    service: http://localhost:5173
  - hostname: api.example.com
    service: http://localhost:3000
  - service: http_status:404
```

### 5. Jalankan Tunnel
```bash
cloudflared tunnel run <tunnel-id>
```
Tunnel akan membuat URL publik (misal `https://dashboard.example.com`) yang mengarah ke server lokal.

### 6. File yang Perlu Disetup Ulang untuk Deployment
- **Backend**: Ubah `DATABASE_URL` di `.env` menjadi koneksi database production (misal cloud PostgreSQL).
- **Frontend**: Ubah `VITE_API_URL` di `.env` menjadi URL backend production.
- **MQTT Broker**: Jika broker berjalan di server lain, ganti `MQTT_BROKER_URL` di backend.
- **CORS**: Pastikan backend mengizinkan origin frontend production.

---

## 🐧 Catatan Khusus untuk Linux (Ubuntu)

### Instalasi Node.js & Bun
```
bash
# Node.js (via nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
nvm install --lts
nvm use --lts

# Bun
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc
```

### Instalasi PostgreSQL
```bash
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo -u postgres psql -c "CREATE DATABASE iot_db;"
sudo -u postgres psql -c "CREATE USER myuser WITH PASSWORD 'mypassword';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE iot_db TO myuser;"
```

### Firewall (jika diperlukan)
```bash
sudo ufw allow 5432/tcp   # PostgreSQL
sudo ufw allow 1883/tcp   # MQTT
sudo ufw allow 3000/tcp   # Backend
sudo ufw allow 5173/tcp   # Frontend
```

---

## 🔧 Troubleshooting

### 1. Backend tidak terhubung ke MQTT Broker
- Pastikan Mosquitto berjalan (`sudo systemctl status mosquitto`).
- Periksa `MQTT_BROKER_URL` di `.env` (gunakan `mqtt://localhost:1883`).

### 2. Error database “relation does not exist”
- Jalankan ulang migrasi Prisma:
  
```bash
  bunx prisma migrate reset
  bunx prisma migrate dev
  
```

### 3. Frontend tidak dapat mengakses API
- Pastikan backend berjalan di port 3000.
- Periksa CORS di backend (sudah dikonfigurasi untuk `http://localhost:5173`).

### 4. Cloudflared tunnel tidak bisa akses
- Verifikasi tunnel ID dan file kredensial.
- Pastikan server lokal berjalan sebelum menjalankan tunnel.

---

## 📚 Referensi

- [Dokumentasi Backend](Strum-Backend/README.md) – detail teknis tentang API dan MQTT.
- [Dokumentasi Frontend](frontend/README.md) – panduan pengembangan frontend.
- [ElysiaJS](https://elysiajs.com) – framework backend.
- [Prisma](https://www.prisma.io) – ORM untuk PostgreSQL.
- [React](https://react.dev) – library frontend.
- [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/) – tunneling gratis.

---

## 📄 Lisensi

Proyek ini dilisensikan di bawah [MIT License](LICENSE) (jika ada).

---

**Selamat mencoba!** Jika ada kendala, buka issue di repositori atau hubungi pengembang.

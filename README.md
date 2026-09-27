# Tukang Siaga

Sistem Informasi Manajemen Jasa Tukang (Tukang Siaga) berbasis Web, menggunakan Node.js dan SQLite.

## Fitur Utama
- **Dashboard Admin:** Kelola Pesanan (Work Orders), Layanan, Pengguna (Teknisi), dan Galeri Portofolio.
- **Sistem Keuangan:** Catat pengeluaran HPP, tagihan kotor, dan total uang muka (DP) dengan kalkulasi laba-rugi (KPI) otomatis.
- **Tracking Pelanggan:** Pelanggan dapat memantau status perbaikan mereka menggunakan `Job ID`.
- **Cetak Dokumen:** Cetak Invoice, Surat Perintah Kerja (SPK), dan Surat Penawaran Harga (SPH) langsung dari aplikasi.
- **Sistem & Pemeliharaan:** Backup database secara lokal, merestore database, dan update kode dari Git langsung melalui antarmuka web.

## Instalasi Otomatis (Direkomendasikan untuk Proxmox LXC Ubuntu/Debian)

Jika Anda ingin mendeploy aplikasi ini di atas server kosong (seperti Proxmox LXC Container berbasis Debian atau Ubuntu) tanpa Docker, cukup gunakan script `install.sh`.

1. Masuk ke console / SSH Proxmox LXC Anda sebagai `root`.
2. Clone repository ini:
   ```bash
   git clone https://github.com/USERNAME-ANDA/tukangsiaga.git
   cd tukangsiaga
   ```
   *(Ganti URL di atas dengan tautan repository Github Anda)*
3. Beri izin eksekusi pada script install:
   ```bash
   chmod +x install.sh
   ```
4. Jalankan script instalasinya:
   ```bash
   ./install.sh
   ```
5. Selesai! Aplikasi akan otomatis berjalan 24/7 (dibantu oleh PM2).
6. Buka browser dan akses IP dari LXC Anda di Port 80 (contoh: `http://192.168.1.100`).

## Akses Admin Default
Setelah sistem berhasil berjalan, Anda bisa login ke panel admin menggunakan:
- **URL Admin:** `http://IP-ANDA/admin-login.html`
- **Username:** `admin`
- **Password:** `admin123`

## Menjalankan Manual (Windows / Lokal)

1. Pastikan Anda telah menginstal [Node.js](https://nodejs.org/).
2. Buka terminal/CMD di folder aplikasi ini, lalu jalankan:
   ```bash
   npm install
   ```
3. Mulai server:
   ```bash
   node server.js
   ```
4. Buka di browser: `http://localhost:80`

## Melakukan Pembaruan (Git Pull)
Anda dapat melakukan pembaruan (menarik *code* terbaru dari GitHub) dengan **dua cara**:
1. **Lewat Admin Dasbor (Sangat Mudah)**: Masuk ke Admin, pilih Tab **Pengaturan**, gulir ke bawah ke menu **Sistem & Pemeliharaan**, lalu klik **Update**.
2. **Lewat Terminal SSH**:
   ```bash
   cd /path/ke/folder/tukangsiaga
   git pull origin main
   pm2 restart tukangsiaga
   ```

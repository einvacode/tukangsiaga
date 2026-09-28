#!/bin/bash
# Script Instalasi Tukang Siaga untuk Debian/Ubuntu (Proxmox CT LXC)

echo "========================================="
echo "   Instalasi Server Tukang Siaga (LXC)   "
echo "========================================="

# Pastikan script dijalankan sebagai root
if [ "$EUID" -ne 0 ]; then
  echo "❌ Error: Mohon jalankan script ini sebagai root (Gunakan: sudo ./install.sh)"
  exit
fi

echo -e "\n[1/4] Memperbarui sistem dan menginstal dependensi dasar..."
apt-get update
apt-get install -y curl git apt-transport-https lsb-release ca-certificates build-essential python3 make g++ pkg-config libsqlite3-dev

echo -e "\n[2/4] Menginstal Node.js (LTS)..."
# Setup Node.js repo LTS
curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -
apt-get install -y nodejs

echo -e "\n[3/4] Menginstal Dependensi Node.js & Compile SQLite3..."
# Hapus node_modules lama jika ada untuk mencegah konflik binary
rm -rf node_modules
# Force compile sqlite3 dari source agar cocok dengan arsitektur Proxmox CT LXC
npm_config_build_from_source=true npm install

echo -e "\n[4/4] Mengatur PM2 agar aplikasi berjalan 24/7 di background..."
npm install -g pm2
# Hentikan instance sebelumnya jika ada
pm2 stop tukangsiaga 2>/dev/null
pm2 delete tukangsiaga 2>/dev/null

# Jalankan server
pm2 start server.js --name "tukangsiaga"
pm2 save
pm2 startup

echo "========================================="
echo "✅ Instalasi Selesai!"
echo "========================================="
echo "Aplikasi Tukang Siaga sekarang berjalan otomatis menggunakan SQLite."
echo "Anda dapat mengaksesnya melalui browser di: http://<IP_PROXMOX_LXC>:80"
echo "Untuk melihat log server, jalankan: pm2 logs tukangsiaga"


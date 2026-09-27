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

echo -e "\n[1/5] Memperbarui sistem dan dependensi dasar..."
apt-get update
apt-get install -y curl dirmngr apt-transport-https lsb-release ca-certificates

echo -e "\n[2/5] Menginstal Node.js (LTS) & MariaDB..."
# Setup Node.js repo LTS
curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -
apt-get install -y nodejs mariadb-server

echo -e "\n[3/5] Mengatur Database MariaDB..."
systemctl start mariadb
systemctl enable mariadb

# Membuat database (jika belum ada) dan mengimpor skema
echo "Membuat database 'tukangsiaga' dan mengimpor skema..."
mysql -u root -e "CREATE DATABASE IF NOT EXISTS tukangsiaga;"
if [ -f "schema.sql" ]; then
    mysql -u root tukangsiaga < schema.sql
    echo "Skema berhasil diimpor!"
else
    echo "⚠️ Peringatan: File schema.sql tidak ditemukan. Harap import manual nanti."
fi

echo -e "\n[4/5] Menginstal Dependensi Node.js..."
npm install

echo -e "\n[5/5] Mengatur PM2 agar aplikasi berjalan 24/7 di background..."
npm install -g pm2
# Hentikan instance sebelumnya jika ada
pm2 stop tukangsiaga-app 2>/dev/null
pm2 delete tukangsiaga-app 2>/dev/null

# Jalankan server
pm2 start server.js --name "tukangsiaga-app"
pm2 save
pm2 startup

echo "========================================="
echo "✅ Instalasi Selesai!"
echo "========================================="
echo "Aplikasi Tukang Siaga sekarang berjalan otomatis di background."
echo "Anda dapat mengaksesnya melalui IP Proxmox CT Anda di browser."
echo "Untuk melihat log server, jalankan: pm2 logs tukangsiaga-app"

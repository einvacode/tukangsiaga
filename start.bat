@echo off
title Tukang Siaga - Development Server
color 0B

echo ==================================================
echo         Memulai Aplikasi Tukang Siaga (Lokal)
echo ==================================================
echo.

echo [1] Mengecek dependensi NPM...
call npm install

echo.
echo [2] Menjalankan Server Node.js...
echo --------------------------------------------------
echo ⚠️ PASTIKAN MySQL/MariaDB (misal: XAMPP/Laragon) 
echo    sudah berjalan di Windows Anda dan database 
echo    'tukangsiaga' sudah dibuat!
echo --------------------------------------------------
echo.

node server.js

pause

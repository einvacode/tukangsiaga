-- ============================================================
-- Tukang Siaga - Database Schema (Full Reset)
-- Jalankan: mysql -u root tukangsiaga < schema.sql
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS job_progress;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS gallery;
DROP TABLE IF EXISTS services;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

-- Users (Admin & Tukang)
CREATE TABLE users (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    email       VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role        ENUM('admin','technician') NOT NULL DEFAULT 'technician',
    phone_number VARCHAR(25),
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Layanan
CREATE TABLE services (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    name           VARCHAR(100) NOT NULL,
    description    TEXT,
    starting_price DECIMAL(12,0) NOT NULL DEFAULT 0,
    icon           VARCHAR(60) DEFAULT 'fas fa-tools',
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Galeri
CREATE TABLE gallery (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    image_url   VARCHAR(500) NOT NULL,
    title       VARCHAR(150),
    category    VARCHAR(100) DEFAULT 'Umum',
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders (Pesanan Pelanggan)
CREATE TABLE orders (
    id                   INT AUTO_INCREMENT PRIMARY KEY,
    job_id               VARCHAR(20) UNIQUE NOT NULL,
    customer_name        VARCHAR(100) NOT NULL,
    customer_whatsapp    VARCHAR(25) NOT NULL,
    customer_address     TEXT NOT NULL,
    service_type         VARCHAR(100) NOT NULL,
    problem_description  TEXT NOT NULL,
    technician_id        INT NULL,
    current_status       ENUM('pending','assigned','on_the_way','in_progress','completed','cancelled') DEFAULT 'pending',
    estimated_completion DATETIME NULL,
    final_price          DECIMAL(12,0) NULL,
    notes_admin          TEXT NULL,
    created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (technician_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Job Progress (Timeline Tahapan)
CREATE TABLE job_progress (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    order_id    INT NOT NULL,
    step_status ENUM('order_received','technician_on_the_way','repair_in_progress','completed') NOT NULL,
    notes       TEXT,
    photo_url   VARCHAR(500),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- Index performa
CREATE INDEX idx_orders_job_id ON orders(job_id);
CREATE INDEX idx_orders_status ON orders(current_status);
CREATE INDEX idx_progress_order ON job_progress(order_id);

-- ============================================================
-- DATA AWAL (Seed)
-- ============================================================

-- Admin default (password: admin123 - ganti setelah install!)
INSERT INTO users (name, email, password_hash, role, phone_number) VALUES
('Administrator', 'admin@tukangsiaga.com', '$2b$10$placeholderHashAdmin123', 'admin', '081234567890'),
('Budi Santoso', 'budi@tukangsiaga.com', '$2b$10$placeholderHashTukang1', 'technician', '085211112222'),
('Agus Salim', 'agus@tukangsiaga.com', '$2b$10$placeholderHashTukang2', 'technician', '085233334444');

-- Layanan default
INSERT INTO services (name, description, starting_price, icon) VALUES
('Saluran Air & Pipa', 'Perbaikan pipa bocor, wastafel mampet, saluran tersumbat, dan instalasi pipa baru.', 150000, 'droplets'),
('Plafon & Gypsum', 'Perbaikan plafon retak, rembes, jebol, serta pemasangan partisi gypsum baru.', 200000, 'box'),
('Atap & Genteng Bocor', 'Deteksi sumber bocor, penggantian genteng, perbaikan talang, dan waterproofing dak beton.', 250000, 'home'),
('Instalasi Listrik', 'Pemasangan stop kontak, saklar, MCB, dan perbaikan instalasi listrik rumah.', 175000, 'zap'),
('Cat Rumah', 'Pengecatan dinding interior dan eksterior dengan cat berkualitas pilihan.', 300000, 'paint-roller');

-- Galeri default
INSERT INTO gallery (image_url, title, category) VALUES
('https://images.unsplash.com/photo-1632759145351-1d592919f522?auto=format&fit=crop&w=600&q=80', 'Perbaikan Genteng Bocor', 'Atap & Genteng Bocor'),
('https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80', 'Instalasi Plafon Gypsum', 'Plafon & Gypsum'),
('https://images.unsplash.com/photo-1607472586893-edb57cb3b4e1?auto=format&fit=crop&w=600&q=80', 'Perbaikan Pipa & Saluran', 'Saluran Air & Pipa'),
('https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=600&q=80', 'Pengecatan Dinding', 'Cat Rumah'),
('https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&w=600&q=80', 'Renovasi Kamar Mandi', 'Umum'),
('https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=600&q=80', 'Pemasangan Keramik', 'Umum');

-- ============================================================
-- PENGATURAN (Settings)
-- ============================================================
DROP TABLE IF EXISTS settings;
CREATE TABLE settings (
    setting_key VARCHAR(50) PRIMARY KEY,
    setting_value TEXT
);

INSERT INTO settings (setting_key, setting_value) VALUES
('company_name', 'Tukang Siaga'),
('company_email', 'hello@tukangsiaga.com'),
('company_phone', '0812-3456-7890'),
('company_address', 'Jakarta Pusat'),
('company_coverage', 'Jakarta, Bogor, Depok, Tangerang, Bekasi'),
('gallery_categories', 'Umum, Saluran Air & Pipa, Plafon & Gypsum, Atap & Genteng Bocor, Instalasi Listrik, Cat Rumah'),
('company_logo', ''),
('hero_title', 'Perbaikan Rumah Cepat, Transparan, & Bergaransi.'),
('hero_subtitle', 'Pantau setiap tahap pekerjaan secara real-time. Harga jelas di awal, tanpa biaya tersembunyi.'),
('about_text', 'Platform jasa perbaikan rumah terpercaya. Teknisi profesional terverifikasi, harga transparan, hasil bergaransi.');

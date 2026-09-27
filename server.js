require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Pastikan folder uploads tersedia
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Multer config — simpan ke public/uploads/ dengan nama unik
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `order-${Date.now()}${ext}`);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // maks 5 MB
    fileFilter: (req, file, cb) => {
        const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) cb(null, true);
        else cb(new Error('Hanya file JPG, PNG, atau WEBP yang diperbolehkan.'));
    }
});

// ============================================================
// DATABASE POOL
// ============================================================
let pool;
(async () => {
    pool = await open({
        filename: path.join(__dirname, 'database.sqlite'),
        driver: sqlite3.Database
    });
    // Initialize tables
    await pool.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'technician',
            name TEXT,
            phone_number TEXT,
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS services (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            starting_price DECIMAL(10,2) NOT NULL,
            icon TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            job_id TEXT UNIQUE NOT NULL,
            customer_name TEXT NOT NULL,
            customer_whatsapp TEXT NOT NULL,
            customer_address TEXT NOT NULL,
            service_type TEXT NOT NULL,
            problem_description TEXT,
            initial_photo_url TEXT,
            current_status TEXT DEFAULT 'pending',
            final_price DECIMAL(10,2),
            technician_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS job_progress (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER NOT NULL,
            step_status TEXT NOT NULL,
            notes TEXT,
            photo_url TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS gallery (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            image_url TEXT NOT NULL,
            title TEXT,
            category TEXT DEFAULT 'Umum',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS settings (
            setting_key TEXT PRIMARY KEY,
            setting_value TEXT
        );
    `);
    
    // Migrations
    try { await pool.run("ALTER TABLE orders ADD COLUMN items TEXT DEFAULT '[]'"); } catch(e){}
    try { await pool.run("ALTER TABLE orders ADD COLUMN dp_amount DECIMAL(10,2) DEFAULT 0"); } catch(e){}
    try { await pool.run("ALTER TABLE orders ADD COLUMN expense_amount DECIMAL(10,2) DEFAULT 0"); } catch(e){}
    
    
    // Seed initial data if empty
    const userCount = await pool.get('SELECT COUNT(*) as c FROM users');
    if (userCount.c === 0) {
        await pool.run("INSERT INTO users (username, password, role, name) VALUES ('admin', 'admin123', 'admin', 'Administrator')");
        await pool.run("INSERT INTO users (username, password, role, name, phone_number) VALUES ('tukang', 'tukang123', 'technician', 'Budi Teknisi', '081234567890')");
        
        await pool.run(`INSERT INTO services (name, description, starting_price, icon) VALUES
        ('Atap & Genteng Bocor', 'Perbaikan kebocoran atap, genteng melorot, dan pembersihan talang air.', 150000, 'home'),
        ('Plafon & Gypsum', 'Perbaikan plafon jebol, rembes, atau pemasangan partisi gypsum baru.', 200000, 'grid'),
        ('Saluran Air & Pipa', 'Mengatasi wastafel mampet, keran bocor, dan instalasi pipa air bersih/kotor.', 100000, 'droplet'),
        ('Kelistrikan', 'Pemasangan stop kontak, perbaikan korsleting, dan instalasi lampu rumah.', 150000, 'zap'),
        ('Cat Rumah', 'Pengecatan dinding interior dan eksterior dengan cat berkualitas pilihan.', 300000, 'paint-roller')`);

        await pool.run(`INSERT INTO gallery (image_url, title, category) VALUES
        ('https://images.unsplash.com/photo-1632759145351-1d592919f522?auto=format&fit=crop&w=600&q=80', 'Perbaikan Genteng Bocor', 'Atap & Genteng Bocor'),
        ('https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80', 'Instalasi Plafon Gypsum', 'Plafon & Gypsum'),
        ('https://images.unsplash.com/photo-1607472586893-edb57cb3b4e1?auto=format&fit=crop&w=600&q=80', 'Perbaikan Pipa & Saluran', 'Saluran Air & Pipa'),
        ('https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=600&q=80', 'Pengecatan Dinding', 'Cat Rumah'),
        ('https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&w=600&q=80', 'Renovasi Kamar Mandi', 'Umum'),
        ('https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=600&q=80', 'Pemasangan Keramik', 'Umum')`);
        
        await pool.run(`INSERT INTO settings (setting_key, setting_value) VALUES
        ('company_name', 'Tukang Siaga'),
        ('company_email', 'hello@tukangsiaga.com'),
        ('company_phone', '0812-3456-7890'),
        ('company_address', 'Jakarta Pusat'),
        ('company_coverage', 'Jakarta, Bogor, Depok, Tangerang, Bekasi'),
        ('gallery_categories', 'Umum, Saluran Air & Pipa, Plafon & Gypsum, Atap & Genteng Bocor, Instalasi Listrik, Cat Rumah'),
        ('company_logo', ''),
        ('hero_title', 'Perbaikan Rumah Cepat, Transparan, & Bergaransi.'),
        ('hero_subtitle', 'Pantau setiap tahap pekerjaan secara real-time. Harga jelas di awal, tanpa biaya tersembunyi.'),
        ('about_text', 'Platform jasa perbaikan rumah terpercaya. Teknisi profesional terverifikasi, harga transparan, hasil bergaransi.')`);
    }
})();

// Helper: generate job ID
function generateJobId() {
    return 'FIX-' + Math.floor(1000 + Math.random() * 9000);
}

// Helper: format Rupiah
function formatRp(angka) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
}

// ============================================================
// PUBLIC API - ORDERS
// ============================================================

// POST /api/orders - Buat pesanan baru (support upload foto)
app.post('/api/orders', upload.single('photo'), async (req, res) => {
    const { name, whatsapp, address, service, description } = req.body;
    if (!name || !whatsapp || !address || !service || !description) {
        // Hapus file yang sudah terlanjur terupload jika validasi gagal
        if (req.file) fs.unlink(req.file.path, () => {});
        return res.status(400).json({ success: false, message: 'Semua field wajib diisi.' });
    }
    try {
        const jobId = generateJobId();
        const photoUrl = req.file ? `/uploads/${req.file.filename}` : null;

        const result = await pool.run(
            `INSERT INTO orders (job_id, customer_name, customer_whatsapp, customer_address, service_type, problem_description, initial_photo_url, current_status)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
            [jobId, name, whatsapp, address, service, description, photoUrl]
        );
        await pool.run(`INSERT INTO job_progress (order_id, step_status, notes) VALUES (?, 'order_received', 'Pesanan masuk dan sedang menunggu konfirmasi admin.')`, [result.lastID]);
        res.status(201).json({ success: true, message: 'Pesanan berhasil dibuat.', jobId, photoUrl });
    } catch (err) {
        console.error('[POST /api/orders]', err);
        if (req.file) fs.unlink(req.file.path, () => {});
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// Error handler khusus Multer
app.use((err, req, res, next) => {
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: 'Ukuran file terlalu besar. Maksimal 5 MB.' });
    }
    if (err.message && err.message.includes('WEBP')) {
        return res.status(400).json({ success: false, message: err.message });
    }
    next(err);
});


// GET /api/progress/:jobId - Cek status pesanan
app.get('/api/progress/:jobId', async (req, res) => {
    try {
        const orders = await pool.all('SELECT * FROM orders WHERE job_id = ?', [req.params.jobId]);
        if (orders.length === 0) return res.status(404).json({ success: false, message: 'ID Pekerjaan tidak ditemukan.' });

        const order = orders[0];
        const timeline = await pool.all('SELECT * FROM job_progress WHERE order_id = ? ORDER BY created_at ASC', [order.id]);

        let technician = null;
        if (order.technician_id) {
            const techs = await pool.all('SELECT id, name, phone_number FROM users WHERE id = ?', [order.technician_id]);
            technician = techs[0] || null;
        }

        res.json({ success: true, data: { order, technician, timeline } });
    } catch (err) {
        console.error('[GET /api/progress]', err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// DELETE order
app.delete('/api/admin/orders/:id', async (req, res) => {
    try {
        await pool.run('DELETE FROM orders WHERE id = ?', [req.params.id]);
        await pool.run('DELETE FROM job_progress WHERE order_id = ?', [req.params.id]);
        res.json({ success: true, message: 'Pesanan berhasil dihapus permanen.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ============================================================
// PUBLIC API - CMS
// ============================================================

app.get('/api/services', async (req, res) => {
    try {
        const rows = await pool.all('SELECT * FROM services ORDER BY id ASC');
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.get('/api/gallery', async (req, res) => {
    try {
        const rows = await pool.all('SELECT * FROM gallery ORDER BY id DESC');
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ============================================================
// ADMIN API - ORDERS MANAGEMENT
// ============================================================

// GET semua orders untuk admin
app.get('/api/admin/orders', async (req, res) => {
    try {
        const rows = await pool.all(`
            SELECT o.*, u.name as technician_name
            FROM orders o
            LEFT JOIN users u ON o.technician_id = u.id
            ORDER BY o.created_at DESC
        `);
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET satu order detail untuk Work Order / Invoice
app.get('/api/admin/orders/:id', async (req, res) => {
    try {
        const orders = await pool.all(`
            SELECT o.*, u.name as technician_name, u.phone_number as technician_phone
            FROM orders o
            LEFT JOIN users u ON o.technician_id = u.id
            WHERE o.id = ?
        `, [req.params.id]);
        if (orders.length === 0) return res.status(404).json({ success: false, message: 'Order tidak ditemukan.' });

        const order = orders[0];
        const timeline = await pool.all('SELECT * FROM job_progress WHERE order_id = ? ORDER BY created_at ASC', [order.id]);
        const services = await pool.all('SELECT * FROM services WHERE name = ?', [order.service_type]);

        res.json({ success: true, data: { order, timeline, service: services[0] || null } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PATCH status order
app.patch('/api/admin/orders/:id/status', async (req, res) => {
    const { status, notes, technician_id } = req.body;
    const validStatuses = ['pending','assigned','on_the_way','in_progress','completed','cancelled'];
    if (!validStatuses.includes(status)) return res.status(400).json({ success: false, message: 'Status tidak valid.' });

    const stepMap = {
        assigned: 'order_received',
        on_the_way: 'technician_on_the_way',
        in_progress: 'repair_in_progress',
        completed: 'completed'
    };

    try {
        const updateFields = ['current_status = ?'];
        const updateValues = [status];
        if (technician_id) { updateFields.push('technician_id = ?'); updateValues.push(technician_id); }
        updateValues.push(req.params.id);

        await pool.run(`UPDATE orders SET ${updateFields.join(', ')} WHERE id = ?`, updateValues);

        if (stepMap[status]) {
            await pool.run(
                `INSERT INTO job_progress (order_id, step_status, notes) VALUES (?, ?, ?)`,
                [req.params.id, stepMap[status], notes || `Status diubah ke ${status}.`]
            );
        }
        res.json({ success: true, message: 'Status berhasil diperbarui.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.put('/api/admin/orders/:id/items', async (req, res) => {
    const { items, dp_amount, expense_amount } = req.body;
    try {
        const itemsJson = JSON.stringify(items || []);
        let total = 0;
        if (items && items.length > 0) {
            total = items.reduce((sum, it) => sum + (Number(it.qty) * Number(it.price)), 0);
        }
        await pool.run(
            'UPDATE orders SET items = ?, final_price = ?, dp_amount = ?, expense_amount = ? WHERE id = ?', 
            [itemsJson, total, dp_amount || 0, expense_amount || 0, req.params.id]
        );
        res.json({ success: true, message: 'Rincian biaya, DP, dan pengeluaran berhasil disimpan.', total });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ============================================================
// ADMIN API - SERVICES & GALLERY
// ============================================================

app.post('/api/admin/services', async (req, res) => {
    const { name, description, starting_price, icon } = req.body;
    if (!name || !starting_price) return res.status(400).json({ success: false, message: 'Nama dan harga wajib diisi.' });
    try {
        await pool.run(
            'INSERT INTO services (name, description, starting_price, icon) VALUES (?, ?, ?, ?)',
            [name, description || '', starting_price, icon || 'wrench']
        );
        res.json({ success: true, message: 'Layanan berhasil ditambahkan.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.put('/api/admin/services/:id', async (req, res) => {
    const { name, description, starting_price, icon } = req.body;
    try {
        await pool.run(
            'UPDATE services SET name = ?, description = ?, starting_price = ?, icon = ? WHERE id = ?',
            [name, description, starting_price, icon, req.params.id]
        );
        res.json({ success: true, message: 'Layanan berhasil diperbarui.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.delete('/api/admin/services/:id', async (req, res) => {
    try {
        await pool.run('DELETE FROM services WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Layanan berhasil dihapus.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/api/admin/gallery/upload', upload.single('photo'), async (req, res) => {
    const { title, category } = req.body;
    if (!req.file || !title) return res.status(400).json({ success: false, message: 'Foto dan judul wajib diisi.' });
    try {
        const url = `/uploads/${req.file.filename}`;
        const cat = category || 'Umum';
        await pool.run('INSERT INTO gallery (image_url, title, category) VALUES (?, ?, ?)', [url, title, cat]);
        res.json({ success: true, message: 'Foto berhasil diupload dan ditambahkan.' });
    } catch (err) {
        if (req.file) fs.unlink(req.file.path, () => {});
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/api/admin/gallery', async (req, res) => {
    const { url, title, category } = req.body;
    if (!url || !title) return res.status(400).json({ success: false, message: 'URL dan judul wajib diisi.' });
    try {
        const cat = category || 'Umum';
        await pool.run('INSERT INTO gallery (image_url, title, category) VALUES (?, ?, ?)', [url, title, cat]);
        res.json({ success: true, message: 'Foto berhasil ditambahkan.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.delete('/api/admin/gallery/:id', async (req, res) => {
    try {
        await pool.run('DELETE FROM gallery WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Foto berhasil dihapus.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ============================================================
// ADMIN API - USERS (Admin & Technician)
// ============================================================

// GET semua user
app.get('/api/admin/users', async (req, res) => {
    try {
        const rows = await pool.all("SELECT id, name, phone_number, is_active, username, role FROM users");
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST tambah user
app.post('/api/admin/users', async (req, res) => {
    const { username, password, name, phone_number, role } = req.body;
    if (!username || !password || !name) return res.status(400).json({ success: false, message: 'Username, password, dan nama wajib diisi.' });
    try {
        await pool.run(
            "INSERT INTO users (username, password, role, name, phone_number) VALUES (?, ?, ?, ?, ?)",
            [username, password, role || 'technician', name, phone_number || '']
        );
        res.json({ success: true, message: 'Pengguna berhasil ditambahkan.' });
    } catch (err) {
        if (err.code === 'SQLITE_CONSTRAINT') return res.status(400).json({ success: false, message: 'Gagal: ' + err.message });
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST login admin
app.post('/api/admin/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const users = await pool.all('SELECT * FROM users WHERE username = ? AND password = ?', [username, password]);
        if (users.length > 0) {
            const user = users[0];
            if (user.is_active === 0) {
                return res.status(403).json({ success: false, message: 'Akun nonaktif.' });
            }
            res.json({ success: true, user: { id: user.id, username: user.username, role: user.role, name: user.name } });
        } else {
            res.status(401).json({ success: false, message: 'Username atau password salah.' });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT update user
app.put('/api/admin/users/:id', async (req, res) => {
    const { name, phone_number, is_active, username, password, role } = req.body;
    try {
        if (password && password.trim() !== '') {
            await pool.run(
                'UPDATE users SET name = ?, phone_number = ?, is_active = ?, username = ?, role = ?, password = ? WHERE id = ?',
                [name, phone_number, is_active, username, role, password, req.params.id]
            );
        } else {
            await pool.run(
                'UPDATE users SET name = ?, phone_number = ?, is_active = ?, username = ?, role = ? WHERE id = ?',
                [name, phone_number, is_active, username, role, req.params.id]
            );
        }
        res.json({ success: true, message: 'Data pengguna berhasil diperbarui.' });
    } catch (err) {
        if (err.code === 'SQLITE_CONSTRAINT') return res.status(400).json({ success: false, message: 'Gagal: ' + err.message });
        res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE user
app.delete('/api/admin/users/:id', async (req, res) => {
    try {
        await pool.run('DELETE FROM users WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Pengguna berhasil dihapus.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET list tukang untuk dropdown orders
app.get('/api/admin/technicians', async (req, res) => {
    try {
        const rows = await pool.all("SELECT id, name, phone_number FROM users WHERE role = 'technician' AND is_active = 1");
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ============================================================
// SETTINGS API
// ============================================================

// GET /api/settings - Public
app.get('/api/settings', async (req, res) => {
    try {
        const rows = await pool.all('SELECT setting_key, setting_value FROM settings');
        const settings = {};
        rows.forEach(r => { settings[r.setting_key] = r.setting_value; });
        res.json({ success: true, data: settings });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/admin/settings - Update settings
app.put('/api/admin/settings', async (req, res) => {
    const settingsToUpdate = req.body;
    try {
        for (const [key, value] of Object.entries(settingsToUpdate)) {
            await pool.run(
                'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON CONFLICT(setting_key) DO UPDATE SET setting_value = ?',
                [key, value, value]
            );
        }
        res.json({ success: true, message: 'Pengaturan berhasil disimpan.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/admin/settings/logo - Upload logo
app.post('/api/admin/settings/logo', upload.single('logo'), async (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, message: 'File logo tidak ditemukan.' });
    
    try {
        const logoUrl = `/uploads/${req.file.filename}`;
        await pool.run(
            'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON CONFLICT(setting_key) DO UPDATE SET setting_value = ?',
            ['company_logo', logoUrl, logoUrl]
        );
        res.json({ success: true, message: 'Logo berhasil diupload.', logoUrl });
    } catch (err) {
        if (req.file) fs.unlink(req.file.path, () => {});
        res.status(500).json({ success: false, message: err.message });
    }
});

// ============================================================
// ADMIN API - SYSTEM (Backup, Restore, Update)
// ============================================================
const { exec } = require('child_process');
const os = require('os');
const uploadBackup = multer({ dest: os.tmpdir() });

app.get('/api/admin/backup', (req, res) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-tukangsiaga-${timestamp}.tar.gz`;
    const filepath = path.join(__dirname, filename);
    
    // Backup database.sqlite dan folder public/uploads
    exec(`tar -czf "${filename}" database.sqlite public/uploads`, (error) => {
        if (error) {
            console.error('[Backup Error]', error);
            return res.status(500).json({ success: false, message: 'Gagal membuat backup: ' + error.message });
        }
        res.download(filepath, filename, (err) => {
            fs.unlink(filepath, () => {}); // Hapus file tar.gz setelah di-download
        });
    });
});

app.post('/api/admin/restore', uploadBackup.single('backup_file'), (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, message: 'File backup wajib diunggah.' });
    
    const filepath = req.file.path;
    
    // Ekstrak menimpa file lokal
    exec(`tar -xzf "${filepath}"`, (error) => {
        fs.unlink(filepath, () => {}); // Hapus file zip/tar
        if (error) {
            console.error('[Restore Error]', error);
            return res.status(500).json({ success: false, message: 'Gagal merestore backup: ' + error.message });
        }
        
        // Berhasil, restart server
        res.json({ success: true, message: 'Sistem berhasil di-restore. Server direstart otomatis...' });
        setTimeout(() => process.exit(0), 1500); 
    });
});

app.post('/api/admin/update', (req, res) => {
    exec('git pull', (error, stdout, stderr) => {
        if (error) {
            console.error('[Git Pull Error]', error, stderr);
            return res.status(500).json({ success: false, message: 'Gagal update dari Git: ' + error.message });
        }
        res.json({ success: true, message: 'Pembaruan berhasil ditarik. Server direstart otomatis...', log: stdout });
        setTimeout(() => process.exit(0), 1500);
    });
});

// ============================================================
// CATCH-ALL
// ============================================================
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Tukang Siaga berjalan di http://localhost:${port}`);
});

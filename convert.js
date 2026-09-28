const fs = require('fs');
const path = require('path');

function convert() {
    let code = fs.readFileSync('server.js', 'utf8');

    code = code.replace("const mysql = require('mysql2/promise');", 
                        "const sqlite3 = require('sqlite3');\nconst { open } = require('sqlite');");

    const poolRegex = /const pool = mysql\.createPool\(\{[\s\S]*?\}\);/m;
    const sqliteSetup = `let pool;
(async () => {
    pool = await open({
        filename: path.join(__dirname, 'database.sqlite'),
        driver: sqlite3.Database
    });
    // Initialize tables
    await pool.exec(\`
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
    \`);
    
    // Seed initial data if empty
    const userCount = await pool.get('SELECT COUNT(*) as c FROM users');
    if (userCount.c === 0) {
        await pool.run("INSERT INTO users (username, password, role, name) VALUES ('admin', 'admin123', 'admin', 'Administrator')");
        await pool.run("INSERT INTO users (username, password, role, name, phone_number) VALUES ('tukang', 'tukang123', 'technician', 'Budi Teknisi', '081234567890')");
        
        await pool.run(\`INSERT INTO services (name, description, starting_price, icon) VALUES
        ('Atap & Genteng Bocor', 'Perbaikan kebocoran atap, genteng melorot, dan pembersihan talang air.', 150000, 'home'),
        ('Plafon & Gypsum', 'Perbaikan plafon jebol, rembes, atau pemasangan partisi gypsum baru.', 200000, 'grid'),
        ('Saluran Air & Pipa', 'Mengatasi wastafel mampet, keran bocor, dan instalasi pipa air bersih/kotor.', 100000, 'droplet'),
        ('Kelistrikan', 'Pemasangan stop kontak, perbaikan korsleting, dan instalasi lampu rumah.', 150000, 'zap'),
        ('Cat Rumah', 'Pengecatan dinding interior dan eksterior dengan cat berkualitas pilihan.', 300000, 'paint-roller')\`);

        await pool.run(\`INSERT INTO gallery (image_url, title, category) VALUES
        ('https://images.unsplash.com/photo-1632759145351-1d592919f522?auto=format&fit=crop&w=600&q=80', 'Perbaikan Genteng Bocor', 'Atap & Genteng Bocor'),
        ('https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80', 'Instalasi Plafon Gypsum', 'Plafon & Gypsum'),
        ('https://images.unsplash.com/photo-1607472586893-edb57cb3b4e1?auto=format&fit=crop&w=600&q=80', 'Perbaikan Pipa & Saluran', 'Saluran Air & Pipa'),
        ('https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=600&q=80', 'Pengecatan Dinding', 'Cat Rumah'),
        ('https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&w=600&q=80', 'Renovasi Kamar Mandi', 'Umum'),
        ('https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=600&q=80', 'Pemasangan Keramik', 'Umum')\`);
        
        await pool.run(\`INSERT INTO settings (setting_key, setting_value) VALUES
        ('company_name', 'Tukang Siaga'),
        ('company_email', 'einvagroup@gmail.com'),
        ('company_phone', '0822-9863-3300'),
        ('company_address', 'Jakarta Pusat'),
        ('company_coverage', 'Jakarta, Bogor, Depok, Tangerang, Bekasi'),
        ('gallery_categories', 'Umum, Saluran Air & Pipa, Plafon & Gypsum, Atap & Genteng Bocor, Instalasi Listrik, Cat Rumah'),
        ('company_logo', ''),
        ('hero_title', 'Perbaikan Rumah Cepat, Transparan, & Bergaransi.'),
        ('hero_subtitle', 'Pantau setiap tahap pekerjaan secara real-time. Harga jelas di awal, tanpa biaya tersembunyi.'),
        ('about_text', 'Platform jasa perbaikan rumah terpercaya. Teknisi profesional terverifikasi, harga transparan, hasil bergaransi.')\`);
    }
})();`;

    code = code.replace(poolRegex, sqliteSetup);

    code = code.replace(/const \[result\] = await pool\.query\([\s\S]*?`INSERT INTO orders[\s\S]*?\);/, 
        `const result = await pool.run(
            \`INSERT INTO orders (job_id, customer_name, customer_whatsapp, customer_address, service_type, problem_description, initial_photo_url, current_status)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')\`,
            [jobId, name, whatsapp, address, service, description, photoUrl]
        );`);

    code = code.replace(/await pool\.query\(\s*`INSERT INTO job_progress.*?`,\s*\[result\.insertId\]\s*\);/, 
        "await pool.run(`INSERT INTO job_progress (order_id, step_status, notes) VALUES (?, 'order_received', 'Pesanan masuk dan sedang menunggu konfirmasi admin.')`, [result.lastID]);");

    code = code.replaceAll("const [orders] = await pool.query('SELECT * FROM orders WHERE job_id = ?'", "const orders = await pool.all('SELECT * FROM orders WHERE job_id = ?'");
    code = code.replaceAll("const [timeline] = await pool.query('SELECT * FROM job_progress WHERE order_id = ? ORDER BY created_at ASC'", "const timeline = await pool.all('SELECT * FROM job_progress WHERE order_id = ? ORDER BY created_at ASC'");
    code = code.replaceAll("const [techs] = await pool.query('SELECT id, name, phone_number FROM users WHERE id = ?'", "const techs = await pool.all('SELECT id, name, phone_number FROM users WHERE id = ?'");
    
    code = code.replaceAll("const [rows] = await pool.query('SELECT * FROM services ORDER BY id ASC');", "const rows = await pool.all('SELECT * FROM services ORDER BY id ASC');");
    code = code.replaceAll("const [rows] = await pool.query('SELECT * FROM gallery ORDER BY id DESC');", "const rows = await pool.all('SELECT * FROM gallery ORDER BY id DESC');");
    
    code = code.replaceAll(`const [rows] = await pool.query(\`
            SELECT o.*, u.name as technician_name
            FROM orders o
            LEFT JOIN users u ON o.technician_id = u.id
            ORDER BY o.created_at DESC
        \`);`, `const rows = await pool.all(\`
            SELECT o.*, u.name as technician_name
            FROM orders o
            LEFT JOIN users u ON o.technician_id = u.id
            ORDER BY o.created_at DESC
        \`);`);

    code = code.replaceAll(`const [orders] = await pool.query(\`
            SELECT o.*, u.name as technician_name, u.phone_number as technician_phone
            FROM orders o
            LEFT JOIN users u ON o.technician_id = u.id
            WHERE o.id = ?
        \`, [req.params.id]);`, `const orders = await pool.all(\`
            SELECT o.*, u.name as technician_name, u.phone_number as technician_phone
            FROM orders o
            LEFT JOIN users u ON o.technician_id = u.id
            WHERE o.id = ?
        \`, [req.params.id]);`);

    code = code.replaceAll("const [services] = await pool.query('SELECT * FROM services WHERE name = ?', [order.service_type]);", "const services = await pool.all('SELECT * FROM services WHERE name = ?', [order.service_type]);");
    
    code = code.replaceAll("const [rows] = await pool.query(\"SELECT id, name, phone_number FROM users WHERE role = 'technician' AND is_active = 1\");", "const rows = await pool.all(\"SELECT id, name, phone_number FROM users WHERE role = 'technician' AND is_active = 1\");");
    code = code.replaceAll("const [rows] = await pool.query('SELECT setting_key, setting_value FROM settings');", "const rows = await pool.all('SELECT setting_key, setting_value FROM settings');");
    
    code = code.replaceAll("await pool.query(", "await pool.run(");

    code = code.replace(`await pool.run(
                'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
                [key, value, value]
            );`, `await pool.run(
                'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON CONFLICT(setting_key) DO UPDATE SET setting_value = ?',
                [key, value, value]
            );`);
    code = code.replace(`await pool.run(
            'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
            ['company_logo', logoUrl, logoUrl]
        );`, `await pool.run(
            'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON CONFLICT(setting_key) DO UPDATE SET setting_value = ?',
            ['company_logo', logoUrl, logoUrl]
        );`);

    code = code.replace(/\/\/ Auto-Migration[\s\S]*?async function runMigrations\(\) \{[\s\S]*?\}/m, "");
    code = code.replace("await runMigrations();", "");

    fs.writeFileSync('server.js', code);
}
convert();

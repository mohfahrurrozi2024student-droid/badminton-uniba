const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { initDatabase, saveDatabase, getDatabase } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'badminton-uniba-secret-key-2025';

const UPLOAD_DIR = process.env.DATA_PATH
  ? path.join(process.env.DATA_PATH, 'uploads')
  : path.join(__dirname, 'public', 'uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }
});

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

app.use(cors());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOAD_DIR));

function authenticateToken(req, res, next) {
  const token = req.cookies.token || req.headers['authorization'];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}

app.post('/api/register', upload.fields([
  { name: 'foto', maxCount: 1 },
  { name: 'file_siakad', maxCount: 1 },
  { name: 'file_tiktok', maxCount: 1 },
  { name: 'file_instagram', maxCount: 1 }
]), (req, res) => {
  try {
    const { nama, username_tiktok, username_ig, jurusan, angkatan, no_hp, alasan } = req.body;
    const db = getDatabase();

    const foto = req.files['foto'] ? '/uploads/' + req.files['foto'][0].filename : null;
    const file_siakad = req.files['file_siakad'] ? '/uploads/' + req.files['file_siakad'][0].filename : null;
    const file_tiktok = req.files['file_tiktok'] ? '/uploads/' + req.files['file_tiktok'][0].filename : null;
    const file_instagram = req.files['file_instagram'] ? '/uploads/' + req.files['file_instagram'][0].filename : null;

    db.run(
      `INSERT INTO registrations (nama, foto, username_tiktok, username_ig, jurusan, angkatan, no_hp, alasan, file_siakad, file_tiktok, file_instagram)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [nama, foto, username_tiktok, username_ig, jurusan, angkatan, no_hp, alasan, file_siakad, file_tiktok, file_instagram]
    );

    saveDatabase();

    res.json({ success: true, message: 'Pendaftaran berhasil!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  const db = getDatabase();

  const stmt = db.prepare("SELECT * FROM admin WHERE username = ?");
  stmt.bind([username]);
  let row = null;
  if (stmt.step()) {
    row = stmt.getAsObject();
  }
  stmt.free();

  if (!row) {
    return res.status(401).json({ error: 'Username atau password salah' });
  }

  if (!bcrypt.compareSync(password, row.password)) {
    return res.status(401).json({ error: 'Username atau password salah' });
  }

  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '24h' });
  res.cookie('token', token, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });
  res.json({ success: true, token });
});

app.post('/api/admin/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});

app.get('/api/admin/check', authenticateToken, (req, res) => {
  res.json({ authenticated: true, username: req.user.username });
});

app.get('/api/admin/data', authenticateToken, (req, res) => {
  const db = getDatabase();
  const result = db.exec("SELECT * FROM registrations ORDER BY created_at DESC");

  const columns = ['id', 'nama', 'foto', 'username_tiktok', 'username_ig', 'jurusan', 'angkatan', 'no_hp', 'alasan', 'file_siakad', 'file_tiktok', 'file_instagram', 'created_at'];
  const data = result.length > 0 ? result[0].values.map(row => {
    const obj = {};
    columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj;
  }) : [];

  res.json(data);
});

app.get('/api/admin/data/csv', authenticateToken, (req, res) => {
  const db = getDatabase();
  const result = db.exec("SELECT * FROM registrations ORDER BY created_at DESC");

  const headers = ['ID', 'Nama', 'Foto', 'Username TikTok', 'Username IG', 'Jurusan', 'Angkatan', 'No. HP', 'Alasan Bergabung', 'File Siakad', 'File TikTok', 'File Instagram', 'Tanggal Daftar'];
  let csv = headers.join(',') + '\n';

  if (result.length > 0) {
    result[0].values.forEach(row => {
      const escaped = row.map(val => {
        if (val === null || val === undefined) return '';
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
      });
      csv += escaped.join(',') + '\n';
    });
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=data-pendaftaran-badminton.csv');
  res.send(csv);
});

app.get('/api/admin/data/delete/:id', authenticateToken, (req, res) => {
  const db = getDatabase();
  db.run("DELETE FROM registrations WHERE id = ?", [req.params.id]);
  saveDatabase();
  res.json({ success: true });
});

initDatabase().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
    console.log(`Admin panel: http://localhost:${PORT}/admin`);
  });
});

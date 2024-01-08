const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const mysql = require('mysql2');
const session = require('express-session');

const app = express();
const port = 3001;

// Setup MySQL connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'password',
  database: 'system_dokumen',
});

db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL: ', err);
  } else {
    console.log('Connected to MySQL');
  }
});

// Express middleware setup
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Setup multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Middleware untuk memeriksa apakah pengguna sudah login
const checkAuth = (req, res, next) => {
    if (req.session && req.session.role) {
      next();
    } else {
      res.status(403).send('Access denied');
    }
  };


// Inisialisasi session
app.use(session({
  secret: 'your-secret-key',
  resave: true,
  saveUninitialized: true
}));

// Route untuk tampilan login
app.get('/login', (req, res) => {
  res.sendFile(__dirname + '/views/login.html');
});

// Route untuk menangani permintaan login
app.post('/login', (req, res) => {
    const { username, password } = req.body;
  
    // Contoh sederhana autentikasi
    if (username === 'admin' && password === 'adminpassword') {
      req.session.role = 'admin';
      res.redirect('/dashboard/admin');
    } else if (username === 'user' && password === 'userpassword') {
      req.session.role = 'user';
      res.redirect('/dashboard/user');
    } else {
      res.status(401).send('Invalid credentials');
    }
  });

// Route untuk tampilan dashboard admin
app.get('/dashboard/admin', checkAuth, (req, res) => {
    res.sendFile(__dirname + '/views/dashboard_admin.html');
  });

// Route untuk tampilan dashboard user
app.get('/dashboard/user', checkAuth, (req, res) => {
  res.sendFile(__dirname + '/views/dashboard_user.html');
});

// Route untuk tampilan upload dokumen (hanya admin)
app.get('/upload', checkAuth, (req, res) => {
  res.sendFile(__dirname + '/views/upload.html');
});

// Route untuk menangani upload dokumen (hanya admin)
app.post('/upload', checkAuth, upload.single('file'), (req, res) => {
  console.log('Received upload request:', req.body);

  const { title, description, uploader } = req.body;
  const fileData = req.file.buffer;

  console.log('File data received:', fileData);

  db.query(
    'INSERT INTO documents (title, description, uploader, file_data) VALUES (?, ?, ?, ?)',
    [title, description, uploader, fileData],
    (err, results) => {
      if (err) {
        console.error('Error uploading document to database: ', err);
        res.status(500).json({ error: 'Internal Server Error' });
      } else {
        console.log('Document uploaded to database successfully:', results);
        res.json({ message: 'Document uploaded successfully' });
      }
    }
  );
});


// Route untuk mendapatkan daftar dokumen
app.get('/documents', checkAuth, (req, res) => {
    db.query('SELECT * FROM documents', (err, results) => {
      if (err) {
        console.error('Error fetching documents from database: ', err);
        res.status(500).json({ error: 'Internal Server Error' });
      } else {
        res.json(results);
      }
    });
  });
  

// Route untuk mengunduh dokumen
app.get('/download/:id', checkAuth, (req, res) => {
  const documentId = req.params.id;

  db.query('SELECT * FROM documents WHERE id = ?', [documentId], (err, results) => {
    if (err) {
      console.error('Error fetching document: ', err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      const document = results[0];
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename=${document.title}.pdf`);
      res.send(Buffer.from(document.file_data, 'binary'));
    }
  });
});

// Route untuk menghapus dokumen
app.delete('/delete/:id', checkAuth, (req, res) => {
    const documentId = req.params.id;
  
    db.query('DELETE FROM documents WHERE id = ?', [documentId], (err, results) => {
      if (err) {
        console.error('Error deleting document from database: ', err);
        res.status(500).json({ error: 'Internal Server Error' });
      } else {
        console.log('Document deleted from database:', results);
        res.json({ message: 'Document deleted successfully' });
      }
    });
  });

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

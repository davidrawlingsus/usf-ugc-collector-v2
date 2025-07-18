const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const sqlite3 = require('sqlite3').verbose();
const sharp = require('sharp');
const heicConvert = require('heic-convert');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Add compression for better performance
const compression = require('compression');
app.use(compression());

// Use persistent storage paths for Railway Pro
const persistentDir = process.env.RAILWAY_VOLUME_MOUNT_PATH ? '/app' : './';
const dataDir = path.join(persistentDir, 'data');
const uploadsDir = path.join(persistentDir, 'uploads');

// Log the paths being used for debugging
console.log('🚀 Railway Pro Configuration:');
console.log('Persistent directory:', persistentDir);
console.log('Data directory:', dataDir);
console.log('Uploads directory:', uploadsDir);
console.log('Environment:', process.env.NODE_ENV || 'development');

// Create directories if they don't exist
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Function to convert HEIC to JPEG
async function convertHeicToJpeg(inputBuffer) {
    try {
        const outputBuffer = await heicConvert({
            buffer: inputBuffer,
            format: 'JPEG',
            quality: 0.9
        });
        return outputBuffer;
    } catch (error) {
        console.error('Error converting HEIC to JPEG:', error);
        return null;
    }
}

// Configure multer for memory storage (we'll store in DB)
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 500 * 1024 * 1024, // 500MB limit for Railway Pro
        files: 1 // Single file uploads
    },
    fileFilter: function (req, file, cb) {
        // Allow videos and images (including HEIC)
        if (file.mimetype.startsWith('video/') || 
            file.mimetype.startsWith('image/') || 
            file.mimetype === 'image/heic' || 
            file.mimetype === 'image/heif') {
            cb(null, true);
        } else {
            cb(new Error('Only video and image files are allowed!'), false);
        }
    }
});

// Initialize SQLite database with persistent path
const dbPath = path.join(dataDir, 'testimonials.db');
const db = new sqlite3.Database(dbPath);

// Set database timeout for high volume
db.configure('busyTimeout', 30000);

// Create testimonials table with media BLOB storage
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS testimonials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT UNIQUE,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        testimonial_text TEXT,
        media_file TEXT,
        media_type TEXT,
        media_data BLOB,
        first_name TEXT,
        last_name TEXT,
        current_flight_time TEXT,
        past_flight_time TEXT,
        use_case TEXT,
        weather_type TEXT,
        extreme_conditions TEXT,
        testimonial_type TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // Add media_data column if it doesn't exist (for existing databases)
    db.run(`ALTER TABLE testimonials ADD COLUMN media_data BLOB`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
            console.error('Error adding media_data column:', err);
        }
    });
});

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/video_collector.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'video_collector.html'));
});

app.get('/photo_testimonial.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'photo_testimonial.html'));
});

app.get('/written_testimonial.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'written_testimonial.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Serve media files from database
app.get('/uploads/:filename', (req, res) => {
    const filename = req.params.filename;
    
    db.get('SELECT media_data, media_type FROM testimonials WHERE media_file = ?', [filename], (err, row) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send('Database error');
        }
        
        if (!row || !row.media_data) {
            return res.status(404).send('File not found');
        }
        
        // Set appropriate headers
        res.setHeader('Content-Type', row.media_type);
        res.setHeader('Content-Length', row.media_data.length);
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
        
        // Send the binary data
        res.send(row.media_data);
    });
});

// Handle video testimonial submission
app.post('/submit-video-testimonial', upload.single('video'), (req, res) => {
    try {
        const {
            name,
            email,
            first_name,
            last_name,
            current_flight_time,
            past_flight_time,
            use_case,
            weather_type,
            extreme_conditions
        } = req.body;

        const uuid = uuidv4();
        const mediaFile = req.file ? `${Date.now()}-${uuidv4()}${path.extname(req.file.originalname)}` : null;
        const mediaType = req.file ? req.file.mimetype : null;
        const mediaData = req.file ? req.file.buffer : null;

        const stmt = db.prepare(`
            INSERT INTO testimonials (
                uuid, name, email, media_file, media_type, media_data,
                first_name, last_name, current_flight_time, past_flight_time,
                use_case, weather_type, extreme_conditions, testimonial_type
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
            uuid, name, email, mediaFile, mediaType, mediaData,
            first_name, last_name, current_flight_time, past_flight_time,
            use_case, weather_type, extreme_conditions, 'video'
        );

        stmt.finalize();

        res.json({
            success: true,
            message: 'Video testimonial submitted successfully!',
            uuid: uuid
        });

    } catch (error) {
        console.error('Error submitting video testimonial:', error);
        res.status(500).json({
            success: false,
            message: 'Error submitting testimonial'
        });
    }
});

// Handle photo testimonial submission
app.post('/submit-photo-testimonial', upload.single('photo'), async (req, res) => {
    try {
        const {
            name,
            email,
            testimonial,
            first_name,
            last_name,
            current_flight_time,
            past_flight_time,
            use_case,
            weather_type,
            extreme_conditions
        } = req.body;

        const uuid = uuidv4();
        let mediaFile = req.file ? `${Date.now()}-${uuidv4()}${path.extname(req.file.originalname)}` : null;
        let mediaType = req.file ? req.file.mimetype : null;
        let mediaData = req.file ? req.file.buffer : null;

        // Convert HEIC to JPEG if needed
        if (req.file && (req.file.mimetype === 'image/heic' || req.file.mimetype === 'image/heif')) {
            const convertedBuffer = await convertHeicToJpeg(req.file.buffer);
            if (convertedBuffer) {
                mediaData = convertedBuffer;
                mediaType = 'image/jpeg';
                mediaFile = mediaFile.replace(path.extname(mediaFile), '.jpg');
            }
        }

        const stmt = db.prepare(`
            INSERT INTO testimonials (
                uuid, name, email, testimonial_text, media_file, media_type, media_data,
                first_name, last_name, current_flight_time, past_flight_time,
                use_case, weather_type, extreme_conditions, testimonial_type
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
            uuid, name, email, testimonial, mediaFile, mediaType, mediaData,
            first_name, last_name, current_flight_time, past_flight_time,
            use_case, weather_type, extreme_conditions, 'photo'
        );

        stmt.finalize();

        res.json({
            success: true,
            message: 'Photo testimonial submitted successfully!',
            uuid: uuid
        });

    } catch (error) {
        console.error('Error submitting photo testimonial:', error);
        res.status(500).json({
            success: false,
            message: 'Error submitting testimonial'
        });
    }
});

// Handle written testimonial submission
app.post('/submit-written-testimonial', (req, res) => {
    try {
        const {
            name,
            email,
            testimonial,
            first_name,
            last_name,
            current_flight_time,
            past_flight_time,
            use_case,
            weather_type,
            extreme_conditions
        } = req.body;

        const uuid = uuidv4();

        const stmt = db.prepare(`
            INSERT INTO testimonials (
                uuid, name, email, testimonial_text, first_name, last_name,
                current_flight_time, past_flight_time, use_case, weather_type,
                extreme_conditions, testimonial_type
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
            uuid, name, email, testimonial,
            first_name, last_name, current_flight_time, past_flight_time,
            use_case, weather_type, extreme_conditions, 'written'
        );

        stmt.finalize();

        res.json({
            success: true,
            message: 'Written testimonial submitted successfully!',
            uuid: uuid
        });

    } catch (error) {
        console.error('Error submitting written testimonial:', error);
        res.status(500).json({
            success: false,
            message: 'Error submitting testimonial'
        });
    }
});

// Get all testimonials (for admin purposes)
app.get('/api/testimonials', (req, res) => {
    db.all('SELECT * FROM testimonials ORDER BY created_at DESC', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Get testimonial by UUID
app.get('/api/testimonial/:uuid', (req, res) => {
    const { uuid } = req.params;
    db.get('SELECT * FROM testimonials WHERE uuid = ?', [uuid], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ error: 'Testimonial not found' });
            return;
        }
        res.json(row);
    });
});

// Health check endpoint for monitoring
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        database: dbPath,
        uploads: uploadsDir,
        features: [
            'HEIC support with automatic conversion',
            'High volume optimized',
            'Railway Pro persistent storage',
            'Compression enabled',
            'Media stored as BLOB in database'
        ]
    });
});

// Test endpoint for HEIC conversion
app.get('/api/test-heic', (req, res) => {
    res.json({
        message: 'HEIC support is enabled',
        features: [
            'HEIC files are accepted in uploads',
            'Automatic conversion to JPEG',
            'Preview support in admin dashboard',
            'Media stored as BLOB in database'
        ]
    });
});

// Delete testimonial by UUID
app.delete('/api/testimonial/:uuid', (req, res) => {
    const { uuid } = req.params;
    
    // Delete the testimonial from database (media data is automatically removed)
    db.run('DELETE FROM testimonials WHERE uuid = ?', [uuid], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        res.json({
            success: true,
            message: 'Testimonial deleted successfully'
        });
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Error:', error);
    res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`💾 Database: ${dbPath}`);
    console.log(`📁 Uploads: ${uploadsDir}`);
    console.log(`🌐 Visit http://localhost:${PORT} to view the testimonial forms`);
    console.log(`⚡ Optimized for high volume with Railway Pro`);
    console.log(`💾 Media files now stored as BLOB in database for persistence`);
}); 
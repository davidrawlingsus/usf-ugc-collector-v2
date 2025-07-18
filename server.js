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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Use persistent storage paths
const persistentDir = process.env.RAILWAY_VOLUME_MOUNT_PATH ? '/app' : './';
const dataDir = path.join(persistentDir, 'data');
const uploadsDir = path.join(persistentDir, 'uploads');

// Create directories if they don't exist
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Function to convert HEIC to JPEG
async function convertHeicToJpeg(inputPath, outputPath) {
    try {
        const inputBuffer = fs.readFileSync(inputPath);
        const outputBuffer = await heicConvert({
            buffer: inputBuffer,
            format: 'JPEG',
            quality: 0.9
        });
        fs.writeFileSync(outputPath, outputBuffer);
        return true;
    } catch (error) {
        console.error('Error converting HEIC to JPEG:', error);
        return false;
    }
}

app.use('/uploads', express.static(uploadsDir));

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
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

// Create testimonials table
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS testimonials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT UNIQUE,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        testimonial_text TEXT,
        media_file TEXT,
        media_type TEXT,
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
        const mediaFile = req.file ? req.file.filename : null;
        const mediaType = req.file ? req.file.mimetype : null;

        const stmt = db.prepare(`
            INSERT INTO testimonials (
                uuid, name, email, media_file, media_type, first_name, last_name,
                current_flight_time, past_flight_time, use_case, weather_type,
                extreme_conditions, testimonial_type
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
            uuid, name, email, mediaFile, mediaType,
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
        let mediaFile = req.file ? req.file.filename : null;
        let mediaType = req.file ? req.file.mimetype : null;

        // Convert HEIC to JPEG if needed
        if (req.file && (req.file.mimetype === 'image/heic' || req.file.mimetype === 'image/heif')) {
            const originalPath = req.file.path;
            const jpegPath = originalPath.replace(path.extname(originalPath), '.jpg');
            
            const success = await convertHeicToJpeg(originalPath, jpegPath);
            if (success) {
                // Update file info
                mediaFile = path.basename(jpegPath);
                mediaType = 'image/jpeg';
                
                // Remove original HEIC file
                fs.unlinkSync(originalPath);
            }
        }

        const stmt = db.prepare(`
            INSERT INTO testimonials (
                uuid, name, email, testimonial_text, media_file, media_type,
                first_name, last_name, current_flight_time, past_flight_time,
                use_case, weather_type, extreme_conditions, testimonial_type
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
            uuid, name, email, testimonial, mediaFile, mediaType,
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

// Test endpoint for HEIC conversion
app.get('/api/test-heic', (req, res) => {
    res.json({
        message: 'HEIC support is enabled',
        features: [
            'HEIC files are accepted in uploads',
            'Automatic conversion to JPEG',
            'Preview support in admin dashboard',
            'Original HEIC files are removed after conversion'
        ]
    });
});

// Delete testimonial by UUID
app.delete('/api/testimonial/:uuid', (req, res) => {
    const { uuid } = req.params;
    
    // First get the testimonial to find associated media file
    db.get('SELECT * FROM testimonials WHERE uuid = ?', [uuid], (err, testimonial) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!testimonial) {
            res.status(404).json({ error: 'Testimonial not found' });
            return;
        }
        
        // Delete the testimonial from database
        db.run('DELETE FROM testimonials WHERE uuid = ?', [uuid], function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            
            // Delete associated media file if it exists
            if (testimonial.media_file) {
                const filePath = path.join(uploadsDir, testimonial.media_file);
                fs.unlink(filePath, (err) => {
                    // Don't fail if file deletion fails (file might not exist)
                    if (err) {
                        console.log('Warning: Could not delete media file:', err.message);
                    }
                });
            }
            
            res.json({
                success: true,
                message: 'Testimonial deleted successfully',
                deletedId: testimonial.id
            });
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
    console.log(`Server running on port ${PORT}`);
    console.log(`Visit http://localhost:${PORT} to view the testimonial forms`);
}); 
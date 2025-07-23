const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');
const heicConvert = require('heic-convert');
const { db, run, get, all, prepare, initPromise } = require('./database');

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

// Database initialization is handled in database.js

// Middleware to ensure database is ready
app.use(async (req, res, next) => {
    try {
        await initPromise;
        next();
    } catch (error) {
        console.error('Database not ready:', error);
        res.status(503).json({ error: 'Database not ready' });
    }
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

app.get('/admin.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/assets', (req, res) => {
    res.sendFile(path.join(__dirname, 'assets.html'));
});

app.get('/asset-examples', (req, res) => {
    res.sendFile(path.join(__dirname, 'asset-usage-example.html'));
});

app.get('/testimonial_email.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'testimonial_email.html'));
});

app.get('/email_draft.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'email_draft.html'));
});

app.get('/terms.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'terms.html'));
});

app.get('/terms', (req, res) => {
    res.sendFile(path.join(__dirname, 'terms.html'));
});

app.get('/email-draft', (req, res) => {
    const fs = require('fs');
    const path = require('path');
    
    try {
        const filePath = path.join(__dirname, 'email_draft.html');
        const content = fs.readFileSync(filePath, 'utf8');
        res.setHeader('Content-Type', 'text/html');
        res.send(content);
    } catch (error) {
        console.error('Error reading email draft:', error);
        res.status(500).send('Error loading email template');
    }
});

app.get('/test-email', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Test Email</title>
        </head>
        <body>
            <h1>Test Email Template</h1>
            <p>This is a test to see if the route is working.</p>
        </body>
        </html>
    `);
});

// Serve media files from database
app.get('/uploads/:filename', (req, res) => {
    const filename = req.params.filename;
    
    get('SELECT media_data, media_type FROM testimonials WHERE media_file = ?', [filename], (err, row) => {
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

// Serve assets from database
app.get('/assets/:uuid', (req, res) => {
    const uuid = req.params.uuid;
    
    get('SELECT file_data, mime_type, file_name FROM assets WHERE uuid = ?', [uuid], (err, row) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send('Database error');
        }
        
        if (!row || !row.file_data) {
            return res.status(404).send('Asset not found');
        }
        
        // Set appropriate headers
        res.setHeader('Content-Type', row.mime_type);
        res.setHeader('Content-Length', row.file_data.length);
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
        res.setHeader('Content-Disposition', `inline; filename="${row.file_name}"`);
        
        // Send the binary data
        res.send(row.file_data);
    });
});

// Upload asset endpoint
app.post('/api/assets/upload', upload.single('asset'), async (req, res) => {
    try {
        const { name, description, asset_type } = req.body;
        
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }
        
        const uuid = uuidv4();
        const fileSize = req.file.buffer.length;
        
        const stmt = prepare(`
            INSERT INTO assets (
                uuid, name, description, asset_type, file_name, mime_type, file_data, file_size
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        stmt.run([
            uuid, name, description, asset_type, req.file.originalname, 
            req.file.mimetype, req.file.buffer, fileSize
        ], (err) => {
            if (err) {
                console.error('Error inserting asset:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Error uploading asset'
                });
            }
            
            res.json({
                success: true,
                message: 'Asset uploaded successfully!',
                uuid: uuid,
                name: name,
                asset_type: asset_type,
                file_size: fileSize
            });
        });
        
    } catch (error) {
        console.error('Error uploading asset:', error);
        res.status(500).json({
            success: false,
            message: 'Error uploading asset'
        });
    }
});

// Get all assets
app.get('/api/assets', (req, res) => {
    all('SELECT id, uuid, name, description, asset_type, file_name, mime_type, file_size, created_at, updated_at FROM assets ORDER BY created_at DESC', [], (err, rows) => {
        if (err) {
            console.error('Error fetching assets:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows || []);
    });
});

// Get asset by UUID
app.get('/api/assets/:uuid', (req, res) => {
    const { uuid } = req.params;
    get('SELECT id, uuid, name, description, asset_type, file_name, mime_type, file_size, created_at, updated_at FROM assets WHERE uuid = ?', [uuid], (err, row) => {
        if (err) {
            console.error('Error fetching asset:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ error: 'Asset not found' });
            return;
        }
        res.json(row);
    });
});

// Update asset metadata
app.put('/api/assets/:uuid', (req, res) => {
    const { uuid } = req.params;
    const { name, description, asset_type } = req.body;
    
    run('UPDATE assets SET name = ?, description = ?, asset_type = ?, updated_at = CURRENT_TIMESTAMP WHERE uuid = ?', 
        [name, description, asset_type, uuid], function(err) {
        if (err) {
            console.error('Error updating asset:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        
        res.json({
            success: true,
            message: 'Asset updated successfully'
        });
    });
});

// Delete asset
app.delete('/api/assets/:uuid', (req, res) => {
    const { uuid } = req.params;
    
    run('DELETE FROM assets WHERE uuid = ?', [uuid], function(err) {
        if (err) {
            console.error('Error deleting asset:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        
        res.json({
            success: true,
            message: 'Asset deleted successfully'
        });
    });
});

// Handle video testimonial submission
app.post('/submit-video-testimonial', upload.single('video'), (req, res) => {
    try {
        console.log('📹 Video testimonial submission received');
        console.log('📋 Request body:', req.body);
        console.log('📁 File:', req.file ? req.file.originalname : 'No file');
        
        const {
            name,
            email,
            first_name,
            last_name,
            current_flight_time,
            past_flight_time,
            use_case,
            weather_type,
            extreme_conditions,
            reason_for_flying
        } = req.body;

        const uuid = uuidv4();
        const mediaFile = req.file ? `${Date.now()}-${uuidv4()}${path.extname(req.file.originalname)}` : null;
        const mediaType = req.file ? req.file.mimetype : null;
        const mediaData = req.file ? req.file.buffer : null;

        console.log('💾 Preparing to insert video testimonial into database');
        console.log('🔑 UUID:', uuid);
        console.log('📝 Data:', {
            name, email, mediaFile, mediaType,
            first_name, last_name, current_flight_time, past_flight_time,
            use_case, weather_type, extreme_conditions, reason_for_flying
        });
        
        const stmt = prepare(`
            INSERT INTO testimonials (
                uuid, name, email, media_file, media_type, media_data,
                first_name, last_name, current_flight_time, past_flight_time,
                use_case, weather_type, extreme_conditions, reason_for_flying, testimonial_type
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run([
            uuid, name, email, mediaFile, mediaType, mediaData,
            first_name, last_name, current_flight_time, past_flight_time,
            use_case, weather_type, extreme_conditions, reason_for_flying, 'video'
        ], (err) => {
            if (err) {
                console.error('❌ Error inserting video testimonial:', err);
                res.status(500).json({
                    success: false,
                    message: 'Error saving testimonial to database'
                });
                return;
            }
            
            console.log('✅ Video testimonial saved successfully');
            res.json({
                success: true,
                message: 'Video testimonial submitted successfully!',
                uuid: uuid
            });
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
        console.log('📸 Photo testimonial submission received');
        console.log('📋 Request body:', req.body);
        console.log('📁 File:', req.file ? req.file.originalname : 'No file');
        
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
            extreme_conditions,
            reason_for_flying
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

        console.log('💾 Preparing to insert photo testimonial into database');
        console.log('🔑 UUID:', uuid);
        console.log('📝 Data:', {
            name, email, testimonial, mediaFile, mediaType,
            first_name, last_name, current_flight_time, past_flight_time,
            use_case, weather_type, extreme_conditions, reason_for_flying
        });
        
        const stmt = prepare(`
            INSERT INTO testimonials (
                uuid, name, email, testimonial_text, media_file, media_type, media_data,
                first_name, last_name, current_flight_time, past_flight_time,
                use_case, weather_type, extreme_conditions, reason_for_flying, testimonial_type
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run([
            uuid, name, email, testimonial, mediaFile, mediaType, mediaData,
            first_name, last_name, current_flight_time, past_flight_time,
            use_case, weather_type, extreme_conditions, reason_for_flying, 'photo'
        ], (err) => {
            if (err) {
                console.error('❌ Error inserting photo testimonial:', err);
                res.status(500).json({
                    success: false,
                    message: 'Error saving testimonial to database'
                });
                return;
            }
            
            console.log('✅ Photo testimonial saved successfully');
            res.json({
                success: true,
                message: 'Photo testimonial submitted successfully!',
                uuid: uuid
            });
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
            extreme_conditions,
            reason_for_flying
        } = req.body;

        const uuid = uuidv4();

        const stmt = prepare(`
            INSERT INTO testimonials (
                uuid, name, email, testimonial_text, first_name, last_name,
                current_flight_time, past_flight_time, use_case, weather_type,
                extreme_conditions, reason_for_flying, testimonial_type
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run([
            uuid, name, email, testimonial,
            first_name, last_name, current_flight_time, past_flight_time,
            use_case, weather_type, extreme_conditions, reason_for_flying, 'written'
        ], (err) => {
            if (err) {
                console.error('Error inserting written testimonial:', err);
                res.status(500).json({
                    success: false,
                    message: 'Error saving testimonial to database'
                });
                return;
            }
            
            res.json({
                success: true,
                message: 'Written testimonial submitted successfully!',
                uuid: uuid
            });
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
    console.log('📊 Admin dashboard requesting testimonials...');
    all('SELECT * FROM testimonials ORDER BY created_at DESC', [], (err, rows) => {
        if (err) {
            console.error('❌ Error fetching testimonials:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        // Ensure rows is an array
        rows = rows || [];
        console.log(`✅ Returning ${rows.length} testimonials to admin dashboard`);
        res.json(rows);
    });
});

// Get testimonial by UUID
app.get('/api/testimonial/:uuid', (req, res) => {
    const { uuid } = req.params;
    get('SELECT * FROM testimonials WHERE uuid = ?', [uuid], (err, row) => {
        if (err) {
            console.error('Error fetching testimonial:', err);
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
    try {
        // Quick database check to ensure everything is working
        get('SELECT COUNT(*) as count FROM testimonials', [], (err, row) => {
            if (err) {
                console.error('Health check database error:', err);
                res.status(503).json({
                    status: 'unhealthy',
                    error: 'Database connection failed',
                    timestamp: new Date().toISOString()
                });
            } else {
                res.json({
                    status: 'healthy',
                    timestamp: new Date().toISOString(),
                    environment: process.env.NODE_ENV || 'development',
                    uploads: uploadsDir,
                    database: 'connected',
                    testimonialCount: row ? row.count : 0,
                    features: [
                        'HEIC support with automatic conversion',
                        'High volume optimized',
                        'Railway Pro persistent storage',
                        'Compression enabled',
                        'Media stored as BLOB in database'
                    ]
                });
            }
        });
    } catch (error) {
        console.error('Health check error:', error);
        res.status(503).json({
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Test database endpoint
app.get('/api/test-db', (req, res) => {
    console.log('🧪 Testing database connection...');
    all('SELECT COUNT(*) as count FROM testimonials', [], (err, rows) => {
        if (err) {
            console.error('❌ Database test error:', err);
            res.status(500).json({ error: err.message });
        } else {
            console.log('✅ Database test result:', rows);
            res.json({ 
                message: 'Database test successful',
                count: rows[0] ? rows[0].count : 0,
                rows: rows
            });
        }
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
    run('DELETE FROM testimonials WHERE uuid = ?', [uuid], function(err) {
        if (err) {
            console.error('Error deleting testimonial:', err);
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

// Add global error handlers to prevent crashes
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // Don't exit immediately, let the process continue
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit immediately, let the process continue
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📁 Uploads: ${uploadsDir}`);
    console.log(`🌐 Visit http://localhost:${PORT} to view the testimonial forms`);
    console.log(`⚡ Optimized for high volume with Railway Pro`);
    console.log(`💾 Media files now stored as BLOB in database for persistence`);
}); 
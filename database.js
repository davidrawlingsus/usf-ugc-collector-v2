const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

// Use persistent storage paths for Railway Pro
const persistentDir = process.env.RAILWAY_VOLUME_MOUNT_PATH ? '/app' : './';
const dataDir = path.join(persistentDir, 'data');

// Create data directory if it doesn't exist
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

let db = null;
let isPostgres = false;
let dbReady = false;
let initPromise = null;

// Initialize database based on environment
function initializeDatabase() {
    if (process.env.DATABASE_URL) {
        // Use PostgreSQL
        console.log('🔗 Using PostgreSQL database');
        isPostgres = true;
        
        const pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        });

        // Test the connection
        pool.query('SELECT NOW()', (err, res) => {
            if (err) {
                console.error('❌ PostgreSQL connection failed:', err);
                console.log('🔄 Falling back to SQLite...');
                initializeSQLite();
            } else {
                console.log('✅ PostgreSQL connected successfully');
                initializePostgres(pool);
            }
        });
    } else {
        // Use SQLite
        console.log('💾 Using SQLite database');
        initializeSQLite();
    }
}

// Create initialization promise
initPromise = new Promise((resolve) => {
    const checkReady = () => {
        if (dbReady) {
            resolve();
        } else {
            setTimeout(checkReady, 100);
        }
    };
    checkReady();
});

// Start initialization
initializeDatabase();

function initializeSQLite() {
    const dbPath = path.join(dataDir, 'testimonials.db');
    db = new sqlite3.Database(dbPath);
    db.configure('busyTimeout', 30000);

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
            reason_for_flying TEXT,
            testimonial_type TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
        
        // Add media_data column if it doesn't exist
        db.run(`ALTER TABLE testimonials ADD COLUMN media_data BLOB`, (err) => {
            if (err && !err.message.includes('duplicate column name')) {
                console.error('Error adding media_data column:', err);
            }
        });
        
        // Create assets table for frontend interface assets
        db.run(`CREATE TABLE IF NOT EXISTS assets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT UNIQUE,
            name TEXT NOT NULL,
            description TEXT,
            asset_type TEXT NOT NULL,
            file_name TEXT NOT NULL,
            mime_type TEXT NOT NULL,
            file_data BLOB NOT NULL,
            file_size INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
        
        dbReady = true;
        console.log('✅ SQLite database ready');
    });
}

function initializePostgres(pool) {
    db = pool;
    
    // Create testimonials table
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS testimonials (
            id SERIAL PRIMARY KEY,
            uuid TEXT UNIQUE,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            testimonial_text TEXT,
            media_file TEXT,
            media_type TEXT,
            media_data BYTEA,
            first_name TEXT,
            last_name TEXT,
            current_flight_time TEXT,
            past_flight_time TEXT,
            use_case TEXT,
            weather_type TEXT,
            extreme_conditions TEXT,
            reason_for_flying TEXT,
            testimonial_type TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;
    
    // Create assets table for frontend interface assets
    const createAssetsTableQuery = `
        CREATE TABLE IF NOT EXISTS assets (
            id SERIAL PRIMARY KEY,
            uuid TEXT UNIQUE,
            name TEXT NOT NULL,
            description TEXT,
            asset_type TEXT NOT NULL,
            file_name TEXT NOT NULL,
            mime_type TEXT NOT NULL,
            file_data BYTEA NOT NULL,
            file_size INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;
    
    pool.query(createTableQuery, (err) => {
        if (err) {
            console.error('Error creating PostgreSQL testimonials table:', err);
        } else {
            console.log('✅ PostgreSQL testimonials table created/verified');
        }
    });
    
    pool.query(createAssetsTableQuery, (err) => {
        if (err) {
            console.error('Error creating PostgreSQL assets table:', err);
        } else {
            console.log('✅ PostgreSQL assets table created/verified');
        }
    });
    
    dbReady = true;
    console.log('✅ PostgreSQL database ready');
}

// Database operation wrappers
function run(query, params = [], callback) {
    if (!dbReady) {
        return callback(new Error('Database not ready'));
    }
    if (isPostgres) {
        // Convert ? placeholders to $1, $2, etc.
        let paramIndex = 1;
        const convertedQuery = query.replace(/\?/g, () => `$${paramIndex++}`);
        db.query(convertedQuery, params, callback);
    } else {
        db.run(query, params, callback);
    }
}

function get(query, params = [], callback) {
    if (!dbReady) {
        return callback(new Error('Database not ready'));
    }
    if (isPostgres) {
        // Convert ? placeholders to $1, $2, etc.
        let paramIndex = 1;
        const convertedQuery = query.replace(/\?/g, () => `$${paramIndex++}`);
        db.query(convertedQuery, params, (err, result) => {
            if (err) {
                callback(err);
            } else {
                callback(null, result.rows[0] || null);
            }
        });
    } else {
        db.get(query, params, callback);
    }
}

function all(query, params = [], callback) {
    if (!dbReady) {
        return callback(new Error('Database not ready'));
    }
    if (isPostgres) {
        // Convert ? placeholders to $1, $2, etc.
        let paramIndex = 1;
        const convertedQuery = query.replace(/\?/g, () => `$${paramIndex++}`);
        console.log('🔍 ALL query:', convertedQuery);
        console.log('🔍 ALL params:', params);
        
        try {
            // Test the database connection first
            db.query('SELECT 1 as test', (err, result) => {
                if (err) {
                    console.error('❌ Database connection test failed:', err);
                    callback(err);
                    return;
                }
                console.log('✅ Database connection test passed');
                
                // Now run the actual query
                db.query(convertedQuery, params, (err, result) => {
                    if (err) {
                        console.error('❌ ALL query error:', err);
                        callback(err);
                    } else {
                        console.log('✅ ALL query result:', result);
                        console.log('📊 Result rows:', result.rows);
                        console.log('📊 Result rows length:', result.rows ? result.rows.length : 'undefined');
                        callback(null, result.rows || []);
                    }
                });
            });
        } catch (error) {
            console.error('❌ ALL query exception:', error);
            callback(error);
        }
    } else {
        db.all(query, params, callback);
    }
}

function prepare(query) {
    if (!dbReady) {
        throw new Error('Database not ready');
    }
    if (isPostgres) {
        // For PostgreSQL, convert ? placeholders to $1, $2, etc.
        let paramIndex = 1;
        const convertedQuery = query.replace(/\?/g, () => `$${paramIndex++}`);
        
        return {
            run: (params, callback) => {
                db.query(convertedQuery, params, callback);
            }
        };
    } else {
        return db.prepare(query);
    }
}

module.exports = {
    db,
    isPostgres,
    dbReady,
    initPromise,
    run,
    get,
    all,
    prepare
}; 
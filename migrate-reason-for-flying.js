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

console.log('🔄 Starting migration to add reason_for_flying column...');

// Initialize database based on environment
if (process.env.DATABASE_URL) {
    // Use PostgreSQL
    console.log('🔗 Using PostgreSQL database');
    
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });

    // Add reason_for_flying column to PostgreSQL
    pool.query('ALTER TABLE testimonials ADD COLUMN reason_for_flying TEXT', (err) => {
        if (err) {
            if (err.message.includes('duplicate column name')) {
                console.log('✅ reason_for_flying column already exists in PostgreSQL');
            } else {
                console.error('❌ Error adding reason_for_flying column to PostgreSQL:', err);
            }
        } else {
            console.log('✅ Successfully added reason_for_flying column to PostgreSQL');
        }
        
        pool.end();
    });
} else {
    // Use SQLite
    console.log('💾 Using SQLite database');
    
    const dbPath = path.join(dataDir, 'testimonials.db');
    const db = new sqlite3.Database(dbPath);
    
    // Add reason_for_flying column to SQLite
    db.run('ALTER TABLE testimonials ADD COLUMN reason_for_flying TEXT', (err) => {
        if (err) {
            if (err.message.includes('duplicate column name')) {
                console.log('✅ reason_for_flying column already exists in SQLite');
            } else {
                console.error('❌ Error adding reason_for_flying column to SQLite:', err);
            }
        } else {
            console.log('✅ Successfully added reason_for_flying column to SQLite');
        }
        
        db.close();
    });
}

console.log('✅ Migration completed!'); 
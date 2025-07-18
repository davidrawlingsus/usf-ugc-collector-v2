const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

// Use persistent storage paths for Railway Pro
const persistentDir = process.env.RAILWAY_VOLUME_MOUNT_PATH ? '/app' : './';
const dataDir = path.join(persistentDir, 'data');

if (!process.env.DATABASE_URL) {
    console.log('❌ DATABASE_URL not found. Skipping migration.');
    process.exit(0);
}

console.log('🔄 Starting migration from SQLite to PostgreSQL...');

// Initialize SQLite database
const dbPath = path.join(dataDir, 'testimonials.db');
const sqliteDb = new sqlite3.Database(dbPath);

// Initialize PostgreSQL
const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function migrateData() {
    try {
        // Test PostgreSQL connection
        await pgPool.query('SELECT NOW()');
        console.log('✅ PostgreSQL connection successful');

        // Get all testimonials from SQLite
        sqliteDb.all('SELECT * FROM testimonials', async (err, rows) => {
            if (err) {
                console.error('❌ Error reading from SQLite:', err);
                process.exit(1);
            }

            console.log(`📊 Found ${rows.length} testimonials to migrate`);

            if (rows.length === 0) {
                console.log('✅ No data to migrate');
                process.exit(0);
            }

            let migrated = 0;
            let errors = 0;

            for (const row of rows) {
                try {
                    // Check if record already exists in PostgreSQL
                    const existing = await pgPool.query(
                        'SELECT id FROM testimonials WHERE uuid = ?',
                        [row.uuid]
                    );

                    if (existing.rows.length > 0) {
                        console.log(`⏭️  Skipping existing record: ${row.uuid}`);
                        continue;
                    }

                    // Insert into PostgreSQL
                    await pgPool.query(`
                        INSERT INTO testimonials (
                            uuid, name, email, testimonial_text, media_file, media_type, media_data,
                            first_name, last_name, current_flight_time, past_flight_time,
                            use_case, weather_type, extreme_conditions, testimonial_type, created_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, [
                        row.uuid, row.name, row.email, row.testimonial_text, row.media_file, 
                        row.media_type, row.media_data, row.first_name, row.last_name, 
                        row.current_flight_time, row.past_flight_time, row.use_case, 
                        row.weather_type, row.extreme_conditions, row.testimonial_type, row.created_at
                    ]);

                    migrated++;
                    console.log(`✅ Migrated: ${row.uuid}`);
                } catch (error) {
                    console.error(`❌ Error migrating ${row.uuid}:`, error.message);
                    errors++;
                }
            }

            console.log(`\n📊 Migration complete:`);
            console.log(`✅ Successfully migrated: ${migrated}`);
            console.log(`❌ Errors: ${errors}`);
            console.log(`⏭️  Skipped (already exists): ${rows.length - migrated - errors}`);

            process.exit(0);
        });

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

// Start migration
migrateData();

// Cleanup on exit
process.on('exit', () => {
    sqliteDb.close();
    pgPool.end();
}); 
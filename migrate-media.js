const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Use the same paths as the main server
const persistentDir = process.env.RAILWAY_VOLUME_MOUNT_PATH ? '/app' : './';
const dataDir = path.join(persistentDir, 'data');
const uploadsDir = path.join(persistentDir, 'uploads');

const dbPath = path.join(dataDir, 'testimonials.db');
const db = new sqlite3.Database(dbPath);

console.log('🔄 Starting media migration...');
console.log('Database path:', dbPath);
console.log('Uploads directory:', uploadsDir);

// Ensure media_data column exists
db.serialize(() => {
    db.run(`ALTER TABLE testimonials ADD COLUMN media_data BLOB`, (err) => {
        if (err) {
            if (err.message.includes('duplicate column name')) {
                console.log('✅ media_data column already exists');
            } else {
                console.error('Error adding media_data column:', err);
            }
        } else {
            console.log('✅ media_data column added successfully');
        }
    });
});

// Function to migrate media files
function migrateMediaFiles() {
    return new Promise((resolve, reject) => {
        // Get all testimonials that have media_file but no media_data
        db.all(`
            SELECT id, uuid, media_file, media_type 
            FROM testimonials 
            WHERE media_file IS NOT NULL 
            AND media_data IS NULL
        `, (err, rows) => {
            if (err) {
                console.error('Error querying testimonials:', err);
                return reject(err);
            }

            console.log(`📁 Found ${rows.length} testimonials with media files to migrate`);

            if (rows.length === 0) {
                console.log('✅ No media files to migrate');
                return resolve();
            }

            let migrated = 0;
            let errors = 0;

            rows.forEach((row, index) => {
                const filePath = path.join(uploadsDir, row.media_file);
                
                // Check if file exists
                if (!fs.existsSync(filePath)) {
                    console.log(`⚠️  File not found: ${row.media_file}`);
                    errors++;
                    return;
                }

                // Read file and store in database
                fs.readFile(filePath, (err, data) => {
                    if (err) {
                        console.error(`❌ Error reading file ${row.media_file}:`, err);
                        errors++;
                        return;
                    }

                    // Update database with media data
                    db.run(`
                        UPDATE testimonials 
                        SET media_data = ? 
                        WHERE id = ?
                    `, [data, row.id], (err) => {
                        if (err) {
                            console.error(`❌ Error updating database for ${row.media_file}:`, err);
                            errors++;
                        } else {
                            console.log(`✅ Migrated: ${row.media_file}`);
                            migrated++;
                        }

                        // Check if all files have been processed
                        if (migrated + errors === rows.length) {
                            console.log(`\n📊 Migration complete:`);
                            console.log(`✅ Successfully migrated: ${migrated} files`);
                            console.log(`❌ Errors: ${errors} files`);
                            console.log(`💾 Media files are now stored in the database`);
                            
                            // Optionally remove the original files
                            console.log('\n🗑️  Removing original files from filesystem...');
                            rows.forEach(row => {
                                const filePath = path.join(uploadsDir, row.media_file);
                                if (fs.existsSync(filePath)) {
                                    fs.unlink(filePath, (err) => {
                                        if (err) {
                                            console.log(`⚠️  Could not remove ${row.media_file}:`, err.message);
                                        } else {
                                            console.log(`🗑️  Removed: ${row.media_file}`);
                                        }
                                    });
                                }
                            });
                            
                            resolve();
                        }
                    });
                });
            });
        });
    });
}

// Run migration
migrateMediaFiles()
    .then(() => {
        console.log('\n🎉 Migration completed successfully!');
        console.log('🚀 Your media files are now safely stored in the database');
        process.exit(0);
    })
    .catch((err) => {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }); 
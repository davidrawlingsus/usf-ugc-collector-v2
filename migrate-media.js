const fs = require('fs');
const path = require('path');
const { db, run, all, initPromise } = require('./database');

// Use the same paths as the main server
const persistentDir = process.env.RAILWAY_VOLUME_MOUNT_PATH ? '/app' : './';
const uploadsDir = path.join(persistentDir, 'uploads');

console.log('🔄 Starting media migration...');
console.log('Uploads directory:', uploadsDir);

// Wait for database to be ready
function waitForDatabase() {
    return initPromise;
}

// Function to migrate media files
function migrateMediaFiles() {
    return new Promise((resolve, reject) => {
        // Get all testimonials that have media_file but no media_data
        all(`
            SELECT id, uuid, media_file, media_type 
            FROM testimonials 
            WHERE media_file IS NOT NULL 
            AND media_data IS NULL
        `, (err, rows) => {
            if (err) {
                console.error('Error querying testimonials:', err);
                return reject(err);
            }

            // Ensure rows is an array
            rows = rows || [];
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
                    run(`
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
waitForDatabase()
    .then(() => migrateMediaFiles())
    .then(() => {
        console.log('\n🎉 Migration completed successfully!');
        console.log('🚀 Your media files are now safely stored in the database');
        process.exit(0);
    })
    .catch((err) => {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }); 
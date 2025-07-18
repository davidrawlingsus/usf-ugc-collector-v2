const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Use the same paths as the main server
const persistentDir = process.env.RAILWAY_VOLUME_MOUNT_PATH ? '/app' : './';
const dataDir = path.join(persistentDir, 'data');
const dbPath = path.join(dataDir, 'testimonials.db');

const db = new sqlite3.Database(dbPath);

console.log('🧪 Testing media storage and retrieval...');
console.log('Database path:', dbPath);

// Test database connection and media data
db.all(`
    SELECT id, uuid, media_file, media_type, 
           CASE WHEN media_data IS NOT NULL THEN '✅' ELSE '❌' END as has_media_data,
           CASE WHEN media_data IS NOT NULL THEN length(media_data) ELSE 0 END as media_size
    FROM testimonials 
    WHERE media_file IS NOT NULL
    ORDER BY created_at DESC
    LIMIT 10
`, (err, rows) => {
    if (err) {
        console.error('❌ Database error:', err);
        process.exit(1);
    }

    if (rows.length === 0) {
        console.log('📝 No testimonials with media files found');
        console.log('💡 Upload some media files to test the system');
    } else {
        console.log(`📊 Found ${rows.length} testimonials with media files:`);
        console.log('');
        
        rows.forEach((row, index) => {
            console.log(`${index + 1}. ${row.media_file}`);
            console.log(`   Type: ${row.media_type}`);
            console.log(`   Media Data: ${row.has_media_data} (${row.media_size} bytes)`);
            console.log(`   UUID: ${row.uuid}`);
            console.log(`   Test URL: http://localhost:3000/uploads/${row.media_file}`);
            console.log('');
        });

        const withMediaData = rows.filter(r => r.has_media_data === '✅').length;
        const withoutMediaData = rows.filter(r => r.has_media_data === '❌').length;

        console.log('📈 Summary:');
        console.log(`✅ Media files in database: ${withMediaData}`);
        console.log(`❌ Media files missing from database: ${withoutMediaData}`);
        
        if (withoutMediaData > 0) {
            console.log('');
            console.log('🔄 Run migration to move filesystem media to database:');
            console.log('   npm run migrate');
        }
    }

    db.close();
}); 
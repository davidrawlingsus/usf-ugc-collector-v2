# Deployment Guide - Media Persistence Solution

## Problem Solved

Previously, when deploying changes to Railway, uploaded media files (images and videos) were lost because they were stored on the filesystem, which gets reset on each deployment. The database persisted, but the actual media files didn't.

## Solution Implemented

**Media files are now stored as BLOB data directly in the SQLite database**, ensuring they persist across all deployments.

### Key Changes

1. **Database Schema Update**: Added `media_data BLOB` column to store actual file content
2. **Memory Storage**: Changed from filesystem storage to memory storage during upload
3. **Media Serving**: Added `/uploads/:filename` endpoint that serves media from database
4. **Migration Script**: Automatic migration of existing filesystem media to database
5. **Deployment Script**: Automated deployment process with migration

## Files Modified

- `server.js` - Updated to store media as BLOB data
- `migrate-media.js` - Migration script for existing media
- `deploy.sh` - Deployment script with migration
- `railway.json` - Updated to use deployment script
- `package.json` - Added migration and test scripts
- `test-media.js` - Test script to verify media storage

## Deployment Process

### Automatic Deployment (Recommended)

The deployment script (`deploy.sh`) automatically:

1. Creates necessary directories
2. Runs media migration for existing files
3. Starts the server

Railway will use this script automatically based on the `railway.json` configuration.

### Manual Deployment

If you need to deploy manually:

```bash
# Run migration for existing media files
npm run migrate

# Start the server
npm start
```

## Testing the Deployment

### 1. Check Media Storage

```bash
# Test current media storage status
npm run test-media
```

This will show:
- How many media files are in the database
- How many are missing (need migration)
- File sizes and types

### 2. Test Media Serving

After deployment, test that media files are served correctly:

1. Upload a new testimonial with media
2. Check the admin dashboard
3. Click on media links to verify they load

### 3. Verify Persistence

1. Deploy a change to Railway
2. Check that existing media files still load
3. Upload new media and verify it persists

## Migration Process

The migration script (`migrate-media.js`) handles:

1. **Adding media_data column** to existing databases
2. **Reading filesystem media** files from uploads directory
3. **Storing media as BLOB** in the database
4. **Removing original files** from filesystem
5. **Progress reporting** with success/error counts

### Migration Output Example

```
🔄 Starting media migration...
Database path: /app/data/testimonials.db
Uploads directory: /app/uploads
✅ media_data column ready
📁 Found 5 testimonials with media files to migrate
✅ Migrated: 1752819352672-687e623d-5541-4a55-b8bd-77125faf5fd2.jpg
✅ Migrated: 1752819401234-abc123-def456-ghi789-jkl012.jpg
✅ Migrated: 1752819456789-xyz789-uvw456-rst123-qwe456.mp4

📊 Migration complete:
✅ Successfully migrated: 5 files
❌ Errors: 0 files
💾 Media files are now stored in the database

🗑️  Removing original files from filesystem...
🗑️  Removed: 1752819352672-687e623d-5541-4a55-b8bd-77125faf5fd2.jpg
🗑️  Removed: 1752819401234-abc123-def456-ghi789-jkl012.jpg
🗑️  Removed: 1752819456789-xyz789-uvw456-rst123-qwe456.mp4

🎉 Migration completed successfully!
🚀 Your media files are now safely stored in the database
```

## Railway Configuration

The `railway.json` configuration includes:

- **Persistent volumes** for database storage
- **Deployment script** that runs migration
- **Health check** endpoint for monitoring
- **Restart policy** for reliability

## Benefits of This Solution

1. **Complete Persistence**: Media files survive all deployments
2. **No File System Dependencies**: Everything stored in database
3. **Automatic Migration**: Existing media preserved during upgrade
4. **Better Performance**: Database queries are faster than filesystem access
5. **Simplified Backup**: Single database file contains all data
6. **Railway Optimized**: Works perfectly with Railway's ephemeral filesystem

## Troubleshooting

### Media Files Not Loading

1. Check if migration ran successfully:
   ```bash
   npm run test-media
   ```

2. If files are missing from database, run migration:
   ```bash
   npm run migrate
   ```

3. Check server logs for database errors

### Migration Errors

1. Ensure uploads directory exists and has proper permissions
2. Check database file permissions
3. Verify Railway volume mounts are working

### Performance Issues

1. Database size will grow with media files
2. Consider implementing media compression for large files
3. Monitor database performance with large media files

## Monitoring

Use the health check endpoint to monitor the system:

```bash
curl https://your-app.railway.app/api/health
```

This returns system status including media storage features.

## Future Enhancements

1. **Media Compression**: Implement automatic compression for large files
2. **CDN Integration**: Serve media through CDN for better performance
3. **Media Thumbnails**: Generate thumbnails for video previews
4. **Backup Strategy**: Implement automated database backups 
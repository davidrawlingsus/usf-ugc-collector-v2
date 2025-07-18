#!/bin/bash

echo "🚀 Starting deployment process..."

# Check if we're in Railway environment
if [ -n "$RAILWAY_VOLUME_MOUNT_PATH" ]; then
    echo "📦 Railway environment detected"
    echo "💾 Persistent storage path: $RAILWAY_VOLUME_MOUNT_PATH"
else
    echo "🏠 Local development environment"
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p data
mkdir -p uploads

# Run database migration for existing media files
echo "🔄 Running media migration..."
node migrate-media.js

# Start the server
echo "🚀 Starting server..."
node server.js 
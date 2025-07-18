#!/bin/bash

# USF UGC Collector Deployment Script
# This script handles git operations and Railway deployment

set -e  # Exit on any error

echo "🚀 Starting deployment process..."

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "❌ Error: Not in a git repository"
    exit 1
fi

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  Warning: You have uncommitted changes"
    echo "   Consider committing them before deployment:"
    echo "   git add . && git commit -m 'Your commit message'"
    read -p "   Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Deployment cancelled"
        exit 1
    fi
fi

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)
echo "📋 Current branch: $CURRENT_BRANCH"

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Error: Railway CLI not found"
    echo "   Install it with: npm install -g @railway/cli"
    exit 1
fi

# Check if we're linked to a Railway project
if ! railway status &> /dev/null; then
    echo "❌ Error: Not linked to a Railway project"
    echo "   Run: railway login && railway link"
    exit 1
fi

echo "🔗 Deploying to Railway..."

# Deploy to Railway
railway up

echo "✅ Deployment complete!"
echo "🌐 Your app should be available at the Railway URL"
echo "📊 Check logs with: railway logs" 
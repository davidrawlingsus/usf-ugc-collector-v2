# Railway Persistent Storage Setup

## The Problem
Railway's free tier uses ephemeral storage, which means your database and uploaded files get reset on every deployment.

## The Solution
Set up Railway volumes for persistent storage.

## Step-by-Step Setup

### 1. Create Volumes in Railway Dashboard

1. Go to your Railway project: https://railway.com/project/64d20359-9d63-47dc-a3b4-28e2e34be929
2. Click on your service (`usf-testimonial-collector`)
3. Go to the **"Variables"** tab
4. Add these environment variables:

```
RAILWAY_VOLUME_MOUNT_PATH=/app
```

### 2. Create Volumes via CLI

Run these commands:

```bash
# Create database volume
railway volume create database --mount-path /app/data

# Create uploads volume  
railway volume create uploads --mount-path /app/uploads
```

### 3. Deploy the Updated Code

```bash
git add .
git commit -m "Add persistent storage configuration"
railway up
```

## Alternative: Upgrade to Paid Plan

Railway's $5/month plan includes persistent storage by default, which is the easiest solution.

## Alternative: Use Different Platform

Consider these platforms that have persistent storage on free tier:

- **Render** - Free tier with persistent storage
- **Railway** - $5/month for persistent storage
- **Heroku** - $7/month for persistent storage

## Current Status

Your app is configured to use persistent storage when volumes are set up. The database and uploads will be stored in:

- Database: `/app/data/testimonials.db`
- Uploads: `/app/uploads/`

This will survive deployments and restarts. 
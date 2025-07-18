# USF UGC Collector

A testimonial collection system for USF, built with Node.js and PostgreSQL, deployed on Railway.

## Features

- **Photo Testimonials**: Upload photos with testimonial text
- **Written Testimonials**: Text-only testimonials
- **Video Testimonials**: Upload video files with testimonials
- **Admin Dashboard**: View and manage all testimonials
- **PostgreSQL Integration**: Scalable database for high-volume usage
- **Railway Deployment**: Production-ready deployment
- **HEIC Support**: Automatic conversion of HEIC images to JPEG

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL (production), SQLite (development)
- **File Upload**: Multer
- **Image Processing**: Sharp (HEIC conversion)
- **Deployment**: Railway
- **Version Control**: Git

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Railway account (for deployment)

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd usf_ugc_collector
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start development server**
   ```bash
   npm start
   ```

5. **Access the application**
   - Main app: http://localhost:8080
   - Admin dashboard: http://localhost:8080/admin.html

### Database Setup

The application automatically handles database setup:

- **Development**: Uses SQLite (`data/testimonials.db`)
- **Production**: Uses PostgreSQL (configured via `DATABASE_URL`)

## Deployment

### Railway Deployment

1. **Connect to Railway**
   ```bash
   railway login
   railway link
   ```

2. **Set environment variables**
   ```bash
   railway variables set DATABASE_URL=your_postgresql_url
   ```

3. **Deploy**
   ```bash
   railway up
   ```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Production |
| `PORT` | Server port (default: 8080) | No |
| `NODE_ENV` | Environment (development/production) | No |

## API Endpoints

### Testimonials

- `GET /api/testimonials` - Get all testimonials (admin)
- `GET /api/testimonial/:uuid` - Get specific testimonial
- `DELETE /api/testimonial/:uuid` - Delete testimonial
- `POST /submit-photo-testimonial` - Submit photo testimonial
- `POST /submit-written-testimonial` - Submit written testimonial
- `POST /submit-video-testimonial` - Submit video testimonial

### System

- `GET /api/health` - Health check
- `GET /api/test-db` - Database connection test
- `GET /api/test-heic` - HEIC support test

## Development Workflow

### Making Changes

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   ```bash
   # Edit files
   git add .
   git commit -m "Add feature description"
   ```

3. **Test locally**
   ```bash
   npm start
   # Test your changes
   ```

4. **Deploy to staging** (optional)
   ```bash
   railway up
   ```

5. **Merge to main**
   ```bash
   git checkout main
   git merge feature/your-feature-name
   git push origin main
   ```

### Database Migrations

When making database changes:

1. **Create migration script**
   ```bash
   # Create migration file
   touch migrate-new-feature.js
   ```

2. **Test migration locally**
   ```bash
   node migrate-new-feature.js
   ```

3. **Deploy with migration**
   ```bash
   railway up
   ```

## Troubleshooting

### Common Issues

1. **Admin dashboard shows "Error loading UGC"**
   - Check database connection
   - Verify PostgreSQL is running
   - Check logs for query errors

2. **File uploads failing**
   - Check uploads directory permissions
   - Verify file size limits
   - Check available disk space

3. **HEIC images not converting**
   - Ensure Sharp is installed
   - Check image format support
   - Verify conversion settings

### Debugging

1. **Check logs**
   ```bash
   railway logs
   ```

2. **Test database connection**
   ```bash
   curl https://your-app.railway.app/api/test-db
   ```

3. **Check health status**
   ```bash
   curl https://your-app.railway.app/api/health
   ```

## File Structure

```
usf_ugc_collector/
├── server.js              # Main server file
├── database.js            # Database abstraction layer
├── package.json           # Dependencies and scripts
├── railway.json           # Railway deployment config
├── .gitignore            # Git ignore rules
├── README.md             # This file
├── data/                 # SQLite database (development)
├── uploads/              # File uploads
├── *.html               # Frontend pages
└── migrate-*.js         # Database migration scripts
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

[Add your license here]

## Support

For issues and questions:
- Check the troubleshooting section
- Review Railway logs
- Contact the development team 
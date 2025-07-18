# Super Tough Flag Testimonial Collection System

A complete testimonial collection system with file upload, database storage, and admin dashboard.

## Features

- **Three testimonial types:**
  - 🎥 **Video testimonials** - Record 30-60 second videos
  - 📸 **Photo + Written testimonials** - Write with optional photo
  - ✍️ **Written testimonials** - Text-only submissions

- **Mobile-optimized design** with patriotic red/blue gradient
- **URL parameter parsing** for pre-populated form fields
- **Native camera integration** for iPhone and Android devices
- **File upload handling** with secure storage
- **SQLite database** for testimonial storage
- **Admin dashboard** to view and manage submissions
- **Real-time form validation** and error handling

## URL Parameters

The system accepts these URL parameters for pre-populating forms:

- `first_name` - Customer's first name
- `last_name` - Customer's last name  
- `email` - Customer's email address
- `current_flight_time` - Current flag flight duration
- `past_flight_time` - Previous flag flight duration
- `use_case` - How the flag is being used
- `weather_type` - Weather conditions experienced
- `extreme_conditions` - Extreme weather conditions

Example URL:
```
http://localhost:3000/?first_name=John&last_name=Doe&email=john@example.com&current_flight_time=6+months&use_case=Residential&weather_type=Sunny&extreme_conditions=High+wind
```

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Server
```bash
npm start
```

Or for development with auto-restart:
```bash
npm run dev
```

### 3. Access the Application

- **Main site:** http://localhost:3000
- **Admin dashboard:** http://localhost:3000/admin
- **Video testimonials:** http://localhost:3000/video_collector.html
- **Photo testimonials:** http://localhost:3000/photo_testimonial.html
- **Written testimonials:** http://localhost:3000/written_testimonial.html

## API Endpoints

### Submit Testimonials
- `POST /submit-video-testimonial` - Submit video testimonials
- `POST /submit-photo-testimonial` - Submit photo + written testimonials
- `POST /submit-written-testimonial` - Submit written testimonials

### View Data
- `GET /api/testimonials` - Get all testimonials
- `GET /api/testimonial/:uuid` - Get specific testimonial

## Database Schema

The SQLite database stores testimonials with these fields:

- `id` - Auto-incrementing primary key
- `uuid` - Unique identifier for each submission
- `name` - Customer's full name
- `email` - Customer's email address
- `testimonial_text` - Written testimonial content
- `media_file` - Filename of uploaded media
- `media_type` - MIME type of uploaded file
- `first_name`, `last_name` - Parsed from URL parameters
- `current_flight_time`, `past_flight_time` - Flag usage data
- `use_case`, `weather_type`, `extreme_conditions` - Context data
- `testimonial_type` - 'video', 'photo', or 'written'
- `created_at` - Timestamp of submission

## File Storage

- Media files are stored in the `uploads/` directory
- Files are renamed with timestamps and UUIDs for security
- Supported formats: Video (mp4, mov, etc.) and Images (jpg, png, etc.)
- Maximum file size: 50MB

## Mobile Device Support

### iPhone (Safari)
- File input shows: "Take Photo or Video", "Photo Library", "Browse"
- `capture="environment"` defaults to rear camera
- Video recording opens native camera app

### Android (Chrome)
- File input shows: "Camera", "Gallery", "Files"
- Same capture behavior
- Uses device's default camera app

## Admin Dashboard

The admin dashboard at `/admin` provides:

- **Statistics overview** - Total counts by testimonial type
- **Real-time updates** - Auto-refreshes every 30 seconds
- **Media preview** - Direct links to uploaded files
- **Metadata display** - Shows all URL parameters and context
- **Responsive design** - Works on desktop and mobile

## Production Deployment

### Option 1: Heroku
```bash
# Add to package.json
"engines": {
  "node": "18.x"
}

# Deploy
git push heroku main
```

### Option 2: DigitalOcean App Platform
- Connect GitHub repository
- Set build command: `npm install`
- Set run command: `npm start`

### Option 3: Railway
- Connect GitHub repository
- Automatic deployment on push

## Environment Variables

Create a `.env` file for production:

```env
PORT=3000
NODE_ENV=production
```

## Security Features

- **File type validation** - Only allows video and image files
- **File size limits** - 50MB maximum per file
- **Unique filenames** - Prevents filename conflicts
- **SQL injection protection** - Uses parameterized queries
- **CORS enabled** - For cross-origin requests

## Development

### File Structure
```
├── server.js              # Main Express server
├── package.json           # Dependencies and scripts
├── testimonials.db        # SQLite database (auto-created)
├── uploads/              # Media file storage
├── index.html            # Main navigation page
├── video_collector.html  # Video testimonial form
├── photo_testimonial.html # Photo testimonial form
├── written_testimonial.html # Written testimonial form
├── admin.html            # Admin dashboard
└── README.md             # This file
```

### Adding New Features

1. **New testimonial type:** Add form page and server route
2. **Additional fields:** Update database schema and form handling
3. **Custom styling:** Modify CSS in HTML files
4. **API extensions:** Add new endpoints to server.js

## Troubleshooting

### Common Issues

1. **Port already in use:** Change PORT in .env or kill existing process
2. **File upload fails:** Check uploads/ directory permissions
3. **Database errors:** Delete testimonials.db to reset
4. **Mobile camera not working:** Ensure HTTPS in production

### Logs

Check server console for detailed error messages and request logs.

## License

MIT License - See LICENSE file for details. 
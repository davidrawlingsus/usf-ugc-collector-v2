# Video Testimonial Upload Page

A mobile-optimized HTML page for collecting video testimonials from Super Tough flag customers.

## Features

- **Mobile-optimized design** with patriotic red/blue gradient
- **Pre-populated form fields** from URL parameters (first_name, last_name, email)
- **Native camera integration** for iPhone and Android devices
- **File upload preview** with selected video name
- **Form validation** with required fields
- **Responsive design** optimized for mobile devices

## URL Parameters

The page accepts the following URL parameters for pre-populating form fields:

- `first_name` - Customer's first name
- `last_name` - Customer's last name  
- `email` - Customer's email address

Example URL:
```
https://your-domain.com/video_collector.html?first_name=John&last_name=Doe&email=john@example.com
```

## Mobile Device Support

### iPhone (Safari)
- File input shows: "Take Photo or Video", "Photo Library", "Browse"
- `capture="environment"` defaults to rear camera
- Video recording opens native camera app

### Android (Chrome)
- File input shows: "Camera", "Gallery", "Files"
- Same capture behavior
- Uses device's default camera app

## Setup Instructions

1. Upload `video_collector.html` to your web server
2. Ensure HTTPS is enabled (required for camera access)
3. Test the page on mobile devices
4. Configure server-side processing for form submissions

## Next Steps

To make this production-ready, you'll need to:

1. **Set up server-side processing** to handle form submissions
2. **Configure file storage** (AWS S3, Cloudinary, etc.)
3. **Add database storage** for customer information
4. **Implement email notifications** for new testimonials
5. **Add analytics tracking** for form submissions

## Demo

The page currently shows a demo success message. Replace the JavaScript form submission handler with actual server-side processing. 
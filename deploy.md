# Deployment Options for Video Testimonial Page

## Option 1: GitHub Pages (Recommended - Free)

1. **Create a GitHub repository:**
   ```bash
   # Create a new repository on GitHub.com
   # Then push your code:
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git branch -M main
   git push -u origin main
   ```

2. **Enable GitHub Pages:**
   - Go to your repository on GitHub
   - Click "Settings" → "Pages"
   - Select "Deploy from a branch"
   - Choose "main" branch
   - Save

3. **Your site will be available at:**
   ```
   https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/video_collector.html
   ```

## Option 2: Netlify (Free Tier)

1. **Drag and drop deployment:**
   - Go to [netlify.com](https://netlify.com)
   - Drag your `video_collector.html` file to the deploy area
   - Get instant HTTPS URL

2. **Or connect GitHub repository:**
   - Connect your GitHub repo to Netlify
   - Automatic deployments on every push

## Option 3: Vercel (Free Tier)

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Deploy:**
   ```bash
   vercel
   ```

## Option 4: Firebase Hosting (Free Tier)

1. **Install Firebase CLI:**
   ```bash
   npm install -g firebase-tools
   ```

2. **Initialize and deploy:**
   ```bash
   firebase login
   firebase init hosting
   firebase deploy
   ```

## Testing Your Deployment

Once deployed, test these URLs:

1. **Basic page:**
   ```
   https://your-domain.com/video_collector.html
   ```

2. **With pre-populated data:**
   ```
   https://your-domain.com/video_collector.html?first_name=John&last_name=Doe&email=john@example.com
   ```

## Important Notes

- **HTTPS is required** for camera access on mobile devices
- **Test on actual mobile devices** (not just browser dev tools)
- **File uploads won't work** until you add server-side processing
- **Current form shows demo success message** - replace with real backend

## Quick GitHub Pages Setup

If you want to use GitHub Pages right now:

1. Create a new repository on GitHub.com
2. Run these commands:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git branch -M main
   git push -u origin main
   ```
3. Enable GitHub Pages in repository settings
4. Share the URL with your team!

The page will be live at: `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/video_collector.html` 
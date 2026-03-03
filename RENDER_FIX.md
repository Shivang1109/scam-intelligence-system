# Render Deployment Fix

## Problem
Your Render deployment was showing "Cannot GET /" because:
1. `simple-server.js` was hardcoded to port 3000 (Render uses PORT env var)
2. The API server was also trying to serve static files, causing conflicts
3. Server wasn't binding to `0.0.0.0` (required for Render)

## Solution Applied

### 1. Fixed simple-server.js
- Use `process.env.PORT` instead of hardcoded 3000
- Bind to `0.0.0.0` for Render compatibility
- Serve static files BEFORE mounting API routes
- Added logging to debug static file path

### 2. Fixed src/api/server.ts
- Removed duplicate static file serving
- The API server now only handles API routes
- Static files are served by the parent server (simple-server.js)

### 3. Updated render.yaml
- Changed `startCommand` from `npm start` to `node simple-server.js`
- Set PORT to 10000 (Render's default)

## Deploy to Render

### Push to GitHub
```bash
git add simple-server.js src/api/server.ts render.yaml
git commit -m "Fix Render deployment - serve frontend properly"
git push origin main
```

Render will automatically detect the change and redeploy in 5-10 minutes.

## Verify Deployment

Once deployed, test these URLs:

```bash
# Frontend (should show HTML page)
curl https://scam-intelligence-system.onrender.com/

# Health check
curl https://scam-intelligence-system.onrender.com/health

# API info
curl https://scam-intelligence-system.onrender.com/api/v1
```

## What Changed

### simple-server.js
```javascript
// BEFORE
const port = 3000;
app.listen(port, () => { ... });

// AFTER
const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => { ... });
```

### src/api/server.ts
```typescript
// BEFORE
private setupStaticFiles(): void {
  this.app.use(express.static(path.join(process.cwd(), 'public')));
}

// AFTER
private setupStaticFiles(): void {
  // Static files handled by parent server
}
```

## Testing Locally

The server works locally on port 3000:
```bash
npm run build
node simple-server.js
```

Then visit: http://localhost:3000

## Important Notes

1. **Port Binding**: Render requires binding to `0.0.0.0`, not just `localhost`
2. **Environment Variables**: Always use `process.env.PORT` for cloud deployments
3. **Static Files**: Serve static files BEFORE API routes so they take precedence
4. **Cold Starts**: Free tier services spin down after inactivity (30-60s first load)

## Troubleshooting

### If frontend still doesn't show:
1. Check Render logs: Dashboard → Your Service → Logs
2. Look for "Serving static files from:" message
3. Verify `public/index.html` exists in deployment
4. Check if build completed successfully

### If you see "Cannot GET /":
- The static files aren't being served
- Check the logs for file path errors
- Verify `public/` folder is in the repository

### Common Render Issues:
- **Build fails**: Check `npm run build` works locally
- **Port errors**: Render sets PORT automatically, don't hardcode it
- **404 errors**: Static files not found - check file paths
- **Slow first load**: Normal for free tier (cold start)

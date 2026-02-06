# 🚀 Render Deployment Guide

Complete guide to deploy your Scam Intelligence System on Render.

## 📋 Prerequisites

- GitHub account with your code pushed
- Render account (free tier available at https://render.com)
- Your repository: https://github.com/Shivang1109/scam-intelligence-system

## 🎯 Step-by-Step Deployment

### Step 1: Sign Up for Render

1. Go to https://render.com
2. Click "Get Started for Free"
3. Sign up with GitHub (recommended)
4. Authorize Render to access your repositories

### Step 2: Deploy Using Blueprint

1. Go to https://dashboard.render.com
2. Click "New +" → "Blueprint"
3. Connect your GitHub repository: `Shivang1109/scam-intelligence-system`
4. Render will detect `render.yaml` automatically
5. Click "Apply"

Render will create:
- ✅ Web Service (API)
- ✅ PostgreSQL Database
- ✅ Redis Cache

### Step 3: Wait for Deployment

- Initial deployment takes 5-10 minutes
- Watch the build logs in real-time
- Services will start automatically

### Step 4: Get Your API URL

Once deployed, you'll get a URL like:
```
https://scam-intel-api.onrender.com
```

## 🔧 After Deployment

### 1. Test Your API

```bash
# Check health
curl https://scam-intel-api.onrender.com/health

# Test scam detection
curl -X POST https://scam-intel-api.onrender.com/api/v1/conversations \
  -H "Content-Type: application/json" \
  -H "X-API-Key: test-api-key-12345" \
  -d '{"initialMessage": "URGENT! Your account has been compromised!"}'
```

### 2. Set Up Custom Domain (Optional)

1. Go to your service settings
2. Click "Custom Domain"
3. Add your domain (e.g., `api.yoursite.com`)
4. Update DNS records as instructed

### 3. Configure Environment Variables

Add production API keys:

1. Go to service → "Environment"
2. Add variables:
   - `API_KEY_1` = your-secure-production-key
   - `LOG_LEVEL` = info
   - `NODE_ENV` = production

### 4. Set Up Database

The database is automatically initialized, but you can run migrations:

1. Go to PostgreSQL service
2. Click "Connect" → "External Connection"
3. Use the connection string to run migrations if needed

### 5. Monitor Your Service

**View Logs:**
- Go to service → "Logs"
- Real-time log streaming
- Filter by level (info, error, etc.)

**Check Metrics:**
- Go to service → "Metrics"
- CPU usage
- Memory usage
- Request rate

**Set Up Alerts:**
- Go to service → "Settings" → "Notifications"
- Add email/Slack for downtime alerts

## 💰 Pricing

**Free Tier Includes:**
- 750 hours/month web service
- PostgreSQL database (90 days, then $7/month)
- Redis cache (30 days, then $10/month)

**Paid Plans:**
- Starter: $7/month (web service)
- Standard: $25/month (more resources)

## 🔐 Security Best Practices

### 1. Change Default API Key

Edit `src/api/middleware/auth.ts`:
```typescript
// Remove test key in production
// addAPIKey('test-api-key-12345', 'test', 'Test Client');

// Add production keys
addAPIKey(process.env.API_KEY_1, 'client-1', 'Production Client');
```

### 2. Enable HTTPS Only

Render provides free SSL certificates automatically.

### 3. Set Up Rate Limiting

Already configured in the code (100 requests per 15 minutes).

### 4. Use Environment Variables

Never commit secrets to Git. Use Render's environment variables.

## 📊 Using Your Deployed API

### Update Integration Code

Replace `localhost:3000` with your Render URL:

**JavaScript:**
```javascript
const API_BASE = 'https://scam-intel-api.onrender.com/api/v1';
const API_KEY = 'your-production-api-key';
```

**Python:**
```python
API_BASE = 'https://scam-intel-api.onrender.com/api/v1'
API_KEY = 'your-production-api-key'
```

**cURL:**
```bash
curl -X POST https://scam-intel-api.onrender.com/api/v1/conversations \
  -H "X-API-Key: your-production-api-key" \
  -H "Content-Type: application/json" \
  -d '{"initialMessage": "Test message"}'
```

## 🔄 Continuous Deployment

Render automatically deploys when you push to GitHub:

```bash
# Make changes locally
git add .
git commit -m "Update scam detection rules"
git push origin main

# Render automatically deploys the changes
```

## 🐛 Troubleshooting

### Build Fails

**Check build logs:**
1. Go to service → "Events"
2. Click on failed deployment
3. Review error messages

**Common issues:**
- Missing dependencies: Run `npm install` locally first
- TypeScript errors: Run `npm run build` locally to test
- Environment variables: Check all required vars are set

### Service Won't Start

**Check logs:**
```bash
# View recent logs
# Go to service → "Logs"
```

**Common issues:**
- Database connection: Check `DATABASE_URL` is set
- Port binding: Render sets `PORT` automatically
- Memory limit: Upgrade to larger plan if needed

### Database Connection Issues

**Verify connection:**
1. Go to PostgreSQL service
2. Check "Status" is "Available"
3. Verify connection string in web service env vars

### Slow Performance

**Free tier limitations:**
- Services spin down after 15 minutes of inactivity
- First request after spin-down takes 30-60 seconds
- Upgrade to paid plan for always-on service

## 📈 Scaling

### Horizontal Scaling

1. Go to service → "Settings"
2. Increase "Instance Count"
3. Load balancing is automatic

### Vertical Scaling

1. Go to service → "Settings"
2. Change "Instance Type"
3. Options: Starter, Standard, Pro

### Database Scaling

1. Go to PostgreSQL service
2. Upgrade plan for more storage/connections

## 🔗 Useful Links

- **Dashboard:** https://dashboard.render.com
- **Docs:** https://render.com/docs
- **Status:** https://status.render.com
- **Support:** https://render.com/support

## 📝 Next Steps After Deployment

1. **Test thoroughly** - Run through all API endpoints
2. **Update documentation** - Add your Render URL to README
3. **Set up monitoring** - Configure alerts for downtime
4. **Add custom domain** - Use your own domain name
5. **Integrate with your app** - Update API base URL
6. **Monitor usage** - Check logs and metrics regularly
7. **Plan for scaling** - Upgrade as traffic grows

## 🎉 You're Live!

Your Scam Intelligence System is now running in production on Render!

**Your API:** `https://scam-intel-api.onrender.com`

Share it, integrate it, and start detecting scams at scale! 🚀

---

## Quick Reference Commands

```bash
# Test health
curl https://scam-intel-api.onrender.com/health

# Analyze scam
curl -X POST https://scam-intel-api.onrender.com/api/v1/conversations \
  -H "X-API-Key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"initialMessage": "Your message"}'

# Get conversation
curl https://scam-intel-api.onrender.com/api/v1/conversations/{id} \
  -H "X-API-Key: YOUR_KEY"

# List reports
curl https://scam-intel-api.onrender.com/api/v1/reports \
  -H "X-API-Key: YOUR_KEY"
```

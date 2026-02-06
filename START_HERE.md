# 🚀 START HERE - Quick Local Deployment

## What You Need to Do (3 Steps)

### Step 1: Install Docker Desktop (5 minutes)

**You're on macOS, so:**

1. Go to: **https://www.docker.com/products/docker-desktop**
2. Click **"Download for Mac"**
3. Choose your Mac type:
   - **Intel Mac**: Download Intel version
   - **M1/M2/M3 Mac**: Download Apple Silicon version
4. Open the downloaded file and drag Docker to Applications
5. Open Docker from Applications folder
6. Wait for Docker to start (you'll see a whale icon in your menu bar)

### Step 2: Deploy Your System (2 minutes)

Once Docker is running, open Terminal and run:

```bash
# Navigate to your project
cd /Users/shivangpathak/kiro

# Start everything
docker-compose up -d

# Wait 10 seconds for services to start
sleep 10

# Test it
curl http://localhost:3000/health
```

You should see: `{"status":"ok",...}`

### Step 3: Test Your API (1 minute)

Run the test script:

```bash
./test-local-deployment.sh
```

This will:
- ✅ Check Docker is installed
- ✅ Start all services
- ✅ Test the API
- ✅ Create a test conversation
- ✅ Extract intelligence
- ✅ Generate a report

## That's It! 🎉

Your Scam Intelligence System is now running at:
- **API**: http://localhost:3000
- **Health Check**: http://localhost:3000/health

## Try It Out

### Example 1: Phishing Scam
```bash
curl -X POST http://localhost:3000/api/v1/conversations \
  -H "X-API-Key: test-api-key-12345" \
  -H "Content-Type: application/json" \
  -d '{
    "initialMessage": "URGENT: Your bank account has been compromised! Click here: http://fake-bank.com"
  }'
```

### Example 2: Tech Support Scam
```bash
curl -X POST http://localhost:3000/api/v1/conversations \
  -H "X-API-Key: test-api-key-12345" \
  -H "Content-Type: application/json" \
  -d '{
    "initialMessage": "This is Microsoft Support. Your computer has a virus. Call +1-800-123-4567"
  }'
```

### Example 3: Investment Scam
```bash
curl -X POST http://localhost:3000/api/v1/conversations \
  -H "X-API-Key: test-api-key-12345" \
  -H "Content-Type: application/json" \
  -d '{
    "initialMessage": "Guaranteed 500% returns in 30 days! Limited spots available. Invest now!"
  }'
```

## View Logs

```bash
# Watch API logs in real-time
docker-compose logs -f api

# See what's happening
docker-compose logs -f
```

## Useful Commands

```bash
# Check status
docker-compose ps

# Restart
docker-compose restart

# Stop everything
docker-compose down

# Start again
docker-compose up -d
```

## What's Next?

1. ✅ **Test different scam types** - Try the examples above
2. ✅ **View the logs** - See intelligence extraction in action
3. ✅ **Read the docs** - Check out GETTING_STARTED.md
4. ✅ **Enable monitoring** - Add Grafana dashboards
5. ✅ **Deploy to cloud** - When ready for production

## Need Help?

### Docker Not Installed?
- Download from: https://www.docker.com/products/docker-desktop
- Install and start Docker Desktop
- Run `docker --version` to verify

### Port Already in Use?
```bash
# Kill whatever is using port 3000
lsof -ti:3000 | xargs kill -9

# Then restart
docker-compose up -d
```

### Services Not Starting?
```bash
# Check logs
docker-compose logs

# Restart everything
docker-compose down
docker-compose up -d
```

### API Not Responding?
```bash
# Check if Docker is running
docker info

# Check API logs
docker-compose logs api

# Restart API
docker-compose restart api
```

## Success Checklist

- [ ] Docker Desktop installed and running
- [ ] `docker-compose up -d` completed successfully
- [ ] `curl http://localhost:3000/health` returns OK
- [ ] Test script `./test-local-deployment.sh` passed
- [ ] Created a test conversation
- [ ] Viewed the logs

## You're Done! 🎊

Your Scam Intelligence System is running locally. Start catching scammers!

For more details, see:
- **GETTING_STARTED.md** - Detailed setup guide
- **QUICK_REFERENCE.md** - Command cheat sheet
- **COMPLETE_SYSTEM_GUIDE.md** - Everything about the system

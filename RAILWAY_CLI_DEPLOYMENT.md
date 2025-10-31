# Railway CLI Deployment Guide (No GitHub OAuth Needed)

## ✅ Step 1: Login to Railway

Run this command:
```powershell
railway login
```

**Important:** 
- It will open a browser
- **Login with EMAIL/PASSWORD** (not GitHub!)
- If you don't have a Railway account, click "Sign Up" first

---

## ✅ Step 2: Create New Project

After logging in, run:
```powershell
railway init
```

This will:
- Create a new Railway project
- Link your current directory to Railway
- Set up deployment configuration

**Follow the prompts:**
- Project name: `virdispay-payment-processor` (or your choice)
- Choose "Empty Project" if asked

---

## ✅ Step 3: Add MongoDB Database

In Railway dashboard:
1. Go to your project
2. Click **"New"** → **"Database"** → **"Add MongoDB"**
3. Copy the connection string (you'll need it)

---

## ✅ Step 4: Set Environment Variables

Run this command to open the Railway dashboard:
```powershell
railway variables
```

Or set variables via CLI:
```powershell
railway variables set NODE_ENV=production
railway variables set MONGODB_URI=<your-mongodb-connection-string>
railway variables set JWT_SECRET=<your-jwt-secret>
railway variables set CLIENT_URL=<your-railway-url>
```

**Required Variables:**
```bash
NODE_ENV=production
MONGODB_URI=<railway-mongodb-connection>
JWT_SECRET=<generate-strong-random-key>
CLIENT_URL=https://your-app-name.railway.app
TREASURY_WALLET=0xFe71033686f0d171383452321b1452EA6D457421
SMART_CONTRACT_ADDRESS=<your-contract-address>
POLYGON_RPC_URL=https://polygon-rpc.com
ADMIN_EMAIL=hello@virdispay.com
```

---

## ✅ Step 5: Deploy!

Deploy your app:
```powershell
railway up
```

Or push to Railway's Git remote (if you set it up):
```powershell
git push railway master
```

---

## ✅ Step 6: Get Your App URL

After deployment:
```powershell
railway domain
```

Or check Railway dashboard → Settings → Domains

---

## 📋 Quick Reference Commands

```powershell
# Login (email/password, NOT GitHub)
railway login

# Create project
railway init

# Deploy
railway up

# View logs
railway logs

# Set environment variable
railway variables set KEY=value

# Open dashboard
railway open

# Check status
railway status
```

---

## 🎉 That's It!

Your app will be live at: `https://your-app-name.railway.app`

**No GitHub OAuth needed!** 🚀


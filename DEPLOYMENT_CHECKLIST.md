# 🚀 Railway Deployment Checklist

## ✅ Pre-Deployment Setup Complete

### What's Been Configured:
- ✅ Server updated to serve React build in production
- ✅ Build script added to `package.json` (`npm run build`)
- ✅ Railway configuration file created (`railway.json`)
- ✅ Deployment guide created (`RAILWAY_DEPLOYMENT.md`)

### What You Need to Do:

#### 1. **Push to GitHub** (if not already)
```powershell
git add .
git commit -m "Ready for Railway deployment"
git push origin main
```

#### 2. **Deploy on Railway**
1. Go to [railway.app](https://railway.app) and sign up/login
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Select your repository
4. Railway will automatically:
   - Detect Node.js project
   - Run `npm run build` (builds React app)
   - Run `npm start` (starts server)

#### 3. **Add MongoDB Database**
1. In Railway project → Click **"New"** → **"Database"** → **"Add MongoDB"**
2. Railway creates MongoDB automatically
3. Copy the connection string

#### 4. **Set Environment Variables**
In Railway → Your Service → **Variables** tab, add:

**REQUIRED:**
```bash
NODE_ENV=production
MONGODB_URI=<railway-mongodb-connection-string>
JWT_SECRET=<generate-strong-random-key-32-chars-min>
CLIENT_URL=https://your-app.railway.app
TREASURY_WALLET=0xFe71033686f0d171383452321b1452EA6D457421
SMART_CONTRACT_ADDRESS=<your-deployed-contract-address>
POLYGON_RPC_URL=https://polygon-rpc.com
ADMIN_EMAIL=hello@virdispay.com
```

**IMPORTANT:** Replace `<your-deployed-contract-address>` with your actual Polygon contract address!

#### 5. **Deploy & Test**
- Railway will automatically deploy
- Visit your app: `https://your-app.railway.app`
- Test API: `https://your-app.railway.app/api/health`

#### 6. **Set Custom Domain** (Optional)
- Railway → Settings → Domains
- Add your domain (e.g., `app.virdispay.com`)
- Update DNS records as instructed

## 📝 Important Notes

- **Build Time**: ~3-5 minutes (installs dependencies + builds React)
- **HTTPS**: Automatic with Railway (free SSL certificates)
- **Auto-Deploy**: Railway deploys automatically on every push to main branch
- **Logs**: Available in Railway dashboard in real-time

## 🆘 Quick Troubleshooting

**Build fails?**
- Check Railway logs
- Ensure all dependencies are in `package.json`
- Verify Node.js version (Railway auto-detects)

**Server won't start?**
- Check all required environment variables are set
- Verify MongoDB connection string
- Review server logs in Railway

**React app not loading?**
- Verify `NODE_ENV=production` is set
- Check that build completed successfully
- Review build logs in Railway

---

**Full Guide**: See `RAILWAY_DEPLOYMENT.md` for complete details


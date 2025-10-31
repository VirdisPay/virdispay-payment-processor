# 🚀 Deploy to Railway NOW! (Account Unflagged!)

Your GitHub account is unflagged, so Railway will work perfectly now!

## Step 1: Go to Railway
1. Visit: **https://railway.app**
2. Click **"Login"** or **"Start a New Project"**
3. Click **"Deploy from GitHub repo"**
4. **Authorize Railway** (this should work now!)
5. Select your repo: **`VirdisPay/virdispay-payment-processor`**

## Step 2: Railway Auto-Detects Everything
Railway will automatically:
- ✅ Detect Node.js
- ✅ Read `railway.json` config
- ✅ Run `npm run build` (builds React app)
- ✅ Run `npm start` (starts server)
- ✅ Start deploying!

## Step 3: Add MongoDB Database
1. In Railway dashboard → Click **"New"**
2. Select **"Database"**
3. Click **"Add MongoDB"**
4. Railway creates MongoDB automatically
5. **Copy the connection string** (you'll need it)

## Step 4: Set Environment Variables
In Railway → Your Service → **Variables** tab:

**Add these required variables:**

```bash
NODE_ENV=production
MONGODB_URI=<paste-your-railway-mongodb-connection-string>
JWT_SECRET=<generate-strong-random-key-32-chars>
CLIENT_URL=https://your-app.railway.app
TREASURY_WALLET=0xFe71033686f0d171383452321b1452EA6D457421
SMART_CONTRACT_ADDRESS=<your-deployed-contract-address>
POLYGON_RPC_URL=https://polygon-rpc.com
ADMIN_EMAIL=hello@virdispay.com
PLATFORM_FEE_PERCENTAGE=250
```

**To generate JWT_SECRET:**
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Step 5: Wait for Deployment
- Railway will build and deploy (~3-5 minutes)
- Watch the logs in Railway dashboard
- Wait for "Deployment successful"

## Step 6: Get Your URL
1. Railway dashboard → Your service
2. Click the **domain** or go to **Settings → Domains**
3. Your app will be at: `https://your-app-name.railway.app`

## Step 7: Test!
1. Visit your URL
2. Test API: `https://your-app-name.railway.app/api/health`
3. Should return: `{"status":"OK",...}`

## Step 8: Set Custom Domain (Optional)
1. Railway → Settings → Domains
2. Add your domain (e.g., `app.virdispay.com`)
3. Railway provides DNS records
4. Add them to your domain registrar
5. Wait for DNS propagation (5-30 minutes)

---

## 🎉 You're Live!

Your VirdisPay platform is now deployed and running!

---

## 📋 Quick Checklist:

- [ ] Authorize Railway with GitHub ✅ (should work now!)
- [ ] Select repository
- [ ] Add MongoDB database
- [ ] Set environment variables
- [ ] Wait for deployment
- [ ] Test your app URL
- [ ] (Optional) Set custom domain

---

**Go ahead and try it now!** Railway should work perfectly since your account is unflagged! 🚀


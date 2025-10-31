# Railway Deployment Guide for VirdisPay

This guide will walk you through deploying your VirdisPay payment processor to Railway.

## 🚀 Quick Start

### Prerequisites
1. A Railway account (sign up at [railway.app](https://railway.app))
2. GitHub repository connected to Railway
3. MongoDB database (Railway provides MongoDB or use MongoDB Atlas)
4. All environment variables ready

## 📋 Deployment Steps

### Step 1: Connect Your Repository
1. Go to [railway.app](https://railway.app) and create a new project
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your `voodoohemp-payment-processor` repository
4. Railway will automatically detect it's a Node.js project

### Step 2: Configure Build Settings
Railway will automatically use the `railway.json` configuration:
- **Build Command**: `npm run build` (builds React app)
- **Start Command**: `npm start` (starts Node.js server)

### Step 3: Set Up MongoDB Database
1. In your Railway project, click "New" → "Database" → "Add MongoDB"
2. Railway will create a MongoDB instance and provide a connection string
3. Copy the connection string (you'll need it for environment variables)

### Step 4: Configure Environment Variables
In Railway, go to your service → Variables tab and add:

#### **Required Variables:**
```bash
# Server
PORT=5000
NODE_ENV=production

# Database
MONGODB_URI=<your-railway-mongodb-connection-string>

# JWT Secret (generate a strong random string)
JWT_SECRET=<generate-a-strong-random-secret-key>

# Admin Email
ADMIN_EMAIL=hello@virdispay.com

# Client URL (your Railway domain)
CLIENT_URL=https://your-app-name.railway.app

# Blockchain Configuration
POLYGON_RPC_URL=https://polygon-rpc.com
POLYGON_CHAIN_ID=137
POLYGON_EXPLORER=https://polygonscan.com

# Smart Contract Addresses
SMART_CONTRACT_ADDRESS=0xYourDeployedContractAddress
TREASURY_WALLET=0xFe71033686f0d171383452321b1452EA6D457421

# USDC on Polygon
USDC_CONTRACT_POLYGON=0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174

# Platform Fees (in basis points - 250 = 2.5%)
PLATFORM_FEE_PERCENTAGE=250
```

#### **Optional Variables:**
```bash
# Website URL
WEBSITE_URL=https://virdispay.com

# API Keys (if using)
POLYGON_API_KEY=your-polygonscan-api-key
INFURA_PROJECT_ID=your-infura-project-id
ALCHEMY_API_KEY=your-alchemy-api-key

# Compliance Thresholds
AML_THRESHOLD=10000
KYC_THRESHOLD=5000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Redis (optional, for caching)
REDIS_URL=your-redis-url-if-using

# Email Service (if using)
SMTP_HOST=your-smtp-host
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
```

### Step 5: Deploy
1. Railway will automatically deploy when you push to your main branch
2. Or click "Deploy" in the Railway dashboard
3. Wait for build to complete (~3-5 minutes)
4. Your app will be live at `https://your-app-name.railway.app`

### Step 6: Set Up Custom Domain (Optional)
1. In Railway project settings → Domains
2. Add your custom domain (e.g., `app.virdispay.com`)
3. Railway will provide DNS records to add to your domain registrar
4. Wait for DNS propagation (usually 5-30 minutes)

## 🔧 Post-Deployment Checklist

- [ ] Verify API health: `https://your-app.railway.app/api/health`
- [ ] Test user registration flow
- [ ] Verify MongoDB connection is working
- [ ] Test payment processing (use testnet first!)
- [ ] Configure email service for notifications
- [ ] Set up monitoring/alerts
- [ ] Enable HTTPS (automatic with Railway)

## 🐛 Troubleshooting

### Build Fails
- Check build logs in Railway dashboard
- Ensure `npm run build` completes successfully
- Verify all dependencies are in `package.json`

### Server Won't Start
- Check environment variables are set correctly
- Verify MongoDB connection string
- Check server logs in Railway dashboard

### CORS Errors
- Update `CLIENT_URL` environment variable
- Add your domain to allowed origins in `server/index.js`

### React App Not Loading
- Verify `npm run build` created `client/build` directory
- Check that static file serving is enabled in production
- Review Railway build logs

## 📊 Monitoring

Railway provides built-in monitoring:
- **Logs**: View real-time logs in Railway dashboard
- **Metrics**: CPU, Memory, Network usage
- **Deployments**: History of all deployments

## 🔐 Security Notes

1. **Never commit `.env` files** - Use Railway environment variables
2. **JWT Secret**: Use a strong random string (32+ characters)
3. **Private Keys**: Never store in environment variables for production
4. **Rate Limiting**: Already configured, but adjust thresholds if needed
5. **HTTPS**: Railway provides SSL certificates automatically

## 📞 Support

If you encounter issues:
1. Check Railway logs first
2. Verify all environment variables
3. Check MongoDB connection
4. Review build logs for errors

## 🎉 Next Steps

After successful deployment:
1. Set up CI/CD (Railway auto-deploys on push)
2. Configure custom domain
3. Set up monitoring and alerts
4. Test all features in production environment
5. Set up backup strategy for MongoDB

---

**Need Help?** Check Railway documentation: [docs.railway.app](https://docs.railway.app)


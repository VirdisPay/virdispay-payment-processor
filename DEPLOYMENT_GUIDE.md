# 🚀 VirdisPay Deployment Guide

## Complete Technical Setup for Production

This guide will walk you through deploying VirdisPay to production with full functionality.

---

## 📋 **Prerequisites**

### **Required Software:**
- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- Git
- Truffle CLI: `npm install -g truffle`

### **Required Accounts & API Keys:**
- [Polygon Wallet](https://polygon.technology/) with MATIC for gas fees
- [Infura](https://infura.io/) or [Alchemy](https://alchemy.com/) API keys
- [Polygonscan](https://polygonscan.com/) API key for contract verification
- [MongoDB Atlas](https://www.mongodb.com/atlas) (recommended) or local MongoDB

---

## 🔧 **Step 1: Environment Setup**

### **1.1 Create Environment File**
```bash
cp env.example .env
```

### **1.2 Configure Environment Variables**
Edit `.env` with your actual values:

```env
# Server Configuration
PORT=5000
NODE_ENV=production

# Database (Use MongoDB Atlas for production)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/virdispay-payments

# JWT Secret (Generate a strong secret)
JWT_SECRET=your-super-secure-jwt-secret-key-here

# Client URL
CLIENT_URL=https://app.virdispay.com

# Blockchain Configuration
BLOCKCHAIN_NETWORK=polygon
DEFAULT_BLOCKCHAIN=polygon

# Polygon Configuration (Primary - Low Gas Fees)
POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
POLYGON_CHAIN_ID=137
POLYGON_EXPLORER=https://polygonscan.com

# Private Key (KEEP SECRET! - For contract deployment only)
PRIVATE_KEY=your-private-key-for-deployment

# Smart Contract Addresses (Will be filled after deployment)
PAYMENT_PROCESSOR_CONTRACT_POLYGON=0x...
USDC_CONTRACT_POLYGON=0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174
USDT_CONTRACT_POLYGON=0xc2132D05D31c914a87C6611C10748AEb04B58e8F
DAI_CONTRACT_POLYGON=0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063

# API Keys
ALCHEMY_API_KEY=your-alchemy-api-key
POLYGON_API_KEY=your-polygonscan-api-key

# Platform Fees (in basis points - 250 = 2.5%)
PLATFORM_FEE_PERCENTAGE=250
```

---

## 🏗️ **Step 2: Smart Contract Deployment**

### **2.1 Install Dependencies**
```bash
npm install
```

### **2.2 Deploy to Polygon Mumbai Testnet (Testing)**
```bash
truffle migrate --network polygonMumbai
```

### **2.3 Deploy to Polygon Mainnet (Production)**
```bash
truffle migrate --network polygon
```

### **2.4 Verify Contracts on Polygonscan**
```bash
truffle run verify VirdisPayPaymentProcessor --network polygon
```

### **2.5 Update Environment with Contract Addresses**
After deployment, update your `.env` file with the deployed contract addresses.

---

## 🗄️ **Step 3: Database Setup**

### **3.1 MongoDB Atlas Setup (Recommended)**
1. Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster
3. Create database user
4. Get connection string
5. Update `MONGODB_URI` in `.env`

### **3.2 Local MongoDB Setup**
```bash
# Install MongoDB (Ubuntu/Debian)
sudo apt-get install mongodb

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

---

## 🚀 **Step 4: Server Deployment**

### **4.1 Production Server Setup**
```bash
# Install PM2 for process management
npm install -g pm2

# Start the server
pm2 start server/index.js --name "virdispay-api"

# Save PM2 configuration
pm2 save
pm2 startup
```

### **4.2 Nginx Configuration (Optional)**
Create `/etc/nginx/sites-available/virdispay`:
```nginx
server {
    listen 80;
    server_name api.virdispay.com;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 🌐 **Step 5: Frontend Deployment**

### **5.1 Build React Application**
```bash
cd client
npm install
npm run build
```

### **5.2 Deploy to Hosting Service**
- **Vercel** (Recommended): Connect GitHub repo
- **Netlify**: Drag & drop build folder
- **AWS S3**: Upload build files to S3 bucket

### **5.3 Environment Variables for Frontend**
Set these in your hosting service:
- `REACT_APP_API_URL=https://api.virdispay.com`
- `REACT_APP_POLYGON_RPC_URL=your-polygon-rpc-url`
- `REACT_APP_CONTRACT_ADDRESS=your-contract-address`

---

## 🔐 **Step 6: Security Configuration**

### **6.1 SSL Certificate**
```bash
# Using Let's Encrypt
sudo certbot --nginx -d api.virdispay.com
sudo certbot --nginx -d app.virdispay.com
```

### **6.2 Firewall Configuration**
```bash
# UFW (Ubuntu)
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

### **6.3 Environment Security**
- Use strong JWT secrets
- Enable MongoDB authentication
- Use environment variables for all secrets
- Regularly rotate API keys

---

## 📊 **Step 7: Monitoring & Analytics**

### **7.1 Set Up Monitoring**
```bash
# Install monitoring tools
npm install -g pm2-logrotate
pm2 install pm2-server-monit
```

### **7.2 Configure Logging**
```bash
# Log rotation
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
```

### **7.3 Health Checks**
- Monitor `/api/health` endpoint
- Set up uptime monitoring
- Configure alerts for downtime

---

## 🧪 **Step 8: Testing**

### **8.1 API Testing**
```bash
# Test health endpoint
curl https://api.virdispay.com/api/health

# Test payment creation
curl -X POST https://api.virdispay.com/api/payments/create \
  -H "Content-Type: application/json" \
  -d '{"amount": 100, "currency": "USDC"}'
```

### **8.2 Smart Contract Testing**
```bash
# Run tests
truffle test

# Test on Mumbai testnet
truffle test --network polygonMumbai
```

---

## 🚀 **Step 9: Launch Checklist**

### **✅ Pre-Launch Verification:**
- [ ] Smart contracts deployed and verified
- [ ] Database connected and working
- [ ] API endpoints responding
- [ ] Frontend deployed and accessible
- [ ] SSL certificates installed
- [ ] Environment variables configured
- [ ] Monitoring set up
- [ ] Backup procedures in place
- [ ] Security measures implemented
- [ ] Payment flow tested end-to-end

### **✅ Post-Launch Tasks:**
- [ ] Monitor system performance
- [ ] Check error logs daily
- [ ] Monitor payment transactions
- [ ] Update documentation
- [ ] Gather user feedback
- [ ] Plan feature updates

---

## 🔧 **Troubleshooting**

### **Common Issues:**

**1. Contract Deployment Fails**
- Check private key and RPC URL
- Ensure sufficient MATIC for gas fees
- Verify Truffle configuration

**2. Database Connection Issues**
- Check MongoDB URI format
- Verify network access
- Check authentication credentials

**3. API Not Responding**
- Check PM2 process status: `pm2 status`
- Check logs: `pm2 logs virdispay-api`
- Verify environment variables

**4. Frontend Build Issues**
- Check Node.js version compatibility
- Clear node_modules and reinstall
- Verify environment variables

---

## 📞 **Support & Maintenance**

### **Regular Maintenance Tasks:**
- Weekly security updates
- Monthly dependency updates
- Quarterly security audits
- Regular backup verification

### **Monitoring Metrics:**
- API response times
- Database performance
- Smart contract gas usage
- Payment success rates
- System uptime

---

## 🎯 **Next Steps After Deployment**

1. **Beta Testing**: Start with a small group of merchants
2. **Feedback Collection**: Gather user feedback and iterate
3. **Feature Development**: Add requested features
4. **Marketing**: Promote to cannabis industry
5. **Partnerships**: Build relationships with cannabis businesses
6. **Scaling**: Optimize for increased usage

---

## 💡 **Pro Tips**

- **Start with testnet**: Always test on Mumbai testnet first
- **Monitor gas prices**: Polygon gas prices vary, optimize timing
- **Use CDN**: Deploy frontend assets to CDN for better performance
- **Implement caching**: Use Redis for API response caching
- **Backup regularly**: Set up automated database backups
- **Document everything**: Keep detailed deployment documentation

---

**🎉 Congratulations! Your VirdisPay payment processor is now live and ready to serve the cannabis industry with 99.98% gas fee savings!**




# Environment Variables for Render.com

Add these in Render → Your Service → Environment Variables:

## 🔴 REQUIRED (Must Add):

### Server Config:
```
NODE_ENV=production
PORT=5000
```

### Database:
```
MONGODB_URI=<you'll-get-this-from-render-mongodb>
```
**Note:** Add MongoDB service in Render first, then copy the connection string here!

### Security:
```
JWT_SECRET=<generate-strong-random-key>
```
**Generate one:**
- Use: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- Or use a strong random string (32+ characters)

### Client URL:
```
CLIENT_URL=https://virdispay-payment-processor.onrender.com
```
(Update with your actual Render URL after deployment)

### Admin:
```
ADMIN_EMAIL=hello@virdispay.com
```

### Blockchain - Polygon:
```
POLYGON_RPC_URL=https://polygon-rpc.com
POLYGON_CHAIN_ID=137
POLYGON_EXPLORER=https://polygonscan.com
```

### Smart Contract:
```
SMART_CONTRACT_ADDRESS=<your-deployed-contract-address>
TREASURY_WALLET=0xFe71033686f0d171383452321b1452EA6D457421
```

### Token Addresses:
```
USDC_CONTRACT_POLYGON=0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174
USDT_CONTRACT_POLYGON=0xc2132D05D31c914a87C6611C10748AEb04B58e8F
```

### Platform Fee:
```
PLATFORM_FEE_PERCENTAGE=250
```

---

## 🟡 OPTIONAL (Add if needed):

### Compliance:
```
AML_THRESHOLD=10000
KYC_THRESHOLD=5000
```

### Rate Limiting:
```
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Website URL:
```
WEBSITE_URL=https://virdispay.com
```

---

## 📋 Quick Steps:

1. **Deploy service first** (even without all variables)
2. **Add MongoDB service** in Render
3. **Copy MongoDB connection string**
4. **Add all environment variables** above
5. **Redeploy** if needed

---

## ⚠️ Important Notes:

- **MONGODB_URI:** You'll need to add MongoDB service in Render first!
- **JWT_SECRET:** Generate a strong random key (don't use example values)
- **CLIENT_URL:** Update this to your actual Render URL after deployment
- **SMART_CONTRACT_ADDRESS:** Use your actual deployed contract address

---

**Add these variables in Render now, or you can add them after the service deploys!**


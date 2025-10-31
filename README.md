# VirdisPay - Crypto Payment Processor

VirdisPay is a cryptocurrency payment processor designed for high-risk industries including hemp, CBD, and cannabis businesses. Built with modern technologies and deployed to production.

## 🌐 Live Deployment

**Production URL:** https://virdispay-payment-processor.onrender.com

## 📋 Features

- ✅ Multi-chain crypto payments (Polygon primary, Ethereum secondary)
- ✅ Automated fee collection with dynamic subscription tiers
- ✅ Smart contract integration on Polygon Mainnet
- ✅ Merchant onboarding with KYC/AML compliance
- ✅ Email notifications via SendGrid
- ✅ MongoDB database for transaction records
- ✅ Admin dashboard for platform management
- ✅ Real-time transaction tracking

## 🚀 Tech Stack

- **Frontend:** React, TypeScript
- **Backend:** Node.js, Express
- **Database:** MongoDB Atlas
- **Blockchain:** Polygon, Ethereum
- **Smart Contracts:** Solidity (OpenZeppelin)
- **Email:** SendGrid
- **Deployment:** Render.com

## 📝 Environment Variables

See `env.example` for all required environment variables.

Key variables:
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for authentication
- `SMART_CONTRACT_ADDRESS` - Deployed contract on Polygon
- `TREASURY_WALLET` - Treasury wallet for fee collection
- SendGrid SMTP credentials

## 🔗 Smart Contract

**Address:** `0x50bD2E580c6C01723F622E3Ea4160FA29FBf4F3A`  
**Network:** Polygon Mainnet  
**View on Polygonscan:** https://polygonscan.com/address/0x50bD2E580c6C01723F622E3Ea4160FA29FBf4F3A

## 📖 Documentation

See individual documentation files for deployment, testing, and configuration guides.

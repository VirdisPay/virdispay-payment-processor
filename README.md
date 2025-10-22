# VirdisPay - Professional Crypto Payment Processor

## 🌿 High-Risk Industry Specialist

VirdisPay is a professional crypto payment processing platform built specifically for high-risk industries including cannabis, CBD, vaping, nutraceuticals, adult content, and other payment-restricted businesses.

## 🚀 Key Features

- **Smart Payment Routing** - 99.98% gas fee savings
- **Multi-Wallet Support** - MetaMask, Trust Wallet, Coinbase, manual entry
- **Stablecoin Payments** - USDC, USDT, DAI support
- **Non-Custodial Security** - Your keys, your crypto
- **High-Risk Industry Focus** - Built for rejected businesses
- **E-commerce Integration** - Shopify, WooCommerce, custom websites

## 💰 Competitive Pricing

- **Free Tier**: 2.5% transaction fees
- **Starter**: $29/month + 1.5% fees
- **Professional**: $99/month + 1.0% fees
- **Enterprise**: $299/month + 0.5% fees

*Compare to traditional high-risk processors charging 10-15%*

## 🏗️ Architecture

- **Backend**: Node.js + Express API
- **Frontend**: React + TypeScript
- **Database**: MongoDB Atlas
- **Blockchain**: Polygon Network (primary)
- **Smart Contracts**: Solidity
- **Website**: Static HTML/CSS/JS

## 🛡️ Security Features

- **Non-custodial** - No private key storage
- **Smart contract audits** - Audited code
- **Rate limiting** - DDoS protection
- **Input validation** - SQL injection prevention
- **CORS protection** - Cross-origin security

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- MongoDB Atlas account
- Polygon RPC access (Alchemy/Infura)

### Installation
```bash
# Clone repository
git clone https://github.com/yourusername/virdispay-payment-processor.git

# Install dependencies
npm install

# Configure environment
cp env.example .env
# Edit .env with your values

# Start development server
npm start
```

## 📁 Project Structure

```
virdispay-payment-processor/
├── server/                 # Backend API
│   ├── models/            # Database models
│   ├── routes/            # API endpoints
│   ├── services/          # Business logic
│   └── middleware/        # Security & validation
├── client/                # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── services/      # API services
│   │   └── utils/         # Helper functions
├── website/               # Marketing website
├── contracts/             # Smart contracts
└── docs/                  # Documentation
```

## 🔧 Environment Variables

Required environment variables (see `env.example`):

```env
# Database
MONGODB_URI=mongodb+srv://...

# Security
JWT_SECRET=your-secret-key

# Blockchain
POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/...

# URLs
CLIENT_URL=https://app.virdispay.com
WEBSITE_URL=https://virdispay.com
```

## 🧪 Testing

```bash
# Run tests
npm test

# Test payment flow
npm run test:payments

# Test smart contracts
truffle test
```

## 📚 Documentation

- [Deployment Guide](DEPLOYMENT_GUIDE.md)
- [API Documentation](docs/API.md)
- [Smart Contract Guide](docs/SMART_CONTRACTS.md)
- [Security Guide](docs/SECURITY.md)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Email**: hello@virdispay.com
- **Website**: https://virdispay.com
- **Documentation**: [docs.virdispay.com](https://docs.virdispay.com)

## 🎯 Target Industries

- **Cannabis & CBD** - Medical and adult-use
- **Vaping & E-Liquids** - Vape shops and products
- **Nutraceuticals** - Supplements and wellness
- **Adult Content** - Entertainment platforms
- **Gaming & Gambling** - Online casinos
- **Forex & Trading** - Financial services
- **Crypto Services** - Exchanges and DeFi

---

**Built with ❤️ for the cannabis industry and high-risk businesses rejected by traditional payment processors.**
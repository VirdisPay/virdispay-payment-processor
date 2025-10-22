# 🚀 Polygon Migration Guide

## Why Polygon?

### Gas Fee Comparison:
| Blockchain | Average Gas Fee | Your Savings |
|-----------|----------------|--------------|
| **Polygon** (RECOMMENDED) | **$0.001 - $0.01** | **99.98%** ✅ |
| Ethereum Mainnet | $20 - $200 | 0% ❌ |
| BSC | $0.10 - $0.50 | 95% |

**Result:** Polygon saves you and your customers **99.98%** on transaction fees!

---

## 🎯 Migration Overview

We've updated your VirDisPay Payment Processor to use **Polygon** as the primary blockchain, with Ethereum Mainnet as an optional fallback for large transactions (>$10k).

### What Changed:

1. **Environment Configuration** - Updated to use Polygon RPC endpoints
2. **Smart Contracts** - Ready to deploy on Polygon
3. **Backend Services** - Updated to connect to Polygon network
4. **Transaction Model** - Defaults to Polygon blockchain
5. **Multi-Chain Support** - Can still use Ethereum if needed

---

## ⚙️ Setup Instructions

### Step 1: Update Environment Variables

Copy the new `.env.example` to `.env` and update:

```bash
# Blockchain Configuration
BLOCKCHAIN_NETWORK=polygon
DEFAULT_BLOCKCHAIN=polygon

# Polygon Configuration (Primary)
POLYGON_RPC_URL=https://polygon-rpc.com
POLYGON_CHAIN_ID=137

# Get a free RPC from:
# - https://polygon-rpc.com (Free, no signup)
# - https://www.alchemy.com (Free tier: 300M requests/month)
# - https://infura.io (Free tier available)

# Your Private Key (KEEP SECRET!)
PRIVATE_KEY=your_private_key_here

# Polygon API Key (for contract verification)
POLYGON_API_KEY=get_from_polygonscan_com
```

### Step 2: Get Free Polygon RPC Access

**Option A: Alchemy (Recommended)**
1. Go to https://www.alchemy.com
2. Sign up for free
3. Create a new app on "Polygon Mainnet"
4. Copy the HTTPS URL
5. Update `POLYGON_RPC_URL` in `.env`

**Option B: Public RPC (No signup)**
- Use `https://polygon-rpc.com` (already in config)
- Or `https://rpc-mainnet.maticvigil.com`

### Step 3: Fund Your Wallet with MATIC

You need MATIC tokens to pay for gas fees on Polygon:

**Amount Needed:**
- **For Testing**: 1 MATIC (~$0.50) = ~50,000 transactions
- **For Production**: 10 MATIC (~$5) = ~500,000 transactions

**How to Get MATIC:**

1. **Buy on Exchange:**
   - Coinbase, Binance, Kraken, etc.
   - Send to your wallet address

2. **Bridge from Ethereum:**
   - https://wallet.polygon.technology/polygon/bridge
   - Bridge ETH → MATIC

3. **Use Polygon Faucet (Testnet Only):**
   - https://faucet.polygon.technology
   - Get free Mumbai testnet MATIC

### Step 4: Deploy Smart Contracts to Polygon

#### For Testing (Polygon Mumbai Testnet):

```bash
# Get free testnet MATIC from faucet
# https://faucet.polygon.technology

# Deploy to Mumbai testnet
truffle migrate --network polygonMumbai

# Verify contract
truffle run verify VoodooHempPaymentProcessor --network polygonMumbai
```

#### For Production (Polygon Mainnet):

```bash
# Make sure you have MATIC in your wallet!

# Deploy to Polygon mainnet
truffle migrate --network polygon

# Verify contract on Polygonscan
truffle run verify VoodooHempPaymentProcessor --network polygon

# Save the contract addresses to .env
```

### Step 5: Update Contract Addresses

After deployment, update your `.env` file with the deployed contract addresses:

```bash
# From deployment output, update these:
PAYMENT_PROCESSOR_CONTRACT_POLYGON=0x_your_deployed_address
```

### Step 6: Test the Integration

```bash
# Start the server
npm run server

# Test payment creation
curl -X POST http://localhost:5000/api/payments/request \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "amount": 100,
    "currency": "USD",
    "description": "Test payment",
    "customerEmail": "test@example.com",
    "blockchain": "polygon"
  }'
```

---

## 🔧 Supported Blockchains

### Primary: Polygon (Default)
- **Chain ID**: 137
- **Gas Fee**: ~$0.01
- **Speed**: 2 second blocks
- **Use For**: All transactions under $10,000
- **Stablecoins**: USDC, USDT, DAI

### Secondary: Ethereum (Optional)
- **Chain ID**: 1
- **Gas Fee**: ~$50+
- **Speed**: 12 second blocks
- **Use For**: Large transactions over $10,000 (if desired)
- **Stablecoins**: USDC, USDT, DAI

### Testing: Polygon Mumbai Testnet
- **Chain ID**: 80001
- **Gas Fee**: Free
- **Speed**: 2 second blocks
- **Use For**: Development and testing
- **Faucet**: https://faucet.polygon.technology

---

## 📊 Stablecoin Addresses

### Polygon Mainnet:
- **USDC**: `0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174`
- **USDT**: `0xc2132D05D31c914a87C6611C10748AEb04B58e8F`
- **DAI**: `0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063`

### Ethereum Mainnet:
- **USDC**: `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`
- **USDT**: `0xdAC17F958D2ee523a2206206994597C13D831ec7`
- **DAI**: `0x6B175474E89094C44Da98b954EedeAC495271d0F`

---

## 🎯 How Blockchain Selection Works

The system automatically selects the best blockchain based on transaction amount:

```javascript
// Small transactions (<$10k) → Polygon (low fees)
if (amount < 10000) {
  blockchain = 'polygon';
  estimatedGas = '$0.01';
}

// Large transactions (>$10k) → Ethereum (optional)
else {
  blockchain = 'ethereum'; // or still use 'polygon' for low fees
  estimatedGas = '$50+';
}
```

**You can override this in settings to always use Polygon!**

---

## 🔐 Security Notes

1. **Private Keys**:
   - Never commit `.env` file to Git
   - Use different keys for testnet and mainnet
   - Store production keys in secure vault (AWS Secrets Manager, etc.)

2. **RPC Endpoints**:
   - Use paid RPC for production (Alchemy, Infura)
   - Free RPCs can have rate limits
   - Set up backup RPC URLs

3. **Gas Price Management**:
   - Polygon gas is cheap, so max gas price can be high
   - Monitor gas prices: https://polygonscan.com/gastracker

---

## 📈 Performance Benefits

### Before (Ethereum):
- **Gas Fee**: $50 per transaction
- **For 1000 transactions**: $50,000 in gas fees
- **Customer Experience**: Expensive, slow

### After (Polygon):
- **Gas Fee**: $0.01 per transaction
- **For 1000 transactions**: $10 in gas fees
- **Customer Experience**: Cheap, fast, smooth
- **Savings**: **$49,990** (99.98%)

---

## 🆘 Troubleshooting

### Issue: "Insufficient funds for gas"
**Solution**: Add more MATIC to your wallet

### Issue: "Network error"
**Solution**: Check RPC URL, try backup RPC

### Issue: "Transaction underpriced"
**Solution**: Increase gas price in `truffle-config.js`

### Issue: "Contract verification failed"
**Solution**: Make sure you have `POLYGON_API_KEY` from Polygonscan

---

## 📚 Resources

- **Polygon Docs**: https://docs.polygon.technology
- **Polygon RPC**: https://polygon-rpc.com
- **Polygonscan**: https://polygonscan.com
- **Gas Tracker**: https://polygonscan.com/gastracker
- **Alchemy**: https://www.alchemy.com
- **Faucet (Testnet)**: https://faucet.polygon.technology

---

## ✅ Migration Checklist

- [ ] Update `.env` with Polygon configuration
- [ ] Get Polygon RPC URL (Alchemy or public)
- [ ] Fund wallet with MATIC (1 MATIC for testing, 10+ for production)
- [ ] Deploy contracts to Polygon Mumbai (testnet)
- [ ] Test payment flow on testnet
- [ ] Deploy contracts to Polygon Mainnet
- [ ] Update contract addresses in `.env`
- [ ] Test payment flow on mainnet
- [ ] Monitor first transactions on Polygonscan
- [ ] Celebrate 99.98% gas savings! 🎉

---

## 🎉 You're Now Using Polygon!

Your customers will enjoy:
- ✅ **Ultra-low fees** ($0.01 vs $50)
- ✅ **Fast confirmations** (2 seconds vs 12 seconds)
- ✅ **Smooth experience** (no more expensive gas fees)

**Your business will save thousands of dollars in gas fees!**

---

Need help? The system is already configured and ready to go. Just:
1. Update your `.env` file
2. Fund your wallet with MATIC
3. Deploy the contracts
4. Start processing payments at 99.98% lower cost!

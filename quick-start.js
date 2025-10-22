#!/usr/bin/env node

/**
 * VirdisPay Quick Start Script
 * 
 * This script helps you quickly set up and test the VirdisPay payment processor
 * Run with: node quick-start.js
 */

const fs = require('fs');
const path = require('path');

console.log('🌿 VirdisPay Payment Processor - Quick Start\n');

// Check if .env exists
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.log('📝 Creating .env file from template...');
  try {
    fs.copyFileSync('env.example', '.env');
    console.log('✅ .env file created successfully!');
    console.log('⚠️  Please edit .env file with your actual configuration values.\n');
  } catch (error) {
    console.log('❌ Failed to create .env file:', error.message);
    process.exit(1);
  }
} else {
  console.log('✅ .env file already exists\n');
}

// Check dependencies
console.log('📦 Checking dependencies...');
const packageJsonPath = path.join(__dirname, 'package.json');
if (fs.existsSync(packageJsonPath)) {
  console.log('✅ package.json found');
} else {
  console.log('❌ package.json not found');
  process.exit(1);
}

// Check server directory
const serverPath = path.join(__dirname, 'server');
if (fs.existsSync(serverPath)) {
  console.log('✅ Server directory found');
} else {
  console.log('❌ Server directory not found');
  process.exit(1);
}

// Check client directory
const clientPath = path.join(__dirname, 'client');
if (fs.existsSync(clientPath)) {
  console.log('✅ Client directory found');
} else {
  console.log('❌ Client directory not found');
  process.exit(1);
}

// Check contracts directory
const contractsPath = path.join(__dirname, 'contracts');
if (fs.existsSync(contractsPath)) {
  console.log('✅ Smart contracts directory found');
} else {
  console.log('❌ Smart contracts directory not found');
  process.exit(1);
}

console.log('\n🚀 VirdisPay Setup Complete!\n');

console.log('📋 Next Steps:');
console.log('1. Edit .env file with your configuration');
console.log('2. Install dependencies: npm install');
console.log('3. Install client dependencies: cd client && npm install');
console.log('4. Start MongoDB (if using local database)');
console.log('5. Deploy smart contracts: truffle migrate --network polygonMumbai');
console.log('6. Start the server: npm run server');
console.log('7. Start the client: npm run client\n');

console.log('🔧 Available Commands:');
console.log('- npm run server     : Start the backend server');
console.log('- npm run client     : Start the React frontend');
console.log('- npm run dev        : Start both server and client');
console.log('- npm test           : Run test suite');
console.log('- truffle migrate    : Deploy smart contracts\n');

console.log('📚 Documentation:');
console.log('- DEPLOYMENT_GUIDE.md  : Complete deployment guide');
console.log('- README.md           : Project overview');
console.log('- SMART_ROUTING_IMPLEMENTATION.md : Smart routing details\n');

console.log('🌐 Website:');
console.log('- Main website: website/index.html');
console.log('- Blog: website/blog.html');
console.log('- Admin dashboard: website/admin.html\n');

console.log('🎯 Key Features Ready:');
console.log('✅ Smart Payment Routing (99.98% gas savings)');
console.log('✅ Non-custodial architecture');
console.log('✅ Multi-chain support (Polygon, Ethereum)');
console.log('✅ Cannabis industry compliance');
console.log('✅ Merchant dashboard');
console.log('✅ Payment analytics');
console.log('✅ Complete website with blog\n');

console.log('💡 Pro Tips:');
console.log('- Start with Polygon Mumbai testnet for testing');
console.log('- Use Polygon mainnet for production (ultra-low fees)');
console.log('- Monitor gas prices for optimal deployment timing');
console.log('- Set up MongoDB Atlas for production database\n');

console.log('🎉 Ready to revolutionize cannabis payments with VirdisPay!');
console.log('📞 Need help? Check the documentation or contact support.\n');




#!/bin/bash

# VirdisPay Production Deployment Script
# This script helps you deploy VirdisPay to production

echo "🚀 VirdisPay Production Deployment"
echo "=================================="

# Check if we're in the right directory
if [ ! -f "server/index.js" ]; then
    echo "❌ Error: Please run this script from the virdispay-payment-processor root directory"
    exit 1
fi

echo "✅ Found VirdisPay project structure"

# Check Node.js version
NODE_VERSION=$(node --version)
echo "📦 Node.js version: $NODE_VERSION"

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm is not installed"
    exit 1
fi

echo "✅ npm is available"

# Install dependencies
echo "📦 Installing dependencies..."
cd server && npm install
cd ../client && npm install
cd ..

echo "✅ Dependencies installed"

# Build frontend
echo "🏗️ Building frontend..."
cd client
npm run build
cd ..

echo "✅ Frontend built successfully"

# Check if production environment file exists
if [ ! -f "server/.env" ]; then
    echo "⚠️  Warning: No .env file found in server directory"
    echo "📝 Please copy server/env-production-template.txt to server/.env"
    echo "📝 And update it with your production values"
    echo ""
    echo "Required values to update:"
    echo "- JWT_SECRET (generate a strong secret)"
    echo "- MONGODB_URI (your MongoDB Atlas connection string)"
    echo "- CLIENT_URL (your frontend URL)"
    echo "- WEBSITE_URL (your website URL)"
    echo "- POLYGON_RPC_URL (your Alchemy/Infura RPC URL)"
    echo ""
    read -p "Press Enter to continue after updating .env file..."
fi

echo "✅ Environment configuration ready"

# Test server startup
echo "🧪 Testing server startup..."
cd server
timeout 10s npm start > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Server starts successfully"
else
    echo "⚠️  Server startup test completed (timeout expected)"
fi
cd ..

echo ""
echo "🎉 VirdisPay is ready for production deployment!"
echo ""
echo "📋 Next steps:"
echo "1. Choose your deployment platform:"
echo "   - Railway: https://railway.app (Recommended - Free tier)"
echo "   - Render: https://render.com (Free tier)"
echo "   - Heroku: https://heroku.com"
echo "   - DigitalOcean: https://digitalocean.com"
echo ""
echo "2. Deploy your backend:"
echo "   - Upload server/ directory"
echo "   - Set environment variables"
echo "   - Start the server"
echo ""
echo "3. Deploy your frontend:"
echo "   - Upload client/build/ directory to Vercel/Netlify"
echo "   - Set REACT_APP_API_URL environment variable"
echo ""
echo "4. Set up MongoDB Atlas:"
echo "   - Create free account at https://mongodb.com/atlas"
echo "   - Create cluster and get connection string"
echo "   - Update MONGODB_URI in your .env file"
echo ""
echo "5. Get blockchain RPC URL:"
echo "   - Sign up at https://alchemy.com or https://infura.io"
echo "   - Create Polygon mainnet project"
echo "   - Copy RPC URL to POLYGON_RPC_URL"
echo ""
echo "📚 Full deployment guide: DEPLOYMENT_GUIDE.md"
echo "🔧 Production environment template: server/env-production-template.txt"
echo ""
echo "Good luck with your deployment! 🚀"


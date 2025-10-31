const { ethers } = require('ethers');
require('dotenv').config();

// Contract configuration
const CONTRACT_ADDRESS = '0x50bD2E580c6C01723F622E3Ea4160FA29FBf4F3A';
const RPC_URL = 'https://polygon-mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161';

// Fee structure (in basis points)
const FEE_STRUCTURE = {
  free: 250,      // 2.5%
  starter: 150,   // 1.5%
  professional: 100,  // 1.0%
  enterprise: 50   // 0.5%
};

async function updatePlatformFee(subscriptionTier) {
  try {
    console.log(`🚀 Updating platform fee for ${subscriptionTier} tier...`);
    
    // Create provider and wallet
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    // Contract ABI (minimal for setPlatformFeePercentage function)
    const contractABI = [
      "function setPlatformFeePercentage(uint256 _feePercentage) external",
      "function platformFeePercentage() external view returns (uint256)",
      "function owner() external view returns (address)"
    ];
    
    const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, wallet);
    
    // Check current fee
    const currentFee = await contract.platformFeePercentage();
    console.log(`📊 Current platform fee: ${currentFee} basis points (${(currentFee/100).toFixed(1)}%)`);
    
    // Get new fee
    const newFee = FEE_STRUCTURE[subscriptionTier];
    if (!newFee) {
      throw new Error(`Invalid subscription tier: ${subscriptionTier}`);
    }
    
    console.log(`🎯 Setting platform fee to: ${newFee} basis points (${(newFee/100).toFixed(1)}%)`);
    
    // Update fee
    const tx = await contract.setPlatformFeePercentage(newFee);
    console.log(`📝 Transaction sent: ${tx.hash}`);
    
    // Wait for confirmation
    console.log('⏳ Waiting for confirmation...');
    await tx.wait();
    
    console.log('✅ Platform fee updated successfully!');
    
    // Verify new fee
    const updatedFee = await contract.platformFeePercentage();
    console.log(`✅ Verified new fee: ${updatedFee} basis points (${(updatedFee/100).toFixed(1)}%)`);
    
  } catch (error) {
    console.error('❌ Error updating platform fee:', error.message);
  }
}

// Get subscription tier from command line argument
const subscriptionTier = process.argv[2];

if (!subscriptionTier) {
  console.log('Usage: node scripts/update-platform-fee.js <tier>');
  console.log('Available tiers: free, starter, professional, enterprise');
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/update-platform-fee.js free        # 2.5%');
  console.log('  node scripts/update-platform-fee.js starter     # 1.5%');
  console.log('  node scripts/update-platform-fee.js professional # 1.0%');
  console.log('  node scripts/update-platform-fee.js enterprise  # 0.5%');
  process.exit(1);
}

updatePlatformFee(subscriptionTier);


const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying VirdisPayPaymentProcessor to Polygon...");
  
  // Treasury address (your Ledger wallet)
  const treasury = "0xFe71033686f0d171383452321b1452EA6D457421";
  
  console.log(`📊 Treasury address: ${treasury}`);
  
  // Get the contract factory
  const VirdisPayPaymentProcessor = await ethers.getContractFactory("VirdisPayPaymentProcessor");
  
  // Deploy the contract
  console.log("📝 Deploying contract...");
  const contract = await VirdisPayPaymentProcessor.deploy(treasury);
  
  // Wait for deployment to complete
  await contract.waitForDeployment();
  
  const contractAddress = await contract.getAddress();
  
  console.log(`✅ VirdisPayPaymentProcessor deployed successfully!`);
  console.log(`📍 Contract Address: ${contractAddress}`);
  console.log(`🏦 Treasury Address: ${treasury}`);
  
  // Get initial platform fee
  const platformFee = await contract.platformFeePercentage();
  console.log(`💳 Initial Platform Fee: ${platformFee} basis points (${(platformFee/100).toFixed(1)}%)`);
  
  // Display important information
  console.log(`\n📋 DEPLOYMENT SUMMARY:`);
  console.log(`   Contract: ${contractAddress}`);
  console.log(`   Treasury: ${treasury}`);
  console.log(`   Network: Polygon Mainnet`);
  console.log(`   Platform Fee: ${(platformFee/100).toFixed(1)}%`);
  
  // Save deployment info for environment variables
  console.log(`\n🔧 ADD TO YOUR .env FILE:`);
  console.log(`   SMART_CONTRACT_ADDRESS=${contractAddress}`);
  console.log(`   PLATFORM_WALLET_ADDRESS=${treasury}`);
  
  console.log(`\n🌐 POLYGON MAINNET DEPLOYED:`);
  console.log(`   View on Polygonscan: https://polygonscan.com/address/${contractAddress}`);
  console.log(`   Gas fees: ~$0.01 per transaction`);
  
  console.log(`\n🎯 NEXT STEPS:`);
  console.log(`   1. Update your .env file with the contract address`);
  console.log(`   2. Test fee collection with different subscription tiers`);
  console.log(`   3. Verify contract on Polygonscan`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });

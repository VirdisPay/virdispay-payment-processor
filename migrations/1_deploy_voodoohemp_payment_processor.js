const VirdisPayPaymentProcessor = artifacts.require("VirdisPayPaymentProcessor");

module.exports = async function (deployer, network, accounts) {
  console.log(`🚀 Deploying to ${network} network...`);
  
  // Treasury address (platform wallet for fee collection)
  // Use the first account as treasury for now, but should be your business wallet
  const treasury = "0xFe71033686f0d171383452321b1452EA6D457421"; // Your Ledger Treasury wallet
  
  console.log(`📊 Treasury address: ${treasury}`);
  console.log(`💰 Network: ${network}`);
  console.log(`🔗 Chain ID: ${await web3.eth.getChainId()}`);
  
  try {
    // Deploy the contract
    await deployer.deploy(VirdisPayPaymentProcessor, treasury);
    
    const contract = await VirdisPayPaymentProcessor.deployed();
    const contractAddress = contract.address;
    
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
    console.log(`   Network: ${network}`);
    console.log(`   Platform Fee: ${(platformFee/100).toFixed(1)}%`);
    
    // Save deployment info for environment variables
    console.log(`\n🔧 ADD TO YOUR .env FILE:`);
    console.log(`   SMART_CONTRACT_ADDRESS=${contractAddress}`);
    console.log(`   PLATFORM_WALLET_ADDRESS=${treasury}`);
    
    // Network-specific information
    if (network === 'polygon') {
      console.log(`\n🌐 POLYGON MAINNET DEPLOYED:`);
      console.log(`   View on Polygonscan: https://polygonscan.com/address/${contractAddress}`);
      console.log(`   Gas fees: ~$0.01 per transaction`);
    } else if (network === 'polygonMumbai') {
      console.log(`\n🧪 POLYGON MUMBAI TESTNET DEPLOYED:`);
      console.log(`   View on Polygonscan: https://mumbai.polygonscan.com/address/${contractAddress}`);
      console.log(`   Test with Mumbai MATIC tokens`);
    } else if (network === 'ethereum') {
      console.log(`\n⛽ ETHEREUM MAINNET DEPLOYED:`);
      console.log(`   View on Etherscan: https://etherscan.io/address/${contractAddress}`);
      console.log(`   Gas fees: ~$50+ per transaction`);
    }
    
    console.log(`\n🎯 NEXT STEPS:`);
    console.log(`   1. Update your .env file with the contract address`);
    console.log(`   2. Set PLATFORM_PRIVATE_KEY for dynamic fee updates`);
    console.log(`   3. Test fee collection with different subscription tiers`);
    console.log(`   4. Verify contract on block explorer`);
    
  } catch (error) {
    console.error(`❌ Deployment failed:`, error);
    throw error;
  }
};


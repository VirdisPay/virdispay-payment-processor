// Test Onboarding Flow
// This script tests the complete merchant onboarding process

const { ethers } = require('ethers');
require('dotenv').config();

async function testOnboardingFlow() {
  console.log('🚀 Testing VirdisPay Onboarding Flow');
  console.log('=====================================');

  // Test 1: Check if components exist
  console.log('\n📋 1. Checking Component Files...');
  
  const fs = require('fs');
  const path = require('path');
  
  const components = [
    'client/src/components/OnboardingFlow.tsx',
    'client/src/components/SubscriptionSelection.tsx',
    'client/src/components/WalletConnectionOnboarding.tsx',
    'client/src/components/OnboardingFlow.css',
    'client/src/components/SubscriptionSelection.css',
    'client/src/components/WalletConnectionOnboarding.css',
    'server/routes/profile.js'
  ];
  
  let allComponentsExist = true;
  components.forEach(component => {
    const exists = fs.existsSync(component);
    console.log(`   ${exists ? '✅' : '❌'} ${component}`);
    if (!exists) allComponentsExist = false;
  });
  
  if (allComponentsExist) {
    console.log('   ✅ All onboarding components exist');
  } else {
    console.log('   ❌ Some components are missing');
    return;
  }

  // Test 2: Check User model has new fields
  console.log('\n📋 2. Checking User Model...');
  
  const userModelPath = 'server/models/User.js';
  const userModelContent = fs.readFileSync(userModelPath, 'utf8');
  
  const requiredFields = [
    'subscriptionTier',
    'walletMethod', 
    'hasCompletedOnboarding'
  ];
  
  let allFieldsExist = true;
  requiredFields.forEach(field => {
    const exists = userModelContent.includes(field);
    console.log(`   ${exists ? '✅' : '❌'} ${field} field`);
    if (!exists) allFieldsExist = false;
  });
  
  if (allFieldsExist) {
    console.log('   ✅ User model has all required fields');
  } else {
    console.log('   ❌ User model missing required fields');
    return;
  }

  // Test 3: Check App.tsx integration
  console.log('\n📋 3. Checking App.tsx Integration...');
  
  const appPath = 'client/src/App.tsx';
  const appContent = fs.readFileSync(appPath, 'utf8');
  
  const requiredIntegrations = [
    'OnboardingFlow',
    'showOnboarding',
    'handleOnboardingComplete',
    'handleOnboardingSkip'
  ];
  
  let allIntegrationsExist = true;
  requiredIntegrations.forEach(integration => {
    const exists = appContent.includes(integration);
    console.log(`   ${exists ? '✅' : '❌'} ${integration}`);
    if (!exists) allIntegrationsExist = false;
  });
  
  if (allIntegrationsExist) {
    console.log('   ✅ App.tsx has all required integrations');
  } else {
    console.log('   ❌ App.tsx missing required integrations');
    return;
  }

  // Test 4: Check server route registration
  console.log('\n📋 4. Checking Server Route Registration...');
  
  const serverPath = 'server/index.js';
  const serverContent = fs.readFileSync(serverPath, 'utf8');
  
  const hasProfileRoute = serverContent.includes("app.use('/api/profile', require('./routes/profile'))");
  console.log(`   ${hasProfileRoute ? '✅' : '❌'} Profile route registered`);
  
  if (hasProfileRoute) {
    console.log('   ✅ Profile route is registered');
  } else {
    console.log('   ❌ Profile route not registered');
    return;
  }

  // Test 5: Check subscription tiers match website
  console.log('\n📋 5. Checking Subscription Tiers...');
  
  const subscriptionComponent = fs.readFileSync('client/src/components/SubscriptionSelection.tsx', 'utf8');
  
  const expectedTiers = [
    { id: 'free', fee: '2.5%', price: '$0' },
    { id: 'starter', fee: '1.5%', price: '$29' },
    { id: 'professional', fee: '1.0%', price: '$99' },
    { id: 'enterprise', fee: '0.5%', price: '$299' }
  ];
  
  let allTiersCorrect = true;
  expectedTiers.forEach(tier => {
    const hasId = subscriptionComponent.includes(`id: '${tier.id}'`);
    const hasFee = subscriptionComponent.includes(`fee: '${tier.fee}'`);
    const hasPrice = subscriptionComponent.includes(`price: '${tier.price}'`);
    
    console.log(`   ${hasId && hasFee && hasPrice ? '✅' : '❌'} ${tier.id} tier (${tier.fee}, ${tier.price})`);
    if (!hasId || !hasFee || !hasPrice) allTiersCorrect = false;
  });
  
  if (allTiersCorrect) {
    console.log('   ✅ All subscription tiers match website pricing');
  } else {
    console.log('   ❌ Subscription tiers do not match website pricing');
    return;
  }

  console.log('\n🎉 Onboarding Flow Test Complete!');
  console.log('=====================================');
  console.log('✅ All components created and integrated');
  console.log('✅ User model updated with new fields');
  console.log('✅ App.tsx integrated with onboarding flow');
  console.log('✅ Server routes registered');
  console.log('✅ Subscription tiers match website pricing');
  
  console.log('\n🚀 Ready for Testing!');
  console.log('=====================');
  console.log('1. Start the development server: npm run dev');
  console.log('2. Register a new merchant account');
  console.log('3. Complete the onboarding flow');
  console.log('4. Verify subscription tier and wallet are saved');
  
  console.log('\n📋 Onboarding Flow Steps:');
  console.log('1. Subscription Selection (Free/Starter/Professional/Enterprise)');
  console.log('2. Wallet Connection (Trust Wallet/MetaMask/Manual)');
  console.log('3. Setup Complete (Summary and next steps)');
  
  console.log('\n💡 Features:');
  console.log('• Beautiful, responsive UI with progress indicators');
  console.log('• Real-time wallet connection (Trust Wallet prioritized)');
  console.log('• Subscription tier selection with pricing');
  console.log('• Profile updates saved to database');
  console.log('• Skip options for flexibility');
  console.log('• Mobile-friendly design');
}

testOnboardingFlow().catch(error => {
  console.error('❌ Onboarding Flow Test Failed:', error);
  process.exit(1);
});


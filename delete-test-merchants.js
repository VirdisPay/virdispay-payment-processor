/**
 * Delete Test Merchants
 * Lists all merchants and allows you to delete them
 * Run: node delete-test-merchants.js
 * Or: node delete-test-merchants.js "mongodb+srv://..."
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./server/models/User');
const { MerchantKYCStatus } = require('./server/models/kyc');
const Transaction = require('./server/models/Transaction');

// Get MongoDB URI from command line argument or environment variable
const mongoUri = process.argv[2] || process.env.MONGODB_URI;

if (!mongoUri) {
  console.error('❌ Error: MongoDB URI required');
  console.error('Usage: node delete-test-merchants.js "mongodb+srv://..."');
  console.error('Or set MONGODB_URI in .env file');
  process.exit(1);
}

mongoose.connect(mongoUri)
  .then(async () => {
    console.log('✅ Connected to MongoDB');
    console.log('');
    
    // Get all merchants (non-admin users)
    const merchants = await User.find({ role: { $ne: 'admin' } })
      .select('email businessName businessType createdAt role')
      .sort({ createdAt: -1 });
    
    if (merchants.length === 0) {
      console.log('✅ No merchants found in database');
      process.exit(0);
    }
    
    console.log(`📋 Found ${merchants.length} merchant(s):`);
    console.log('');
    
    merchants.forEach((merchant, index) => {
      console.log(`${index + 1}. ${merchant.businessName || 'No business name'}`);
      console.log(`   Email: ${merchant.email}`);
      console.log(`   Type: ${merchant.businessType || 'N/A'}`);
      console.log(`   Created: ${merchant.createdAt.toLocaleDateString()}`);
      console.log(`   ID: ${merchant._id}`);
      console.log('');
    });
    
    // If merchants provided as arguments, delete them
    const emailsToDelete = process.argv.slice(2).filter(arg => arg.includes('@'));
    
    if (emailsToDelete.length > 0) {
      console.log('🗑️  Deleting specified merchants...');
      console.log('');
      
      for (const email of emailsToDelete) {
        const merchant = await User.findOne({ email: email.toLowerCase().trim() });
        
        if (!merchant) {
          console.log(`⚠️  Merchant not found: ${email}`);
          continue;
        }
        
        if (merchant.role === 'admin') {
          console.log(`⚠️  Cannot delete admin user: ${email}`);
          continue;
        }
        
        console.log(`Deleting: ${merchant.businessName} (${merchant.email})...`);
        
        // Delete related data
        try {
          // Delete KYC records
          await MerchantKYCStatus.deleteMany({ userId: merchant._id });
          console.log('   ✅ Deleted KYC records');
        } catch (err) {
          console.log('   ⚠️  Could not delete KYC records');
        }
        
        try {
          // Delete transactions
          await Transaction.deleteMany({ merchantId: merchant._id });
          console.log('   ✅ Deleted transactions');
        } catch (err) {
          console.log('   ⚠️  Could not delete transactions');
        }
        
        // Delete user
        await User.deleteOne({ _id: merchant._id });
        console.log(`   ✅ Deleted merchant: ${email}`);
        console.log('');
      }
      
      console.log('🎉 Deletion complete!');
    } else {
      console.log('💡 To delete merchants, run:');
      console.log('   node delete-test-merchants.js "mongodb+srv://..." "email1@example.com" "email2@example.com"');
      console.log('');
      console.log('Or use the existing script:');
      console.log('   node delete-test-user.js "email@example.com" "mongodb+srv://..."');
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });


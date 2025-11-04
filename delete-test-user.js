/**
 * Delete Test User Account
 * Run: node delete-test-user.js ashley_rolfe@yahoo.co.uk
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');
const User = require('./server/models/User');

async function deleteUser(email) {
  try {
    // Connect to MongoDB - try env var first, then allow command line argument
    let mongoUri = process.env.MONGODB_URI || process.argv[3];
    
    if (!mongoUri) {
      console.error('❌ MONGODB_URI not found in environment variables');
      console.log('');
      console.log('Options:');
      console.log('1. Create a .env file in the root directory with: MONGODB_URI=your_connection_string');
      console.log('2. Or pass it as an argument: node delete-test-user.js <email> <mongo_uri>');
      console.log('');
      console.log('Your MongoDB URI should be:');
      console.log('mongodb+srv://hello_db_user:PA8Y825JufhQWYQw@virdispay-cluster.qicmhbw.mongodb.net/virdispay-payments');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Find and delete user
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    
    if (!user) {
      console.log(`❌ User with email ${email} not found`);
      await mongoose.disconnect();
      process.exit(0);
    }

    console.log(`Found user: ${user.businessName} (${user.email})`);
    
    // Delete user
    await User.deleteOne({ _id: user._id });
    console.log(`✅ Successfully deleted user: ${email}`);

    // Also delete related KYC records if they exist
    try {
      const MerchantKYCStatus = require('./server/models/kyc').MerchantKYCStatus;
      await MerchantKYCStatus.deleteMany({ merchantId: user._id.toString() });
      console.log('✅ Deleted related KYC records');
    } catch (kycError) {
      console.log('⚠️ Could not delete KYC records (may not exist)');
    }

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Get email from command line argument
const email = process.argv[2];

if (!email) {
  console.error('❌ Please provide an email address');
  console.log('Usage: node delete-test-user.js <email>');
  console.log('Example: node delete-test-user.js ashley_rolfe@yahoo.co.uk');
  process.exit(1);
}

deleteUser(email);


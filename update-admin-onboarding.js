require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./server/models/User');

const ADMIN_EMAIL = 'hello@virdispay.com';

// Get MongoDB URI from command line argument or environment variable
const mongoUri = process.argv[2] || process.env.MONGODB_URI;

if (!mongoUri) {
  console.error('❌ Error: MongoDB URI required');
  console.error('Usage: node update-admin-onboarding.js "mongodb+srv://..."');
  process.exit(1);
}

mongoose.connect(mongoUri)
  .then(async () => {
    console.log('✅ Connected to MongoDB');
    console.log('');
    
    // Find admin user
    const admin = await User.findOne({ email: ADMIN_EMAIL });
    
    if (!admin) {
      console.log(`❌ Admin user with email ${ADMIN_EMAIL} not found`);
      process.exit(1);
    }
    
    console.log(`✅ Admin user found: ${admin.email}`);
    console.log('🔄 Updating admin user to skip onboarding...');
    
    // Update admin user to skip onboarding
    await mongoose.connection.collection('users').updateOne(
      { email: ADMIN_EMAIL },
      { $set: { 
        hasCompletedOnboarding: true,
        subscriptionTier: 'admin' // Special tier for admin
      }}
    );
    
    console.log('✅ Admin user updated:');
    console.log('   - hasCompletedOnboarding: true');
    console.log('   - subscriptionTier: admin');
    console.log('');
    console.log('🎉 Admin will no longer see onboarding flow!');
    
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });


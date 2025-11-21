require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./server/models/User');

const ADMIN_EMAIL = 'hello@virdispay.com';
const ADMIN_PASSWORD = 'Admin123!';

// Get MongoDB URI from command line argument or environment variable
const mongoUri = process.argv[2] || process.env.MONGODB_URI;

if (!mongoUri) {
  console.error('❌ Error: MongoDB URI required');
  console.error('Usage: node fix-admin-password-production.js "mongodb+srv://..."');
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
    console.log('🔐 Updating password...');
    
    // Hash password
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 14);
    
    // Update password directly in database (bypass mongoose middleware)
    await mongoose.connection.collection('users').updateOne(
      { email: ADMIN_EMAIL },
      { $set: { 
        password: hashedPassword,
        role: 'admin',
        isVerified: true,
        isActive: true,
        kycStatus: 'approved'
      }}
    );
    
    console.log('✅ Password updated directly in database');
    console.log('');
    
    // Verify it works
    const updatedAdmin = await User.findOne({ email: ADMIN_EMAIL }).select('+password');
    const isMatch = await bcrypt.compare(ADMIN_PASSWORD, updatedAdmin.password);
    
    console.log('🔍 Verifying password...');
    console.log(`   Password matches: ${isMatch ? '✅' : '❌'}`);
    
    if (isMatch) {
      console.log('');
      console.log('🎊 SUCCESS! Admin credentials:');
      console.log(`   Email: ${ADMIN_EMAIL}`);
      console.log(`   Password: ${ADMIN_PASSWORD}`);
      console.log('');
      console.log('You can now log in at:');
      console.log('   https://virdispay-payment-processor.onrender.com/login');
    } else {
      console.log('');
      console.log('❌ Password verification failed. Trying alternative method...');
      
      // Try updating with findByIdAndUpdate to bypass hooks
      const adminId = updatedAdmin._id;
      await User.findByIdAndUpdate(adminId, {
        password: hashedPassword
      }, { new: true });
      
      // Test again
      const finalAdmin = await User.findById(adminId).select('+password');
      const finalMatch = await bcrypt.compare(ADMIN_PASSWORD, finalAdmin.password);
      
      if (finalMatch) {
        console.log('✅ Password fixed with alternative method!');
        console.log('');
        console.log('🎊 Admin credentials:');
        console.log(`   Email: ${ADMIN_EMAIL}`);
        console.log(`   Password: ${ADMIN_PASSWORD}`);
      } else {
        console.log('❌ Still not working. Please check the User model for password hashing issues.');
      }
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });


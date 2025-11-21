require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./server/models/User');

const OLD_ADMIN_EMAIL = 'admin@virdispay.com';
const NEW_ADMIN_EMAIL = 'hello@virdispay.com';
const ADMIN_PASSWORD = 'Admin123!';

// Get MongoDB URI from command line argument or environment variable
const mongoUri = process.argv[2] || process.env.MONGODB_URI || 'mongodb://localhost:27017/virdispay-payments';

console.log('🔗 Connecting to MongoDB...');
if (process.argv[2]) {
  console.log('   Using MongoDB URI from command line argument');
} else if (process.env.MONGODB_URI) {
  console.log('   Using MongoDB URI from environment variable');
} else {
  console.log('   ⚠️  Using default local MongoDB URI');
  console.log('   💡 To use production database, run:');
  console.log('      node change-admin-email.js "mongodb+srv://..."');
}

mongoose.connect(mongoUri)
  .then(async () => {
    console.log('✅ Connected to MongoDB');
    console.log('');
    
    // Check if new admin email already exists
    const existingNewAdmin = await User.findOne({ email: NEW_ADMIN_EMAIL });
    
    if (existingNewAdmin) {
      console.log(`⚠️  User with email ${NEW_ADMIN_EMAIL} already exists`);
      console.log(`   Role: ${existingNewAdmin.role}`);
      
      // If it's already an admin, we're done
      if (existingNewAdmin.role === 'admin') {
        console.log('✅ This user is already an admin!');
        
        // Update password to ensure it's set correctly
        const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 14);
        await mongoose.connection.collection('users').updateOne(
          { email: NEW_ADMIN_EMAIL },
          { $set: { 
            password: hashedPassword,
            role: 'admin',
            isVerified: true,
            isActive: true,
            kycStatus: 'approved'
          }}
        );
        
        console.log('✅ Password and admin status updated');
        console.log('');
        console.log('🎉 Admin login credentials:');
        console.log(`   Email: ${NEW_ADMIN_EMAIL}`);
        console.log(`   Password: ${ADMIN_PASSWORD}`);
      } else {
        // Convert existing user to admin
        console.log('🔄 Converting existing user to admin...');
        const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 14);
        await mongoose.connection.collection('users').updateOne(
          { email: NEW_ADMIN_EMAIL },
          { $set: { 
            password: hashedPassword,
            role: 'admin',
            isVerified: true,
            isActive: true,
            kycStatus: 'approved',
            businessName: existingNewAdmin.businessName || 'VirdisPay Admin',
            businessType: existingNewAdmin.businessType || 'other'
          }}
        );
        
        console.log('✅ User converted to admin');
        console.log('');
        console.log('🎉 Admin login credentials:');
        console.log(`   Email: ${NEW_ADMIN_EMAIL}`);
        console.log(`   Password: ${ADMIN_PASSWORD}`);
      }
    } else {
      // Check if old admin exists
      const oldAdmin = await User.findOne({ email: OLD_ADMIN_EMAIL });
      
      if (oldAdmin) {
        console.log(`✅ Found admin user with old email: ${OLD_ADMIN_EMAIL}`);
        console.log('🔄 Updating email address...');
        
        // Update email to new admin email
        await mongoose.connection.collection('users').updateOne(
          { email: OLD_ADMIN_EMAIL },
          { $set: { 
            email: NEW_ADMIN_EMAIL,
            password: await bcrypt.hash(ADMIN_PASSWORD, 14),
            role: 'admin',
            isVerified: true,
            isActive: true,
            kycStatus: 'approved'
          }}
        );
        
        console.log(`✅ Admin email updated from ${OLD_ADMIN_EMAIL} to ${NEW_ADMIN_EMAIL}`);
      } else {
        console.log('⚠️  No existing admin user found');
        console.log('🆕 Creating new admin user...');
        
        // Create new admin user
        const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 14);
        const newAdmin = await User.create({
          email: NEW_ADMIN_EMAIL,
          password: hashedPassword,
          firstName: 'Admin',
          lastName: 'User',
          businessName: 'VirdisPay Admin',
          businessType: 'other',
          role: 'admin',
          isVerified: true,
          isActive: true,
          kycStatus: 'approved'
        });
        
        console.log(`✅ Admin user created: ${newAdmin.email}`);
      }
      
      console.log('');
      console.log('🎉 Admin login credentials:');
      console.log(`   Email: ${NEW_ADMIN_EMAIL}`);
      console.log(`   Password: ${ADMIN_PASSWORD}`);
    }
    
    // Verify the admin user
    console.log('');
    console.log('🔍 Verifying admin user...');
    const admin = await User.findOne({ email: NEW_ADMIN_EMAIL }).select('+password');
    
    if (admin) {
      console.log('✅ Admin user verified:');
      console.log(`   Email: ${admin.email}`);
      console.log(`   Role: ${admin.role}`);
      console.log(`   Verified: ${admin.isVerified}`);
      console.log(`   Active: ${admin.isActive}`);
      console.log(`   KYC Status: ${admin.kycStatus}`);
      
      // Test password
      const isPasswordValid = await bcrypt.compare(ADMIN_PASSWORD, admin.password);
      console.log(`   Password valid: ${isPasswordValid ? '✅' : '❌'}`);
      
      if (isPasswordValid) {
        console.log('');
        console.log('🎊 SUCCESS! You can now log in with:');
        console.log(`   Email: ${NEW_ADMIN_EMAIL}`);
        console.log(`   Password: ${ADMIN_PASSWORD}`);
      }
    } else {
      console.log('❌ Admin user not found after creation!');
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    console.error(err);
    process.exit(1);
  });


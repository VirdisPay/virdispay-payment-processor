const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./server/models/User');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/virdispay-payments')
  .then(async () => {
    console.log('✅ Connected to MongoDB');
    
    // Find admin user with password field
    const admin = await User.findOne({ email: 'admin@virdispay.com' }).select('+password');
    
    if (!admin) {
      console.log('❌ Admin not found');
      process.exit(1);
    }
    
    console.log('✅ Admin found:', admin.email);
    console.log('  Has password:', !!admin.password);
    console.log('  Password hash length:', admin.password?.length || 0);
    
    // Test password comparison
    const testPassword = 'Admin123!';
    const isMatch = await bcrypt.compare(testPassword, admin.password);
    
    console.log('\n🔐 Password Test:');
    console.log('  Test password:', testPassword);
    console.log('  Match result:', isMatch);
    
    if (!isMatch) {
      console.log('\n❌ Password does not match! Updating password...');
      const newHash = await bcrypt.hash('Admin123!', 14);
      admin.password = newHash;
      await admin.save();
      console.log('✅ Password updated!');
      
      // Test again
      const admin2 = await User.findOne({ email: 'admin@virdispay.com' }).select('+password');
      const isMatch2 = await bcrypt.compare('Admin123!', admin2.password);
      console.log('  New password match:', isMatch2);
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });




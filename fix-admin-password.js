const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./server/models/User');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/virdispay-payments')
  .then(async () => {
    console.log('✅ Connected to MongoDB');
    
    // Find admin
    const admin = await User.findOne({ email: 'admin@virdispay.com' });
    
    if (!admin) {
      console.log('❌ Admin not found');
      process.exit(1);
    }
    
    console.log('✅ Admin found');
    
    // Hash password properly
    const password = 'Admin123!';
    const hashedPassword = await bcrypt.hash(password, 14);
    
    console.log('🔐 New password hash generated');
    
    // Update directly in database (bypass mongoose middleware)
    await mongoose.connection.collection('users').updateOne(
      { email: 'admin@virdispay.com' },
      { $set: { password: hashedPassword } }
    );
    
    console.log('✅ Password updated directly in database');
    
    // Verify it works
    const updatedAdmin = await User.findOne({ email: 'admin@virdispay.com' }).select('+password');
    const isMatch = await bcrypt.compare(password, updatedAdmin.password);
    
    console.log('\n✅ Verification:');
    console.log('  Password matches:', isMatch);
    
    if (isMatch) {
      console.log('\n🎉 Admin login credentials:');
      console.log('  Email: admin@virdispay.com');
      console.log('  Password: Admin123!');
    } else {
      console.log('\n❌ Still not working!');
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });




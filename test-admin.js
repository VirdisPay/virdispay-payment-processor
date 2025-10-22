const mongoose = require('mongoose');
const User = require('./server/models/User');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/virdispay-payments')
  .then(async () => {
    console.log('✅ Connected to MongoDB');
    
    // Check if admin exists
    const admin = await User.findOne({ email: 'admin@virdispay.com' });
    
    if (admin) {
      console.log('✅ Admin user found:');
      console.log('  Email:', admin.email);
      console.log('  Role:', admin.role);
      console.log('  Verified:', admin.isVerified);
      console.log('  Active:', admin.isActive);
    } else {
      console.log('❌ Admin user not found!');
      console.log('Creating admin now...');
      
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('Admin123!', 14);
      
      const newAdmin = await User.create({
        email: 'admin@virdispay.com',
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
      
      console.log('✅ Admin created:', newAdmin.email);
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });




const emailService = require('./server/services/emailService');

async function testAdminNotification() {
  console.log('🧪 Testing Admin Email Notification System...\n');
  
  try {
    // Test data for a new merchant
    const testMerchantData = {
      id: '507f1f77bcf86cd799439011',
      businessName: 'Test CBD Store',
      email: 'test@example.com',
      businessType: 'cbd',
      country: 'US',
      state: 'California',
      licenseNumber: 'CBD-2024-001',
      registrationDate: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      kycStatus: 'pending',
      riskLevel: 'medium'
    };

    console.log('📧 Sending test admin notification...');
    console.log('📋 Merchant Data:', JSON.stringify(testMerchantData, null, 2));
    
    // Test the email service
    const result = await emailService.sendAdminNewMerchantNotification(
      'hello@virdispay.com', // Your admin email
      testMerchantData
    );
    
    console.log('✅ Admin notification test completed!');
    console.log('📧 Email service result:', result);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('🔍 Full error:', error);
  }
}

// Run the test
testAdminNotification();


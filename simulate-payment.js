/**
 * Quick Payment Simulator for Testing
 * Usage: node simulate-payment.js [transactionId]
 * If no transactionId provided, it will complete the most recent pending transaction
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function simulatePayment(specificTransactionId = null) {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    const Transaction = require('./server/models/Transaction');
    
    let transaction;
    
    if (specificTransactionId) {
      // Find specific transaction
      transaction = await Transaction.findById(specificTransactionId);
      if (!transaction) {
        console.log('❌ Transaction not found:', specificTransactionId);
        process.exit(1);
      }
    } else {
      // Find the most recent pending transaction
      transaction = await Transaction.findOne({ status: 'pending' })
        .sort({ createdAt: -1 });
      
      if (!transaction) {
        console.log('❌ No pending transactions found');
        console.log('💡 Create a payment in the merchant dashboard first!');
        process.exit(1);
      }
    }
    
    console.log('📋 Found Transaction:');
    console.log('   ID:', transaction._id);
    console.log('   Amount:', transaction.amount, transaction.currency);
    console.log('   Customer:', transaction.customerEmail);
    console.log('   Status:', transaction.status);
    console.log('   Created:', transaction.timestamps.created);
    console.log('');
    
    if (transaction.status !== 'pending') {
      console.log('⚠️  Warning: Transaction status is not "pending"');
      console.log('   Current status:', transaction.status);
      console.log('   Proceeding anyway...\n');
    }
    
    // Simulate payment completion
    console.log('💰 Simulating payment...');
    
    // Generate fake transaction hash
    const txHash = '0xTEST' + Math.random().toString(36).substring(2, 15).toUpperCase();
    const fromAddress = '0x' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 12);
    
    transaction.status = 'completed';
    transaction.txHash = txHash;
    transaction.fromAddress = fromAddress;
    transaction.timestamps.processed = new Date();
    transaction.timestamps.completed = new Date();
    
    // Simulate blockchain data
    transaction.blockNumber = Math.floor(Math.random() * 1000000) + 15000000;
    transaction.gasUsed = Math.floor(Math.random() * 50000) + 21000;
    transaction.gasPrice = (Math.random() * 50 + 10).toFixed(9); // 10-60 Gwei
    
    await transaction.save();
    
    console.log('✅ Payment Completed Successfully!\n');
    console.log('📊 Transaction Details:');
    console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('   Transaction ID:', transaction._id);
    console.log('   Amount:', transaction.amount, transaction.currency);
    console.log('   Customer:', transaction.customerEmail);
    console.log('   Status:', transaction.status);
    console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('   Blockchain Details:');
    console.log('   TxHash:', txHash);
    console.log('   From:', fromAddress);
    console.log('   To:', transaction.toAddress);
    console.log('   Block:', transaction.blockNumber);
    console.log('   Gas Used:', transaction.gasUsed);
    console.log('   Gas Price:', transaction.gasPrice, 'Gwei');
    console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('   Timestamps:');
    console.log('   Created:', transaction.timestamps.created);
    console.log('   Processed:', transaction.timestamps.processed);
    console.log('   Completed:', transaction.timestamps.completed);
    console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('🎉 Done! Refresh the merchant dashboard to see the updated transaction.');
    console.log('');
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Get transaction ID from command line argument
const transactionId = process.argv[2];

if (transactionId) {
  console.log('🎯 Simulating specific transaction:', transactionId, '\n');
  simulatePayment(transactionId);
} else {
  console.log('🎯 Simulating most recent pending transaction\n');
  simulatePayment();
}



const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  merchantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  plan: {
    type: String,
    enum: ['free', 'starter', 'professional', 'enterprise'],
    default: 'free'
  },
  status: {
    type: String,
    enum: ['active', 'past_due', 'canceled', 'suspended'],
    default: 'active'
  },
  billingCycle: {
    type: String,
    enum: ['monthly', 'annual'],
    default: 'monthly'
  },
  amount: {
    type: Number,
    required: true,
    default: 0 // Free tier
  },
  currency: {
    type: String,
    default: 'USDC'
  },
  currentPeriodStart: {
    type: Date,
    required: true
  },
  currentPeriodEnd: {
    type: Date,
    required: true
  },
  nextBillingDate: {
    type: Date,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['crypto-auto', 'crypto-manual', 'invoice'],
    default: 'crypto-auto'
  },
  autoPayWalletAddress: {
    type: String // Merchant's wallet for auto-debit
  },
  billingHistory: [{
    date: Date,
    amount: Number,
    status: {
      type: String,
      enum: ['paid', 'pending', 'failed', 'waived']
    },
    transactionHash: String,
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment'
    },
    notes: String
  }],
  canceledAt: Date,
  cancelReason: String,
  metadata: {
    volumeLimit: Number, // Monthly volume limit for plan
    transactionLimit: Number // Monthly transaction limit
  }
}, {
  timestamps: true
});

// Index for billing automation
subscriptionSchema.index({ nextBillingDate: 1, status: 1 });
subscriptionSchema.index({ merchantId: 1, status: 1 });

// Calculate next billing date
subscriptionSchema.methods.calculateNextBillingDate = function() {
  const current = this.nextBillingDate || new Date();
  const next = new Date(current);
  
  if (this.billingCycle === 'annual') {
    next.setFullYear(next.getFullYear() + 1);
  } else {
    next.setMonth(next.getMonth() + 1);
  }
  
  return next;
};

// Check if subscription is due for billing
subscriptionSchema.methods.isDueForBilling = function() {
  return new Date() >= this.nextBillingDate && this.status === 'active';
};

module.exports = mongoose.model('Subscription', subscriptionSchema);




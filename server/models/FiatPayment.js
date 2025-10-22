const mongoose = require('mongoose');

const fiatPaymentSchema = new mongoose.Schema({
  paymentId: {
    type: String,
    required: true,
    unique: true
  },
  merchantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  originalTransactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    required: true
  },
  customerInfo: {
    email: {
      type: String,
      required: true,
      lowercase: true
    },
    name: {
      type: String,
      required: true
    },
    phone: String,
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    }
  },
  fiatAmount: {
    type: Number,
    required: true,
    min: 0
  },
  fiatCurrency: {
    type: String,
    required: true,
    enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD']
  },
  targetStablecoin: {
    type: String,
    required: true,
    enum: ['USDC', 'USDT', 'DAI']
  },
  exchangeRate: {
    type: Number,
    required: true
  },
  stablecoinAmount: {
    type: String,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['credit_card', 'debit_card', 'bank_transfer', 'paypal', 'apple_pay', 'google_pay'],
    required: true
  },
  paymentProvider: {
    type: String,
    enum: ['stripe', 'paypal', 'square', 'internal'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'],
    default: 'pending'
  },
  providerDetails: {
    paymentIntentId: String,
    chargeId: String,
    sessionId: String,
    paymentMethodId: String,
    customerId: String
  },
  fees: {
    paymentProcessing: {
      type: Number,
      default: 0
    },
    conversion: {
      type: Number,
      default: 0
    },
    network: {
      type: Number,
      default: 0
    },
    total: {
      type: Number,
      default: 0
    }
  },
  conversionDetails: {
    conversionId: String,
    conversionStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed']
    },
    stablecoinTxHash: String,
    stablecoinAmount: String,
    gasUsed: Number,
    gasPrice: String,
    blockNumber: Number
  },
  refundInfo: {
    refunded: {
      type: Boolean,
      default: false
    },
    refundAmount: Number,
    refundId: String,
    refundReason: String,
    refundedAt: Date
  },
  compliance: {
    amlChecked: {
      type: Boolean,
      default: false
    },
    kycVerified: {
      type: Boolean,
      default: false
    },
    riskScore: {
      type: Number,
      min: 0,
      max: 100
    },
    flags: [String]
  },
  metadata: {
    description: String,
    products: [{
      name: String,
      quantity: Number,
      price: Number,
      category: String
    }],
    userAgent: String,
    ipAddress: String,
    referrer: String
  },
  timestamps: {
    created: {
      type: Date,
      default: Date.now
    },
    paymentInitiated: Date,
    paymentCompleted: Date,
    conversionInitiated: Date,
    conversionCompleted: Date,
    failed: Date,
    cancelled: Date
  }
});

// Indexes for better performance
fiatPaymentSchema.index({ merchantId: 1, createdAt: -1 });
fiatPaymentSchema.index({ status: 1 });
fiatPaymentSchema.index({ paymentId: 1 });
fiatPaymentSchema.index({ 'customerInfo.email': 1 });
fiatPaymentSchema.index({ 'timestamps.created': -1 });

// Virtual for net amount after fees
fiatPaymentSchema.virtual('netFiatAmount').get(function() {
  return this.fiatAmount - this.fees.total;
});

// Virtual for net stablecoin amount
fiatPaymentSchema.virtual('netStablecoinAmount').get(function() {
  return (parseFloat(this.stablecoinAmount) - (this.fees.conversion / this.exchangeRate)).toFixed(6);
});

// Method to check if payment is completed
fiatPaymentSchema.methods.isCompleted = function() {
  return this.status === 'completed';
};

// Method to check if conversion is completed
fiatPaymentSchema.methods.isConversionCompleted = function() {
  return this.conversionDetails.conversionStatus === 'completed';
};

// Method to get total processing time
fiatPaymentSchema.methods.getTotalProcessingTime = function() {
  if (this.timestamps.conversionCompleted) {
    return this.timestamps.conversionCompleted - this.timestamps.created;
  }
  return null;
};

module.exports = mongoose.model('FiatPayment', fiatPaymentSchema);


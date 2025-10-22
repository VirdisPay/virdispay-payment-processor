const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    required: true,
    unique: true
  },
  merchantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  customerEmail: {
    type: String,
    required: true,
    lowercase: true,
    validate: {
      validator: function(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Please provide a valid email'
    }
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    required: true,
    enum: ['USDC', 'USDT', 'DAI', 'ETH', 'BTC']
  },
  cryptoAmount: {
    type: String,
    required: true
  },
  exchangeRate: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['crypto', 'stablecoin', 'token'],
    required: true
  },
  blockchain: {
    type: String,
    enum: ['polygon', 'ethereum', 'bsc', 'polygonTestnet'],
    default: 'polygon', // Default to Polygon for low gas fees
    required: true
  },
  txHash: {
    type: String,
    sparse: true
  },
  fromAddress: {
    type: String,
    required: true
  },
  toAddress: {
    type: String,
    required: true
  },
  gasUsed: {
    type: Number
  },
  gasPrice: {
    type: String
  },
  blockNumber: {
    type: Number
  },
  confirmationCount: {
    type: Number,
    default: 0
  },
  requiredConfirmations: {
    type: Number,
    default: 3
  },
  fees: {
    network: {
      type: Number,
      default: 0
    },
    processing: {
      type: Number,
      default: 0
    },
    total: {
      type: Number,
      default: 0
    }
  },
  metadata: {
    orderId: String,
    description: String,
    customerInfo: {
      name: String,
      phone: String,
      address: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: String
      }
    },
    products: [{
      name: String,
      quantity: Number,
      price: Number,
      category: String
    }]
  },
  refundInfo: {
    refunded: {
      type: Boolean,
      default: false
    },
    refundAmount: Number,
    refundTxHash: String,
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
      max: 100,
      default: 0
    },
    flags: [String]
  },
  timestamps: {
    created: {
      type: Date,
      default: Date.now
    },
    processed: Date,
    completed: Date,
    failed: Date,
    cancelled: Date
  }
});

// Indexes for better performance
transactionSchema.index({ merchantId: 1, 'timestamps.created': -1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ customerEmail: 1 });

// Virtual for total amount including fees
transactionSchema.virtual('totalAmount').get(function() {
  return this.amount + this.fees.total;
});

// Method to check if transaction is confirmed
transactionSchema.methods.isConfirmed = function() {
  return this.confirmationCount >= this.requiredConfirmations;
};

// Method to calculate processing time
transactionSchema.methods.getProcessingTime = function() {
  if (this.timestamps.completed) {
    return this.timestamps.completed - this.timestamps.created;
  }
  return null;
};

module.exports = mongoose.model('Transaction', transactionSchema);

const mongoose = require('mongoose');

const conversionTransactionSchema = new mongoose.Schema({
  conversionId: {
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
  cryptoAmount: {
    type: String,
    required: true
  },
  cryptoCurrency: {
    type: String,
    required: true,
    enum: ['USDC', 'USDT', 'DAI', 'ETH', 'BTC']
  },
  fiatAmount: {
    type: Number,
    required: true
  },
  fiatCurrency: {
    type: String,
    required: true,
    enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD']
  },
  exchangeRate: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  conversionMethod: {
    type: String,
    enum: ['automatic', 'manual', 'scheduled'],
    required: true
  },
  conversionProvider: {
    type: String,
    enum: ['coinbase', 'kraken', 'binance', 'internal'],
    required: true
  },
  providerTransactionId: {
    type: String,
    sparse: true
  },
  fees: {
    conversion: {
      type: Number,
      default: 0
    },
    network: {
      type: Number,
      default: 0
    },
    banking: {
      type: Number,
      default: 0
    },
    total: {
      type: Number,
      default: 0
    }
  },
  bankingDetails: {
    bankName: String,
    accountNumber: String,
    routingNumber: String,
    accountHolderName: String,
    swiftCode: String,
    iban: String
  },
  payoutDetails: {
    payoutId: String,
    payoutStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'returned']
    },
    estimatedArrival: Date,
    actualArrival: Date,
    trackingNumber: String
  },
  metadata: {
    slippage: Number,
    gasUsed: Number,
    gasPrice: String,
    blockNumber: Number,
    txHash: String
  },
  timestamps: {
    initiated: {
      type: Date,
      default: Date.now
    },
    processed: Date,
    completed: Date,
    failed: Date
  },
  errorDetails: {
    code: String,
    message: String,
    providerError: String
  }
});

// Indexes for efficient queries
conversionTransactionSchema.index({ merchantId: 1, createdAt: -1 });
conversionTransactionSchema.index({ status: 1 });
conversionTransactionSchema.index({ conversionId: 1 });
conversionTransactionSchema.index({ originalTransactionId: 1 });

// Virtual for net amount after fees
conversionTransactionSchema.virtual('netFiatAmount').get(function() {
  return this.fiatAmount - this.fees.total;
});

// Method to check if conversion is completed
conversionTransactionSchema.methods.isCompleted = function() {
  return this.status === 'completed';
};

// Method to get processing time
conversionTransactionSchema.methods.getProcessingTime = function() {
  if (this.timestamps.completed) {
    return this.timestamps.completed - this.timestamps.initiated;
  }
  return null;
};

module.exports = mongoose.model('ConversionTransaction', conversionTransactionSchema);


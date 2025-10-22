const mongoose = require('mongoose');

const fiatConversionSchema = new mongoose.Schema({
  merchantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  autoConvert: {
    type: Boolean,
    default: false
  },
  conversionThreshold: {
    type: Number,
    default: 100 // Minimum amount in USD to trigger auto-conversion
  },
  preferredFiatCurrency: {
    type: String,
    enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'],
    default: 'USD'
  },
  bankingInfo: {
    accountType: {
      type: String,
      enum: ['checking', 'savings', 'business'],
      required: function() { return this.autoConvert; }
    },
    bankName: {
      type: String,
      required: function() { return this.autoConvert; }
    },
    accountNumber: {
      type: String,
      required: function() { return this.autoConvert; }
    },
    routingNumber: {
      type: String,
      required: function() { return this.autoConvert; }
    },
    accountHolderName: {
      type: String,
      required: function() { return this.autoConvert; }
    },
    swiftCode: {
      type: String,
      required: function() { return this.preferredFiatCurrency !== 'USD'; }
    },
    iban: {
      type: String,
      required: function() { return this.preferredFiatCurrency === 'EUR'; }
    }
  },
  conversionSettings: {
    slippageTolerance: {
      type: Number,
      default: 0.5, // 0.5% slippage tolerance
      min: 0,
      max: 5
    },
    minConversionAmount: {
      type: Number,
      default: 10, // Minimum $10 for conversion
      min: 1
    },
    maxConversionAmount: {
      type: Number,
      default: 10000, // Maximum $10,000 per conversion
      min: 100
    },
    conversionDelay: {
      type: Number,
      default: 0, // Hours to wait before converting (0 = instant)
      min: 0,
      max: 24
    }
  },
  supportedCryptos: [{
    crypto: {
      type: String,
      enum: ['USDC', 'USDT', 'DAI', 'ETH', 'BTC']
    },
    enabled: {
      type: Boolean,
      default: true
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp on save
fiatConversionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for efficient queries
fiatConversionSchema.index({ merchantId: 1 });
fiatConversionSchema.index({ autoConvert: 1, isActive: 1 });

module.exports = mongoose.model('FiatConversion', fiatConversionSchema);


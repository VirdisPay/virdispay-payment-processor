const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Please provide a valid email'
    }
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  businessName: {
    type: String,
    required: true,
    trim: true
  },
  businessType: {
    type: String,
    enum: ['hemp', 'cbd', 'cannabis', 'other'],
    required: true
  },
      country: {
        type: String,
        required: true,
        default: 'GB', // Default to UK for CBD market
        trim: true,
        uppercase: true
      },
      state: {
        type: String,
        required: false,
        trim: true,
        uppercase: true
      },
  licenseNumber: {
    type: String,
    required: false, // Optional - not all countries require licenses
    sparse: true, // Allows multiple null values
    trim: true
  },
      licenseRequired: {
        type: Boolean,
        default: function() {
          // Only require licenses for cannabis in US/CA, not for hemp/CBD
          // UK: No licenses needed for CBD/hemp
          // US: Hemp is federally legal, no licenses needed for CBD/hemp
          return ['US', 'CA'].includes(this.country) && this.businessType === 'cannabis';
        }
      },
  walletAddress: {
    type: String,
    required: false, // Optional - can be added later in profile
    unique: true,
    sparse: true, // Allows multiple null values
    validate: {
      validator: function(v) {
        // Allow null/empty, but validate format if provided
        if (!v) return true;
        return /^0x[a-fA-F0-9]{40}$/.test(v);
      },
      message: 'Please provide a valid EVM wallet address (0x...)'
    }
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationDocuments: [{
    type: String,
    url: String,
    uploadedAt: Date
  }],
  kycStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'not_started', 'in_progress', 'pending_review', 'expired', 'flagged'],
    default: 'pending'
  },

  // API Keys for Widget Integration
  apiKeys: {
    publicKey: {
      type: String,
      required: false,
      unique: true,
      sparse: true
    },
    secretKey: {
      type: String,
      required: false,
      select: false // Never return in queries by default
    },
    createdAt: {
      type: Date
    },
    lastUsed: {
      type: Date
    }
  },

  // Domain Whitelisting
  allowedDomains: [{
    domain: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    },
    verified: {
      type: Boolean,
      default: false
    }
  }],

  // Two-Factor Authentication
  twoFactorSecret: {
    type: String,
    required: false
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  role: {
    type: String,
    enum: ['merchant', 'admin'],
    default: 'merchant'
  },
  
  // Onboarding and Subscription
  subscriptionTier: {
    type: String,
    enum: ['free', 'starter', 'professional', 'enterprise'],
    default: 'free'
  },
  walletMethod: {
    type: String,
    enum: ['trust', 'metamask', 'manual', 'other'],
    required: false
  },
  hasCompletedOnboarding: {
    type: Boolean,
    default: false
  },
  resetPasswordToken: {
    type: String,
    default: null
  },
  resetPasswordExpires: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  suspensionReason: String,
  suspendedAt: Date,
  suspendedBy: String,
  unsuspendedAt: Date,
  unsuspendedBy: String,
  lastLogin: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    // SECURITY: Using 14 rounds (2^14 iterations) for strong password hashing
    // Higher is more secure but slower. 14 is recommended for 2025.
    const salt = await bcrypt.genSalt(14);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Update timestamp on save
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('User', userSchema);

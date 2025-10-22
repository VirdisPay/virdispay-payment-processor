const mongoose = require('mongoose');
const User = require('../../../server/models/User');

describe('User Model', () => {
  let userData;

  beforeEach(() => {
    userData = global.testUtils.createTestUser();
  });

  describe('User Creation', () => {
    it('should create a valid user', async () => {
      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser._id).toBeDefined();
      expect(savedUser.email).toBe(userData.email);
      expect(savedUser.businessName).toBe(userData.businessName);
      expect(savedUser.businessType).toBe(userData.businessType);
      expect(savedUser.licenseNumber).toBe(userData.licenseNumber);
      expect(savedUser.walletAddress).toBe(userData.walletAddress);
      expect(savedUser.isVerified).toBe(false);
      expect(savedUser.kycStatus).toBe('pending');
      expect(savedUser.role).toBe('merchant');
      expect(savedUser.isActive).toBe(true);
    });

    it('should hash password before saving', async () => {
      const user = new User(userData);
      await user.save();

      expect(user.password).not.toBe(userData.password);
      expect(user.password).toMatch(/^\$2[ayb]\$.{56}$/); // bcrypt hash pattern
    });

    it('should set timestamps on creation', async () => {
      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.createdAt).toBeDefined();
      expect(savedUser.updatedAt).toBeDefined();
      expect(savedUser.createdAt).toBeInstanceOf(Date);
      expect(savedUser.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('User Validation', () => {
    it('should require email', async () => {
      const user = new User({ ...userData, email: undefined });
      
      await expect(user.save()).rejects.toThrow('Path `email` is required');
    });

    it('should require valid email format', async () => {
      const user = new User({ ...userData, email: 'invalid-email' });
      
      await expect(user.save()).rejects.toThrow('Please provide a valid email');
    });

    it('should require password', async () => {
      const user = new User({ ...userData, password: undefined });
      
      await expect(user.save()).rejects.toThrow('Path `password` is required');
    });

    it('should require minimum password length', async () => {
      const user = new User({ ...userData, password: '123' });
      
      await expect(user.save()).rejects.toThrow('shorter than the minimum allowed length');
    });

    it('should require firstName', async () => {
      const user = new User({ ...userData, firstName: undefined });
      
      await expect(user.save()).rejects.toThrow('Path `firstName` is required');
    });

    it('should require lastName', async () => {
      const user = new User({ ...userData, lastName: undefined });
      
      await expect(user.save()).rejects.toThrow('Path `lastName` is required');
    });

    it('should require businessName', async () => {
      const user = new User({ ...userData, businessName: undefined });
      
      await expect(user.save()).rejects.toThrow('Path `businessName` is required');
    });

    it('should validate businessType enum', async () => {
      const user = new User({ ...userData, businessType: 'invalid' });
      
      await expect(user.save()).rejects.toThrow('`invalid` is not a valid enum value');
    });

    it('should require licenseNumber', async () => {
      const user = new User({ ...userData, licenseNumber: undefined });
      
      await expect(user.save()).rejects.toThrow('Path `licenseNumber` is required');
    });

    it('should require walletAddress', async () => {
      const user = new User({ ...userData, walletAddress: undefined });
      
      await expect(user.save()).rejects.toThrow('Path `walletAddress` is required');
    });

    it('should validate Ethereum wallet address format', async () => {
      const user = new User({ ...userData, walletAddress: 'invalid-address' });
      
      await expect(user.save()).rejects.toThrow('Please provide a valid Ethereum address');
    });
  });

  describe('User Uniqueness', () => {
    it('should enforce unique email', async () => {
      const user1 = new User(userData);
      await user1.save();

      const user2 = new User({ ...userData, firstName: 'Different' });
      
      await expect(user2.save()).rejects.toThrow('duplicate key error');
    });

    it('should enforce unique licenseNumber', async () => {
      const user1 = new User(userData);
      await user1.save();

      const user2 = new User({ ...userData, email: 'different@example.com' });
      
      await expect(user2.save()).rejects.toThrow('duplicate key error');
    });

    it('should enforce unique walletAddress', async () => {
      const user1 = new User(userData);
      await user1.save();

      const user2 = new User({ 
        ...userData, 
        email: 'different@example.com',
        licenseNumber: 'DIFFERENT123'
      });
      
      await expect(user2.save()).rejects.toThrow('duplicate key error');
    });
  });

  describe('User Methods', () => {
    let user;

    beforeEach(async () => {
      user = new User(userData);
      await user.save();
    });

    it('should compare password correctly', async () => {
      const isMatch = await user.comparePassword(userData.password);
      expect(isMatch).toBe(true);

      const isNotMatch = await user.comparePassword('wrongpassword');
      expect(isNotMatch).toBe(false);
    });

    it('should update timestamp on save', async () => {
      const originalUpdatedAt = user.updatedAt;
      
      await global.testUtils.wait(10); // Wait a bit
      user.firstName = 'Updated';
      await user.save();

      expect(user.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('User Defaults', () => {
    it('should set default values correctly', async () => {
      const user = new User(userData);
      await user.save();

      expect(user.isVerified).toBe(false);
      expect(user.kycStatus).toBe('pending');
      expect(user.role).toBe('merchant');
      expect(user.isActive).toBe(true);
      expect(user.verificationDocuments).toEqual([]);
    });
  });

  describe('User KYC Status', () => {
    it('should validate kycStatus enum', async () => {
      const user = new User({ ...userData, kycStatus: 'invalid' });
      
      await expect(user.save()).rejects.toThrow('`invalid` is not a valid enum value');
    });

    it('should accept valid kycStatus values', async () => {
      const statuses = ['pending', 'approved', 'rejected'];
      
      for (const status of statuses) {
        const user = new User({ 
          ...userData, 
          kycStatus: status,
          email: `test_kyc_${status}_${Date.now()}@example.com`,
          licenseNumber: `KYC_${status}_${Date.now()}`,
          walletAddress: `0x${Math.random().toString(16).substr(2, 8)}${Math.random().toString(16).substr(2, 8)}${Math.random().toString(16).substr(2, 8)}${Math.random().toString(16).substr(2, 8)}${Math.random().toString(16).substr(2, 8)}`
        });
        const savedUser = await user.save();
        expect(savedUser.kycStatus).toBe(status);
      }
    });
  });

  describe('User Role', () => {
    it('should validate role enum', async () => {
      const user = new User({ ...userData, role: 'invalid' });
      
      await expect(user.save()).rejects.toThrow('`invalid` is not a valid enum value');
    });

    it('should accept valid role values', async () => {
      const roles = ['merchant', 'admin'];
      
      for (const role of roles) {
        const user = new User({ 
          ...userData, 
          role,
          email: `test_role_${role}_${Date.now()}@example.com`,
          licenseNumber: `ROLE_${role}_${Date.now()}`,
          walletAddress: `0x${Math.random().toString(16).substr(2, 8)}${Math.random().toString(16).substr(2, 8)}${Math.random().toString(16).substr(2, 8)}${Math.random().toString(16).substr(2, 8)}${Math.random().toString(16).substr(2, 8)}`
        });
        const savedUser = await user.save();
        expect(savedUser.role).toBe(role);
      }
    });
  });
});

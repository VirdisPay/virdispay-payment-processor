const mongoose = require('mongoose');
const Transaction = require('../../../server/models/Transaction');

describe('Transaction Model', () => {
  let transactionData;
  let merchantId;

  beforeEach(() => {
    merchantId = new mongoose.Types.ObjectId();
    transactionData = global.testUtils.createTestTransaction({ merchantId });
  });

  describe('Transaction Creation', () => {
    it('should create a valid transaction', async () => {
      const transaction = new Transaction(transactionData);
      const savedTransaction = await transaction.save();

      expect(savedTransaction._id).toBeDefined();
      expect(savedTransaction.transactionId).toBe(transactionData.transactionId);
      expect(savedTransaction.merchantId).toEqual(merchantId);
      expect(savedTransaction.customerEmail).toBe(transactionData.customerEmail);
      expect(savedTransaction.amount).toBe(transactionData.amount);
      expect(savedTransaction.currency).toBe(transactionData.currency);
      expect(savedTransaction.cryptoAmount).toBe(transactionData.cryptoAmount);
      expect(savedTransaction.exchangeRate).toBe(transactionData.exchangeRate);
      expect(savedTransaction.status).toBe(transactionData.status);
      expect(savedTransaction.paymentMethod).toBe(transactionData.paymentMethod);
      expect(savedTransaction.blockchain).toBe(transactionData.blockchain);
    });

    it('should set default values', async () => {
      const transaction = new Transaction(transactionData);
      const savedTransaction = await transaction.save();

      expect(savedTransaction.status).toBe('pending');
      expect(savedTransaction.confirmationCount).toBe(0);
      expect(savedTransaction.requiredConfirmations).toBe(3);
      expect(savedTransaction.fees.total).toBe(0);
      expect(savedTransaction.fees.network).toBe(0);
      expect(savedTransaction.fees.processing).toBe(0);
      expect(savedTransaction.refundInfo.refunded).toBe(false);
      expect(savedTransaction.compliance.amlChecked).toBe(false);
      expect(savedTransaction.compliance.kycVerified).toBe(false);
      expect(savedTransaction.compliance.riskScore).toBeDefined();
    });

    it('should set timestamps on creation', async () => {
      const transaction = new Transaction(transactionData);
      const savedTransaction = await transaction.save();

      expect(savedTransaction.timestamps.created).toBeDefined();
      expect(savedTransaction.timestamps.created).toBeInstanceOf(Date);
    });
  });

  describe('Transaction Validation', () => {
    it('should require transactionId', async () => {
      const transaction = new Transaction({ ...transactionData, transactionId: undefined });
      
      await expect(transaction.save()).rejects.toThrow('Path `transactionId` is required');
    });

    it('should enforce unique transactionId', async () => {
      const transaction1 = new Transaction(transactionData);
      await transaction1.save();

      const transaction2 = new Transaction({
        ...transactionData,
        merchantId: new mongoose.Types.ObjectId()
      });
      
      await expect(transaction2.save()).rejects.toThrow('duplicate key error');
    });

    it('should require merchantId', async () => {
      const transaction = new Transaction({ ...transactionData, merchantId: undefined });
      
      await expect(transaction.save()).rejects.toThrow('Path `merchantId` is required');
    });

    it('should require customerEmail', async () => {
      const transaction = new Transaction({ ...transactionData, customerEmail: undefined });
      
      await expect(transaction.save()).rejects.toThrow('Path `customerEmail` is required');
    });

    it('should require valid email format for customerEmail', async () => {
      const transaction = new Transaction({ 
        ...transactionData, 
        customerEmail: 'invalid-email' 
      });
      
      await expect(transaction.save()).rejects.toThrow('Please provide a valid email');
    });

    it('should require amount', async () => {
      const transaction = new Transaction({ ...transactionData, amount: undefined });
      
      await expect(transaction.save()).rejects.toThrow('Path `amount` is required');
    });

    it('should validate minimum amount', async () => {
      const transaction = new Transaction({ ...transactionData, amount: -1 });
      
      await expect(transaction.save()).rejects.toThrow('Path `amount` (-1) is less than minimum allowed value (0)');
    });

    it('should require currency', async () => {
      const transaction = new Transaction({ ...transactionData, currency: undefined });
      
      await expect(transaction.save()).rejects.toThrow('Path `currency` is required');
    });

    it('should validate currency enum', async () => {
      const transaction = new Transaction({ ...transactionData, currency: 'INVALID' });
      
      await expect(transaction.save()).rejects.toThrow('`INVALID` is not a valid enum value');
    });

    it('should require cryptoAmount', async () => {
      const transaction = new Transaction({ ...transactionData, cryptoAmount: undefined });
      
      await expect(transaction.save()).rejects.toThrow('Path `cryptoAmount` is required');
    });

    it('should require exchangeRate', async () => {
      const transaction = new Transaction({ ...transactionData, exchangeRate: undefined });
      
      await expect(transaction.save()).rejects.toThrow('Path `exchangeRate` is required');
    });

    it('should require paymentMethod', async () => {
      const transaction = new Transaction({ ...transactionData, paymentMethod: undefined });
      
      await expect(transaction.save()).rejects.toThrow('Path `paymentMethod` is required');
    });

    it('should validate paymentMethod enum', async () => {
      const transaction = new Transaction({ ...transactionData, paymentMethod: 'invalid' });
      
      await expect(transaction.save()).rejects.toThrow('`invalid` is not a valid enum value');
    });

    it('should require blockchain', async () => {
      const transaction = new Transaction({ ...transactionData, blockchain: undefined });
      
      await expect(transaction.save()).rejects.toThrow('Path `blockchain` is required');
    });

    it('should validate blockchain enum', async () => {
      const transaction = new Transaction({ ...transactionData, blockchain: 'invalid' });
      
      await expect(transaction.save()).rejects.toThrow('`invalid` is not a valid enum value');
    });
  });

  describe('Transaction Status', () => {
    it('should validate status enum', async () => {
      const transaction = new Transaction({ ...transactionData, status: 'invalid' });
      
      await expect(transaction.save()).rejects.toThrow('`invalid` is not a valid enum value');
    });

    it('should accept valid status values', async () => {
      const statuses = ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'];
      
      for (const status of statuses) {
        const transaction = new Transaction({ 
          ...transactionData, 
          status,
          transactionId: `test_status_${status}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          customerEmail: `customer_${status}_${Date.now()}@example.com`
        });
        const savedTransaction = await transaction.save();
        expect(savedTransaction.status).toBe(status);
      }
    });
  });

  describe('Transaction Methods', () => {
    let transaction;

    beforeEach(async () => {
      transaction = new Transaction(transactionData);
      await transaction.save();
    });

    it('should check if transaction is confirmed', () => {
      transaction.confirmationCount = 2;
      transaction.requiredConfirmations = 3;
      expect(transaction.isConfirmed()).toBe(false);

      transaction.confirmationCount = 3;
      expect(transaction.isConfirmed()).toBe(true);

      transaction.confirmationCount = 5;
      expect(transaction.isConfirmed()).toBe(true);
    });

    it('should calculate processing time when completed', () => {
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + 5000); // 5 seconds later
      
      transaction.timestamps.created = startTime;
      transaction.timestamps.completed = endTime;
      
      expect(transaction.getProcessingTime()).toBe(5000);
    });

    it('should return null for processing time when not completed', () => {
      transaction.timestamps.created = new Date();
      transaction.timestamps.completed = null;
      
      expect(transaction.getProcessingTime()).toBe(null);
    });
  });

  describe('Transaction Virtual Fields', () => {
    let transaction;

    beforeEach(async () => {
      transaction = new Transaction(transactionData);
      transaction.fees.total = 5.50;
      await transaction.save();
    });

    it('should calculate total amount including fees', () => {
      expect(transaction.totalAmount).toBe(transactionData.amount + 5.50);
    });
  });

  describe('Transaction Compliance', () => {
    it('should set compliance defaults', async () => {
      const transaction = new Transaction(transactionData);
      const savedTransaction = await transaction.save();

      expect(savedTransaction.compliance.amlChecked).toBe(false);
      expect(savedTransaction.compliance.kycVerified).toBe(false);
      expect(savedTransaction.compliance.riskScore).toBeDefined();
      expect(savedTransaction.compliance.flags).toEqual([]);
    });

    it('should validate risk score range', async () => {
      const transaction = new Transaction({
        ...transactionData,
        compliance: { ...transactionData.compliance, riskScore: 150 }
      });
      
      await expect(transaction.save()).rejects.toThrow('Path `compliance.riskScore` (150) is more than maximum allowed value (100)');
    });

    it('should validate risk score minimum', async () => {
      const transaction = new Transaction({
        ...transactionData,
        compliance: { ...transactionData.compliance, riskScore: -10 }
      });
      
      await expect(transaction.save()).rejects.toThrow('Path `compliance.riskScore` (-10) is less than minimum allowed value (0)');
    });
  });

  describe('Transaction Fees', () => {
    it('should set fee defaults', async () => {
      const transaction = new Transaction(transactionData);
      const savedTransaction = await transaction.save();

      expect(savedTransaction.fees.network).toBe(0);
      expect(savedTransaction.fees.processing).toBe(0);
      expect(savedTransaction.fees.total).toBe(0);
    });

    it('should allow custom fees', async () => {
      const customFees = {
        network: 2.50,
        processing: 3.00,
        total: 5.50
      };

      const transaction = new Transaction({
        ...transactionData,
        fees: customFees
      });
      const savedTransaction = await transaction.save();

      expect(savedTransaction.fees.network).toBe(2.50);
      expect(savedTransaction.fees.processing).toBe(3.00);
      expect(savedTransaction.fees.total).toBe(5.50);
    });
  });

  describe('Transaction Metadata', () => {
    it('should allow custom metadata', async () => {
      const metadata = {
        orderId: 'ORDER123',
        description: 'Test order',
        customerInfo: {
          name: 'John Doe',
          phone: '+1234567890'
        },
        products: [
          {
            name: 'CBD Oil',
            quantity: 1,
            price: 100,
            category: 'CBD'
          }
        ]
      };

      const transaction = new Transaction({
        ...transactionData,
        metadata
      });
      const savedTransaction = await transaction.save();

      expect(savedTransaction.metadata.orderId).toBe('ORDER123');
      expect(savedTransaction.metadata.description).toBe('Test order');
      expect(savedTransaction.metadata.customerInfo.name).toBe('John Doe');
      expect(savedTransaction.metadata.products).toHaveLength(1);
      expect(savedTransaction.metadata.products[0].name).toBe('CBD Oil');
    });
  });
});

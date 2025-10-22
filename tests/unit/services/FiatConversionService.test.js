const FiatConversionService = require('../../../server/services/FiatConversionService');
const axios = require('axios');
const mongoose = require('mongoose');

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

describe('FiatConversionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the exchange rates cache
    FiatConversionService.exchangeRates.clear();
    FiatConversionService.lastRateUpdate = null;
  });

  describe('getExchangeRates', () => {
    it('should fetch exchange rates from API', async () => {
      const mockResponse = {
        data: {
          'usd-coin': { usd: 1.0, eur: 0.85, gbp: 0.73 },
          'tether': { usd: 1.0, eur: 0.85, gbp: 0.73 },
          'dai': { usd: 1.0, eur: 0.85, gbp: 0.73 },
          'ethereum': { usd: 2000, eur: 1700, gbp: 1460 },
          'bitcoin': { usd: 45000, eur: 38250, gbp: 32850 }
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const rates = await FiatConversionService.getExchangeRates();

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.coingecko.com/api/v3/simple/price',
        {
          params: {
            ids: 'usd-coin,tether,dai,ethereum,bitcoin',
            vs_currencies: 'usd,eur,gbp,cad,aud',
            include_24hr_change: false
          },
          timeout: 10000
        }
      );

      expect(rates.get('USDC')).toEqual({ usd: 1.0, eur: 0.85, gbp: 0.73 });
      expect(rates.get('USDT')).toEqual({ usd: 1.0, eur: 0.85, gbp: 0.73 });
      expect(rates.get('DAI')).toEqual({ usd: 1.0, eur: 0.85, gbp: 0.73 });
      expect(rates.get('ETH')).toEqual({ usd: 2000, eur: 1700, gbp: 1460 });
      expect(rates.get('BTC')).toEqual({ usd: 45000, eur: 38250, gbp: 32850 });
    });

    it('should return cached rates if fresh', async () => {
      const mockResponse = {
        data: {
          'usd-coin': { usd: 1.0, eur: 0.85, gbp: 0.73 }
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      // First call
      await FiatConversionService.getExchangeRates();
      
      // Second call should use cache
      const rates = await FiatConversionService.getExchangeRates();

      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
      expect(rates.get('USDC')).toEqual({ usd: 1.0, eur: 0.85, gbp: 0.73 });
    });

    it('should handle API errors gracefully', async () => {
      mockedAxios.get.mockRejectedValue(new Error('API Error'));

      await expect(FiatConversionService.getExchangeRates()).rejects.toThrow('Unable to fetch exchange rates');
    });

    it('should return cached rates on API error if available', async () => {
      // First successful call
      const mockResponse = {
        data: {
          'usd-coin': { usd: 1.0, eur: 0.85, gbp: 0.73 }
        }
      };
      mockedAxios.get.mockResolvedValue(mockResponse);
      await FiatConversionService.getExchangeRates();

      // Second call fails but returns cached data
      mockedAxios.get.mockRejectedValue(new Error('API Error'));
      const rates = await FiatConversionService.getExchangeRates();

      expect(rates.get('USDC')).toEqual({ usd: 1.0, eur: 0.85, gbp: 0.73 });
    });
  });

  describe('convertToFiat', () => {
    beforeEach(async () => {
      const mockResponse = {
        data: {
          'usd-coin': { usd: 1.0, eur: 0.85, gbp: 0.73, cad: 1.25, aud: 1.35 }
        }
      };
      mockedAxios.get.mockResolvedValue(mockResponse);
    });

    it('should convert crypto to fiat correctly', async () => {
      const result = await FiatConversionService.convertToFiat('100', 'USDC', 'USD');

      expect(result.fiatAmount).toBe(100);
      expect(result.exchangeRate).toBe(1.0);
      expect(result.cryptoAmount).toBe('100');
      expect(result.cryptoCurrency).toBe('USDC');
      expect(result.fiatCurrency).toBe('USD');
    });

    it('should convert crypto to different fiat currency', async () => {
      const result = await FiatConversionService.convertToFiat('100', 'USDC', 'EUR');

      expect(result.fiatAmount).toBe(85);
      expect(result.exchangeRate).toBe(0.85);
      expect(result.cryptoAmount).toBe('100');
      expect(result.cryptoCurrency).toBe('USDC');
      expect(result.fiatCurrency).toBe('EUR');
    });

    it('should round fiat amount to 2 decimal places', async () => {
      const result = await FiatConversionService.convertToFiat('100.123456', 'USDC', 'EUR');

      expect(result.fiatAmount).toBe(85.10);
    });

    it('should throw error for unsupported crypto currency', async () => {
      await expect(FiatConversionService.convertToFiat('100', 'UNSUPPORTED', 'USD'))
        .rejects.toThrow('Exchange rate not available for UNSUPPORTED');
    });

    it('should throw error for unsupported fiat currency', async () => {
      await expect(FiatConversionService.convertToFiat('100', 'USDC', 'UNSUPPORTED'))
        .rejects.toThrow('Exchange rate not available for UNSUPPORTED');
    });
  });

  describe('calculateConversionFees', () => {
    it('should calculate fees correctly for USD', () => {
      const fees = FiatConversionService.calculateConversionFees(100, 'USDC', 'USD');

      expect(fees.conversion).toBe(0.5); // 0.5% of $100
      expect(fees.network).toBe(2.50);
      expect(fees.banking).toBe(0.25);
      expect(fees.total).toBe(3.25);
    });

    it('should calculate fees correctly for EUR', () => {
      const fees = FiatConversionService.calculateConversionFees(100, 'USDC', 'EUR');

      expect(fees.conversion).toBe(0.5); // 0.5% of €100
      expect(fees.network).toBe(2.50);
      expect(fees.banking).toBe(1.50); // Higher banking fee for non-USD
      expect(fees.total).toBe(4.50);
    });

    it('should round fees to 2 decimal places', () => {
      const fees = FiatConversionService.calculateConversionFees(33.33, 'USDC', 'USD');

      expect(fees.conversion).toBe(0.17); // Rounded from 0.1665
      expect(fees.total).toBe(2.92); // Rounded from 2.915
    });
  });

  describe('calculateRiskScore', () => {
    it('should calculate risk score based on amount', () => {
      const customerInfo = { name: 'John Doe', phone: '+1234567890' };
      
      expect(FiatConversionService.calculateRiskScore(100, customerInfo)).toBe(0);
      expect(FiatConversionService.calculateRiskScore(1000, customerInfo)).toBe(10);
      expect(FiatConversionService.calculateRiskScore(5000, customerInfo)).toBe(10);
      expect(FiatConversionService.calculateRiskScore(10000, customerInfo)).toBe(30);
      expect(FiatConversionService.calculateRiskScore(100000, customerInfo)).toBe(90);
    });

    it('should add risk factors for missing customer info', () => {
      const customerInfo = { name: 'John Doe' }; // Missing phone
      
      expect(FiatConversionService.calculateRiskScore(1000, customerInfo)).toBe(20); // 10 for amount + 10 for missing phone
    });

    it('should add risk factors for missing name', () => {
      const customerInfo = { phone: '+1234567890' }; // Missing name
      
      expect(FiatConversionService.calculateRiskScore(1000, customerInfo)).toBe(25); // 10 for amount + 15 for missing name
    });

    it('should cap risk score at 100', () => {
      const customerInfo = {}; // Missing everything
      
      expect(FiatConversionService.calculateRiskScore(100000, customerInfo)).toBe(100);
    });
  });

  describe('shouldAutoConvert', () => {
    it('should return false if no conversion settings found', async () => {
      const result = await FiatConversionService.shouldAutoConvert(new mongoose.Types.ObjectId(), 100);
      expect(result).toBe(false);
    });

    it('should return false if auto-convert is disabled', async () => {
      // Mock the database call
      const mockSettings = {
        autoConvert: false,
        conversionThreshold: 50
      };
      
      jest.spyOn(require('../../../server/models/FiatConversion'), 'findOne')
        .mockResolvedValue(mockSettings);

      const result = await FiatConversionService.shouldAutoConvert('merchant123', 100);
      expect(result).toBe(false);
    });

    it('should return true if amount meets threshold', async () => {
      const mockSettings = {
        autoConvert: true,
        conversionThreshold: 50
      };
      
      jest.spyOn(require('../../../server/models/FiatConversion'), 'findOne')
        .mockResolvedValue(mockSettings);

      const result = await FiatConversionService.shouldAutoConvert('merchant123', 100);
      expect(result).toBe(true);
    });

    it('should return false if amount below threshold', async () => {
      const mockSettings = {
        autoConvert: true,
        conversionThreshold: 150
      };
      
      jest.spyOn(require('../../../server/models/FiatConversion'), 'findOne')
        .mockResolvedValue(mockSettings);

      const result = await FiatConversionService.shouldAutoConvert('merchant123', 100);
      expect(result).toBe(false);
    });
  });

  describe('getConversionHistory', () => {
    it('should return conversion history with pagination', async () => {
      const mockConversions = [
        { _id: '1', fiatAmount: 100, status: 'completed' },
        { _id: '2', fiatAmount: 200, status: 'completed' }
      ];

      jest.spyOn(require('../../../server/models/ConversionTransaction'), 'find')
        .mockReturnValue({
          sort: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          skip: jest.fn().mockReturnThis(),
          populate: jest.fn().mockResolvedValue(mockConversions)
        });

      jest.spyOn(require('../../../server/models/ConversionTransaction'), 'countDocuments')
        .mockResolvedValue(2);

      const result = await FiatConversionService.getConversionHistory('merchant123', {
        page: 1,
        limit: 10
      });

      expect(result.conversions).toEqual(mockConversions);
      expect(result.pagination.current).toBe(1);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.pages).toBe(1);
    });
  });

  describe('getConversionStats', () => {
    it('should return conversion statistics', async () => {
      const mockStats = [{
        totalConversions: 10,
        totalFiatAmount: 5000,
        totalFees: 250,
        completedConversions: 8,
        failedConversions: 2,
        avgProcessingTime: 300000 // 5 minutes
      }];

      jest.spyOn(require('../../../server/models/ConversionTransaction'), 'aggregate')
        .mockResolvedValue(mockStats);

      const result = await FiatConversionService.getConversionStats('merchant123', '30d');

      expect(result.totalConversions).toBe(10);
      expect(result.totalFiatAmount).toBe(5000);
      expect(result.totalFees).toBe(250);
      expect(result.completedConversions).toBe(8);
      expect(result.failedConversions).toBe(2);
      expect(result.avgProcessingTime).toBe(300000);
    });

    it('should return default stats when no data found', async () => {
      jest.spyOn(require('../../../server/models/ConversionTransaction'), 'aggregate')
        .mockResolvedValue([]);

      const result = await FiatConversionService.getConversionStats('merchant123', '30d');

      expect(result.totalConversions).toBe(0);
      expect(result.totalFiatAmount).toBe(0);
      expect(result.totalFees).toBe(0);
      expect(result.completedConversions).toBe(0);
      expect(result.failedConversions).toBe(0);
      expect(result.avgProcessingTime).toBe(0);
    });
  });
});

/**
 * Subscription Billing Service
 * Handles automated monthly billing for merchants
 */

const Subscription = require('../models/Subscription');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const emailService = require('./emailService');

// Plan pricing (monthly in USD)
const PLAN_PRICING = {
  free: 0,
  starter: 29,
  professional: 99,
  enterprise: 299
};

// Plan limits
const PLAN_LIMITS = {
  free: {
    monthlyVolume: 1000,
    monthlyTransactions: 50
  },
  starter: {
    monthlyVolume: 10000,
    monthlyTransactions: 500
  },
  professional: {
    monthlyVolume: 100000,
    monthlyTransactions: 5000
  },
  enterprise: {
    monthlyVolume: Infinity,
    monthlyTransactions: Infinity
  }
};

class SubscriptionService {
  /**
   * Create subscription for new merchant
   */
  async createSubscription(merchantId, plan = 'free', billingCycle = 'monthly') {
    try {
      const merchant = await User.findById(merchantId);
      
      if (!merchant) {
        throw new Error('Merchant not found');
      }
      
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      
      const subscription = new Subscription({
        merchantId,
        plan,
        billingCycle,
        amount: PLAN_PRICING[plan] || 0,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        nextBillingDate: periodEnd,
        metadata: PLAN_LIMITS[plan] || PLAN_LIMITS.free
      });
      
      await subscription.save();
      
      console.log(`✅ Subscription created for merchant ${merchantId}: ${plan} plan`);
      
      return {
        success: true,
        subscription
      };
    } catch (error) {
      console.error('Error creating subscription:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Process due subscriptions (run daily via cron job)
   */
  async processDueSubscriptions() {
    try {
      const dueSubscriptions = await Subscription.find({
        nextBillingDate: { $lte: new Date() },
        status: 'active',
        amount: { $gt: 0 } // Skip free plans
      }).populate('merchantId', 'email businessName walletAddress');
      
      console.log(`📋 Processing ${dueSubscriptions.length} due subscriptions...`);
      
      const results = {
        processed: 0,
        successful: 0,
        failed: 0,
        details: []
      };
      
      for (const subscription of dueSubscriptions) {
        const result = await this.chargeMerchant(subscription);
        results.processed++;
        
        if (result.success) {
          results.successful++;
        } else {
          results.failed++;
        }
        
        results.details.push({
          merchantId: subscription.merchantId._id,
          businessName: subscription.merchantId.businessName,
          result
        });
      }
      
      console.log(`✅ Subscription billing complete: ${results.successful} successful, ${results.failed} failed`);
      
      return results;
    } catch (error) {
      console.error('Error processing subscriptions:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Charge individual merchant for subscription
   */
  async chargeMerchant(subscription) {
    try {
      const merchant = subscription.merchantId;
      
      // Check if merchant has wallet address
      if (!merchant.walletAddress) {
        // Mark as past due and send reminder
        subscription.status = 'past_due';
        await subscription.save();
        
        await emailService.sendEmail({
          to: merchant.email,
          subject: 'Payment Required - Add Wallet Address',
          template: 'subscription-payment-required',
          data: {
            businessName: merchant.businessName,
            amount: subscription.amount,
            plan: subscription.plan
          }
        });
        
        return {
          success: false,
          reason: 'No wallet address',
          action: 'Email sent to merchant'
        };
      }
      
      // Create payment record for subscription charge
      const payment = new Transaction({
        merchantId: merchant._id,
        amount: subscription.amount,
        currency: subscription.currency,
        description: `${subscription.plan.toUpperCase()} Plan - Monthly Subscription`,
        type: 'subscription',
        status: 'pending',
        network: 'polygon', // Use cheapest network for small amounts
        walletAddress: merchant.walletAddress,
        metadata: {
          subscriptionId: subscription._id,
          billingPeriod: {
            start: subscription.currentPeriodStart,
            end: subscription.currentPeriodEnd
          }
        }
      });
      
      await payment.save();
      
      // Record in billing history
      subscription.billingHistory.push({
        date: new Date(),
        amount: subscription.amount,
        status: 'pending',
        paymentId: payment._id
      });
      
      // Update billing dates
      subscription.currentPeriodStart = subscription.currentPeriodEnd;
      subscription.currentPeriodEnd = subscription.calculateNextBillingDate();
      subscription.nextBillingDate = subscription.currentPeriodEnd;
      
      await subscription.save();
      
      // Send invoice email
      await emailService.sendEmail({
        to: merchant.email,
        subject: `Invoice for ${subscription.plan} Plan - VirdisPay`,
        template: 'subscription-invoice',
        data: {
          businessName: merchant.businessName,
          plan: subscription.plan,
          amount: subscription.amount,
          currency: subscription.currency,
          billingPeriod: {
            start: subscription.currentPeriodStart,
            end: subscription.currentPeriodEnd
          },
          paymentId: payment._id
        }
      });
      
      console.log(`✅ Subscription charged: ${merchant.businessName} - $${subscription.amount}`);
      
      return {
        success: true,
        payment,
        message: 'Subscription charge initiated'
      };
    } catch (error) {
      console.error('Error charging merchant:', error);
      
      // Mark subscription as past due
      subscription.status = 'past_due';
      subscription.billingHistory.push({
        date: new Date(),
        amount: subscription.amount,
        status: 'failed',
        notes: error.message
      });
      await subscription.save();
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Change merchant's subscription plan
   */
  async changePlan(merchantId, newPlan) {
    try {
      const subscription = await Subscription.findOne({ merchantId });
      
      if (!subscription) {
        // Create new subscription if doesn't exist
        return await this.createSubscription(merchantId, newPlan);
      }
      
      const oldPlan = subscription.plan;
      subscription.plan = newPlan;
      subscription.amount = PLAN_PRICING[newPlan] || 0;
      subscription.metadata = PLAN_LIMITS[newPlan] || PLAN_LIMITS.free;
      
      await subscription.save();
      
      // Send confirmation email
      const merchant = await User.findById(merchantId);
      await emailService.sendEmail({
        to: merchant.email,
        subject: 'Subscription Plan Updated - VirdisPay',
        template: 'plan-changed',
        data: {
          businessName: merchant.businessName,
          oldPlan,
          newPlan,
          amount: subscription.amount,
          nextBillingDate: subscription.nextBillingDate
        }
      });
      
      console.log(`✅ Plan changed: ${merchant.email} from ${oldPlan} to ${newPlan}`);
      
      return {
        success: true,
        subscription
      };
    } catch (error) {
      console.error('Error changing plan:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(merchantId, reason) {
    try {
      const subscription = await Subscription.findOne({ merchantId });
      
      if (!subscription) {
        throw new Error('Subscription not found');
      }
      
      subscription.status = 'canceled';
      subscription.canceledAt = new Date();
      subscription.cancelReason = reason;
      
      await subscription.save();
      
      // Send cancellation confirmation
      const merchant = await User.findById(merchantId);
      await emailService.sendEmail({
        to: merchant.email,
        subject: 'Subscription Canceled - VirdisPay',
        template: 'subscription-canceled',
        data: {
          businessName: merchant.businessName,
          plan: subscription.plan,
          cancelDate: subscription.canceledAt,
          accessUntil: subscription.currentPeriodEnd
        }
      });
      
      return {
        success: true,
        subscription
      };
    } catch (error) {
      console.error('Error canceling subscription:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get subscription status for merchant
   */
  async getSubscription(merchantId) {
    try {
      let subscription = await Subscription.findOne({ merchantId });
      
      if (!subscription) {
        // Auto-create free subscription
        const result = await this.createSubscription(merchantId, 'free');
        subscription = result.subscription;
      }
      
      // Check usage against limits
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const monthlyPayments = await Transaction.find({
        merchantId,
        createdAt: { $gte: startOfMonth },
        status: 'completed'
      });
      
      const monthlyVolume = monthlyPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const monthlyTransactions = monthlyPayments.length;
      
      const limits = subscription.metadata || PLAN_LIMITS.free;
      
      return {
        success: true,
        subscription,
        usage: {
          monthlyVolume,
          monthlyTransactions,
          volumePercentage: limits.monthlyVolume !== Infinity 
            ? ((monthlyVolume / limits.monthlyVolume) * 100).toFixed(1)
            : 0,
          transactionPercentage: limits.monthlyTransactions !== Infinity
            ? ((monthlyTransactions / limits.monthlyTransactions) * 100).toFixed(1)
            : 0
        },
        limits
      };
    } catch (error) {
      console.error('Error getting subscription:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new SubscriptionService();


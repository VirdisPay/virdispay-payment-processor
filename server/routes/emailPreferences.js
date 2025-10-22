/**
 * Email Preferences Routes
 * Handles email notification preferences and unsubscribe functionality
 */

const express = require('express');
const crypto = require('crypto');
const EmailPreferences = require('../models/emailPreferences');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

/**
 * @route GET /api/email-preferences
 * @desc Get user's email preferences
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    let preferences = await EmailPreferences.findByUserId(userId);
    
    // Create default preferences if none exist
    if (!preferences) {
      preferences = new EmailPreferences({
        userId,
        unsubscribeToken: crypto.randomBytes(32).toString('hex')
      });
      await preferences.save();
    }

    res.json({
      success: true,
      preferences: {
        notifications: preferences.notifications,
        frequency: preferences.frequency,
        format: preferences.format,
        language: preferences.language,
        timezone: preferences.timezone,
        quietHours: preferences.quietHours,
        stats: preferences.stats
      }
    });

  } catch (error) {
    console.error('Get email preferences error:', error);
    res.status(500).json({ error: 'Failed to get email preferences' });
  }
});

/**
 * @route PUT /api/email-preferences
 * @desc Update user's email preferences
 */
router.put('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { notifications, frequency, format, language, timezone, quietHours } = req.body;

    const preferences = await EmailPreferences.findOneAndUpdate(
      { userId },
      {
        $set: {
          ...(notifications && { notifications }),
          ...(frequency && { frequency }),
          ...(format && { format }),
          ...(language && { language }),
          ...(timezone && { timezone }),
          ...(quietHours && { quietHours })
        }
      },
      { new: true, upsert: true }
    );

    res.json({
      success: true,
      message: 'Email preferences updated successfully',
      preferences: {
        notifications: preferences.notifications,
        frequency: preferences.frequency,
        format: preferences.format,
        language: preferences.language,
        timezone: preferences.timezone,
        quietHours: preferences.quietHours
      }
    });

  } catch (error) {
    console.error('Update email preferences error:', error);
    res.status(500).json({ error: 'Failed to update email preferences' });
  }
});

/**
 * @route POST /api/email-preferences/unsubscribe/:token
 * @desc Unsubscribe user from all emails using token
 */
router.post('/unsubscribe/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { notificationType } = req.body; // Optional: unsubscribe from specific type

    const preferences = await EmailPreferences.findByUnsubscribeToken(token);

    if (!preferences) {
      return res.status(404).json({ 
        success: false,
        message: 'Invalid unsubscribe token' 
      });
    }

    // Get user info for response
    const user = await User.findById(preferences.userId);

    if (notificationType) {
      // Unsubscribe from specific notification type
      if (preferences.notifications[notificationType] !== undefined) {
        preferences.notifications[notificationType] = false;
        await preferences.save();
        
        res.json({
          success: true,
          message: `Successfully unsubscribed from ${notificationType} notifications`,
          user: user ? { businessName: user.businessName, email: user.email } : null
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Invalid notification type'
        });
      }
    } else {
      // Unsubscribe from all notifications
      Object.keys(preferences.notifications).forEach(key => {
        preferences.notifications[key] = false;
      });
      preferences.frequency = 'never';
      await preferences.save();

      res.json({
        success: true,
        message: 'Successfully unsubscribed from all email notifications',
        user: user ? { businessName: user.businessName, email: user.email } : null
      });
    }

  } catch (error) {
    console.error('Unsubscribe error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to unsubscribe',
      error: error.message 
    });
  }
});

/**
 * @route GET /api/email-preferences/unsubscribe/:token
 * @desc Show unsubscribe page
 */
router.get('/unsubscribe/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const preferences = await EmailPreferences.findByUnsubscribeToken(token);

    if (!preferences) {
      return res.status(404).send(`
        <html>
          <head><title>Invalid Unsubscribe Link</title></head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2>Invalid Unsubscribe Link</h2>
            <p>The unsubscribe link you clicked is invalid or has expired.</p>
            <p>If you continue to receive unwanted emails, please contact our support team.</p>
          </body>
        </html>
      `);
    }

    const user = await User.findById(preferences.userId);

    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Unsubscribe from VirdisPay Emails</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f8f9fa; }
          .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 28px; font-weight: 700; color: #667eea; margin-bottom: 10px; }
          .notification-list { margin: 20px 0; }
          .notification-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #e9ecef; }
          .btn { padding: 12px 24px; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; text-decoration: none; display: inline-block; margin: 10px 5px; }
          .btn-primary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
          .btn-danger { background: #dc3545; color: white; }
          .btn-secondary { background: #6c757d; color: white; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🌿 VirdisPay</div>
            <h1>Email Preferences</h1>
          </div>
          
          <p>Hello ${user ? user.businessName || user.firstName : 'User'},</p>
          
          <p>Manage your email notification preferences below:</p>
          
          <div class="notification-list">
            <div class="notification-item">
              <span>Payment Confirmations</span>
              <button class="btn btn-secondary" onclick="unsubscribe('paymentConfirmations')">Unsubscribe</button>
            </div>
            <div class="notification-item">
              <span>KYC Status Updates</span>
              <button class="btn btn-secondary" onclick="unsubscribe('kycStatusUpdates')">Unsubscribe</button>
            </div>
            <div class="notification-item">
              <span>Compliance Alerts</span>
              <button class="btn btn-secondary" onclick="unsubscribe('complianceAlerts')">Unsubscribe</button>
            </div>
            <div class="notification-item">
              <span>Transaction Receipts</span>
              <button class="btn btn-secondary" onclick="unsubscribe('transactionReceipts')">Unsubscribe</button>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <button class="btn btn-danger" onclick="unsubscribeAll()">Unsubscribe from All Emails</button>
          </div>
          
          <div id="result" style="margin-top: 20px; padding: 15px; border-radius: 8px; display: none;"></div>
        </div>
        
        <script>
          async function unsubscribe(type) {
            try {
              const response = await fetch('/api/email-preferences/unsubscribe/${token}', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notificationType: type })
              });
              
              const result = await response.json();
              showResult(result.message, 'success');
            } catch (error) {
              showResult('Failed to unsubscribe. Please try again.', 'error');
            }
          }
          
          async function unsubscribeAll() {
            if (confirm('Are you sure you want to unsubscribe from all email notifications?')) {
              try {
                const response = await fetch('/api/email-preferences/unsubscribe/${token}', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({})
                });
                
                const result = await response.json();
                showResult(result.message, 'success');
              } catch (error) {
                showResult('Failed to unsubscribe. Please try again.', 'error');
              }
            }
          }
          
          function showResult(message, type) {
            const resultDiv = document.getElementById('result');
            resultDiv.style.display = 'block';
            resultDiv.style.background = type === 'success' ? '#d4edda' : '#f8d7da';
            resultDiv.style.color = type === 'success' ? '#155724' : '#721c24';
            resultDiv.style.border = '1px solid ' + (type === 'success' ? '#c3e6cb' : '#f5c6cb');
            resultDiv.textContent = message;
          }
        </script>
      </body>
      </html>
    `);

  } catch (error) {
    console.error('Unsubscribe page error:', error);
    res.status(500).send(`
      <html>
        <head><title>Error</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h2>Error</h2>
          <p>An error occurred while loading the unsubscribe page. Please try again later.</p>
        </body>
      </html>
    `);
  }
});

/**
 * @route POST /api/email-preferences/resubscribe/:token
 * @desc Resubscribe user to emails
 */
router.post('/resubscribe/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const preferences = await EmailPreferences.findByUnsubscribeToken(token);

    if (!preferences) {
      return res.status(404).json({ 
        success: false,
        message: 'Invalid token' 
      });
    }

    // Reset all notifications to default (enabled)
    Object.keys(preferences.notifications).forEach(key => {
      preferences.notifications[key] = true;
    });
    preferences.frequency = 'immediate';
    await preferences.save();

    const user = await User.findById(preferences.userId);

    res.json({
      success: true,
      message: 'Successfully resubscribed to all email notifications',
      user: user ? { businessName: user.businessName, email: user.email } : null
    });

  } catch (error) {
    console.error('Resubscribe error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to resubscribe',
      error: error.message 
    });
  }
});

/**
 * @route GET /api/email-preferences/stats
 * @desc Get email delivery statistics (admin only)
 */
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    // Check if user is admin (you might want to add admin role checking)
    const userId = req.user.id;
    const user = await User.findById(userId);
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const stats = await EmailPreferences.aggregate([
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          totalEmailsSent: { $sum: '$stats.totalEmailsSent' },
          avgEmailsPerUser: { $avg: '$stats.totalEmailsSent' }
        }
      }
    ]);

    const notificationStats = await EmailPreferences.aggregate([
      {
        $project: {
          notifications: 1
        }
      },
      {
        $unwind: '$notifications'
      },
      {
        $group: {
          _id: '$notifications.k',
          enabled: { $sum: { $cond: ['$notifications.v', 1, 0] } },
          disabled: { $sum: { $cond: ['$notifications.v', 0, 1] } }
        }
      }
    ]);

    res.json({
      success: true,
      stats: stats[0] || { totalUsers: 0, totalEmailsSent: 0, avgEmailsPerUser: 0 },
      notificationStats
    });

  } catch (error) {
    console.error('Get email stats error:', error);
    res.status(500).json({ error: 'Failed to get email statistics' });
  }
});

module.exports = router;




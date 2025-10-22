/**
 * Real-time Notification Service
 * Handles WebSocket connections and real-time notifications for VirdisPay
 */

const EventEmitter = require('events');
const jwt = require('jsonwebtoken');

class NotificationService extends EventEmitter {
    constructor() {
        super();
        this.connectedClients = new Map(); // userId -> Set of socket connections
        this.roomSubscriptions = new Map(); // roomId -> Set of socket connections
        this.notificationHistory = new Map(); // userId -> Array of notifications
        this.maxHistoryPerUser = 100; // Keep last 100 notifications per user
        
        this.setupEventHandlers();
    }

    /**
     * Setup event handlers for different notification types
     */
    setupEventHandlers() {
        // Payment notifications
        this.on('payment:created', this.handlePaymentCreated.bind(this));
        this.on('payment:processed', this.handlePaymentProcessed.bind(this));
        this.on('payment:completed', this.handlePaymentCompleted.bind(this));
        this.on('payment:failed', this.handlePaymentFailed.bind(this));

        // KYC notifications
        this.on('kyc:status_updated', this.handleKYCStatusUpdated.bind(this));
        this.on('kyc:document_uploaded', this.handleKYCDocumentUploaded.bind(this));
        this.on('kyc:verification_complete', this.handleKYCVerificationComplete.bind(this));

        // Compliance notifications
        this.on('compliance:alert', this.handleComplianceAlert.bind(this));
        this.on('compliance:threshold_exceeded', this.handleComplianceThresholdExceeded.bind(this));

        // System notifications
        this.on('system:maintenance', this.handleSystemMaintenance.bind(this));
        this.on('system:security_alert', this.handleSecurityAlert.bind(this));
    }

    /**
     * Add client connection
     */
    addClient(socket, userId) {
        if (!this.connectedClients.has(userId)) {
            this.connectedClients.set(userId, new Set());
        }
        
        this.connectedClients.get(userId).add(socket);
        
        // Send pending notifications
        this.sendPendingNotifications(userId, socket);
        
        console.log(`Client connected: ${userId} (${this.connectedClients.get(userId).size} connections)`);
    }

    /**
     * Remove client connection
     */
    removeClient(socket, userId) {
        if (this.connectedClients.has(userId)) {
            this.connectedClients.get(userId).delete(socket);
            
            // Clean up empty user entries
            if (this.connectedClients.get(userId).size === 0) {
                this.connectedClients.delete(userId);
            }
        }
        
        // Remove from all rooms
        this.roomSubscriptions.forEach((clients, roomId) => {
            clients.delete(socket);
            if (clients.size === 0) {
                this.roomSubscriptions.delete(roomId);
            }
        });
        
        console.log(`Client disconnected: ${userId}`);
    }

    /**
     * Subscribe client to room
     */
    subscribeToRoom(socket, roomId) {
        if (!this.roomSubscriptions.has(roomId)) {
            this.roomSubscriptions.set(roomId, new Set());
        }
        
        this.roomSubscriptions.get(roomId).add(socket);
        console.log(`Client subscribed to room: ${roomId}`);
    }

    /**
     * Unsubscribe client from room
     */
    unsubscribeFromRoom(socket, roomId) {
        if (this.roomSubscriptions.has(roomId)) {
            this.roomSubscriptions.get(roomId).delete(socket);
            
            if (this.roomSubscriptions.get(roomId).size === 0) {
                this.roomSubscriptions.delete(roomId);
            }
        }
    }

    /**
     * Send notification to specific user
     */
    sendToUser(userId, notification) {
        const clients = this.connectedClients.get(userId);
        
        if (clients && clients.size > 0) {
            const notificationData = this.formatNotification(notification);
            
            clients.forEach(socket => {
                if (socket.connected) {
                    socket.emit('notification', notificationData);
                }
            });
            
            // Store in history
            this.storeNotification(userId, notificationData);
            
            console.log(`Notification sent to user ${userId}: ${notification.type}`);
        } else {
            // Store for later delivery
            this.storeNotification(userId, this.formatNotification(notification));
            console.log(`Notification stored for offline user ${userId}: ${notification.type}`);
        }
    }

    /**
     * Send notification to room
     */
    sendToRoom(roomId, notification) {
        const clients = this.roomSubscriptions.get(roomId);
        
        if (clients && clients.size > 0) {
            const notificationData = this.formatNotification(notification);
            
            clients.forEach(socket => {
                if (socket.connected) {
                    socket.emit('notification', notificationData);
                }
            });
            
            console.log(`Notification sent to room ${roomId}: ${notification.type}`);
        }
    }

    /**
     * Broadcast notification to all connected clients
     */
    broadcast(notification) {
        const notificationData = this.formatNotification(notification);
        
        this.connectedClients.forEach((clients, userId) => {
            clients.forEach(socket => {
                if (socket.connected) {
                    socket.emit('notification', notificationData);
                }
            });
        });
        
        console.log(`Broadcast notification: ${notification.type}`);
    }

    /**
     * Send pending notifications to newly connected client
     */
    sendPendingNotifications(userId, socket) {
        const notifications = this.notificationHistory.get(userId) || [];
        const recentNotifications = notifications.slice(-10); // Send last 10 notifications
        
        recentNotifications.forEach(notification => {
            socket.emit('notification', notification);
        });
        
        if (recentNotifications.length > 0) {
            console.log(`Sent ${recentNotifications.length} pending notifications to ${userId}`);
        }
    }

    /**
     * Store notification in history
     */
    storeNotification(userId, notification) {
        if (!this.notificationHistory.has(userId)) {
            this.notificationHistory.set(userId, []);
        }
        
        const history = this.notificationHistory.get(userId);
        history.push(notification);
        
        // Keep only the most recent notifications
        if (history.length > this.maxHistoryPerUser) {
            history.splice(0, history.length - this.maxHistoryPerUser);
        }
    }

    /**
     * Format notification data
     */
    formatNotification(notification) {
        return {
            id: notification.id || this.generateNotificationId(),
            type: notification.type,
            title: notification.title,
            message: notification.message,
            data: notification.data || {},
            priority: notification.priority || 'normal',
            timestamp: notification.timestamp || new Date().toISOString(),
            read: false,
            actions: notification.actions || []
        };
    }

    /**
     * Generate unique notification ID
     */
    generateNotificationId() {
        return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Handle payment created notification
     */
    handlePaymentCreated(data) {
        const notification = {
            type: 'payment_created',
            title: 'New Payment Request',
            message: `Payment request for $${data.amount} ${data.currency} from ${data.customerEmail}`,
            data: {
                paymentId: data.paymentId,
                amount: data.amount,
                currency: data.currency,
                customerEmail: data.customerEmail,
                description: data.description
            },
            priority: 'high',
            actions: [
                { label: 'View Payment', action: 'view_payment', data: { paymentId: data.paymentId } }
            ]
        };
        
        this.sendToUser(data.merchantId, notification);
    }

    /**
     * Handle payment processed notification
     */
    handlePaymentProcessed(data) {
        const notification = {
            type: 'payment_processed',
            title: 'Payment Processing',
            message: `Payment of $${data.amount} ${data.currency} is being processed on ${data.network}`,
            data: {
                paymentId: data.paymentId,
                amount: data.amount,
                currency: data.currency,
                network: data.network,
                txHash: data.txHash
            },
            priority: 'high',
            actions: [
                { label: 'View Transaction', action: 'view_transaction', data: { txHash: data.txHash } }
            ]
        };
        
        this.sendToUser(data.merchantId, notification);
    }

    /**
     * Handle payment completed notification
     */
    handlePaymentCompleted(data) {
        const notification = {
            type: 'payment_completed',
            title: 'Payment Completed!',
            message: `Payment of $${data.amount} ${data.currency} has been successfully completed`,
            data: {
                paymentId: data.paymentId,
                amount: data.amount,
                currency: data.currency,
                network: data.network,
                txHash: data.txHash,
                confirmationTime: data.confirmationTime
            },
            priority: 'high',
            actions: [
                { label: 'View Receipt', action: 'view_receipt', data: { paymentId: data.paymentId } }
            ]
        };
        
        this.sendToUser(data.merchantId, notification);
    }

    /**
     * Handle payment failed notification
     */
    handlePaymentFailed(data) {
        const notification = {
            type: 'payment_failed',
            title: 'Payment Failed',
            message: `Payment of $${data.amount} ${data.currency} failed: ${data.reason}`,
            data: {
                paymentId: data.paymentId,
                amount: data.amount,
                currency: data.currency,
                reason: data.reason,
                errorCode: data.errorCode
            },
            priority: 'high',
            actions: [
                { label: 'Retry Payment', action: 'retry_payment', data: { paymentId: data.paymentId } }
            ]
        };
        
        this.sendToUser(data.merchantId, notification);
    }

    /**
     * Handle KYC status updated notification
     */
    handleKYCStatusUpdated(data) {
        const statusMessages = {
            'approved': 'Your KYC verification has been approved!',
            'pending_review': 'Your KYC verification is under review',
            'rejected': 'Your KYC verification requires attention',
            'in_progress': 'Your KYC verification is in progress'
        };
        
        const notification = {
            type: 'kyc_status_updated',
            title: 'KYC Status Update',
            message: statusMessages[data.status] || 'Your KYC status has been updated',
            data: {
                status: data.status,
                riskLevel: data.riskLevel,
                progress: data.progress,
                documentsRequired: data.documentsRequired,
                documentsVerified: data.documentsVerified
            },
            priority: data.status === 'rejected' ? 'high' : 'normal',
            actions: [
                { label: 'View KYC Status', action: 'view_kyc', data: {} }
            ]
        };
        
        this.sendToUser(data.merchantId, notification);
    }

    /**
     * Handle KYC document uploaded notification
     */
    handleKYCDocumentUploaded(data) {
        const notification = {
            type: 'kyc_document_uploaded',
            title: 'Document Uploaded',
            message: `Document "${data.documentType}" has been uploaded and is being verified`,
            data: {
                documentType: data.documentType,
                documentId: data.documentId,
                uploadTime: data.uploadTime
            },
            priority: 'normal',
            actions: [
                { label: 'View Documents', action: 'view_documents', data: {} }
            ]
        };
        
        this.sendToUser(data.merchantId, notification);
    }

    /**
     * Handle KYC verification complete notification
     */
    handleKYCVerificationComplete(data) {
        const notification = {
            type: 'kyc_verification_complete',
            title: 'KYC Verification Complete!',
            message: 'Your KYC verification has been completed successfully',
            data: {
                verificationScore: data.verificationScore,
                riskLevel: data.riskLevel,
                completedAt: data.completedAt
            },
            priority: 'high',
            actions: [
                { label: 'View Compliance Dashboard', action: 'view_compliance', data: {} }
            ]
        };
        
        this.sendToUser(data.merchantId, notification);
    }

    /**
     * Handle compliance alert notification
     */
    handleComplianceAlert(data) {
        const notification = {
            type: 'compliance_alert',
            title: 'Compliance Alert',
            message: data.message,
            data: {
                alertType: data.alertType,
                severity: data.severity,
                deadline: data.deadline,
                actionRequired: data.actionRequired
            },
            priority: data.severity === 'high' ? 'high' : 'normal',
            actions: [
                { label: 'View Alert', action: 'view_compliance_alert', data: { alertId: data.alertId } }
            ]
        };
        
        this.sendToUser(data.merchantId, notification);
    }

    /**
     * Handle compliance threshold exceeded notification
     */
    handleComplianceThresholdExceeded(data) {
        const notification = {
            type: 'compliance_threshold_exceeded',
            title: 'Transaction Limit Exceeded',
            message: `Transaction limit exceeded: $${data.amount} ${data.currency}`,
            data: {
                threshold: data.threshold,
                amount: data.amount,
                currency: data.currency,
                limitType: data.limitType
            },
            priority: 'high',
            actions: [
                { label: 'View Limits', action: 'view_limits', data: {} }
            ]
        };
        
        this.sendToUser(data.merchantId, notification);
    }

    /**
     * Handle system maintenance notification
     */
    handleSystemMaintenance(data) {
        const notification = {
            type: 'system_maintenance',
            title: 'Scheduled Maintenance',
            message: data.message,
            data: {
                scheduledTime: data.scheduledTime,
                estimatedDuration: data.estimatedDuration,
                affectedServices: data.affectedServices
            },
            priority: 'normal',
            actions: [
                { label: 'View Details', action: 'view_maintenance', data: { maintenanceId: data.maintenanceId } }
            ]
        };
        
        this.broadcast(notification);
    }

    /**
     * Handle security alert notification
     */
    handleSecurityAlert(data) {
        const notification = {
            type: 'security_alert',
            title: 'Security Alert',
            message: data.message,
            data: {
                alertType: data.alertType,
                ipAddress: data.ipAddress,
                timestamp: data.timestamp,
                actionTaken: data.actionTaken
            },
            priority: 'high',
            actions: [
                { label: 'View Security Log', action: 'view_security_log', data: {} }
            ]
        };
        
        this.sendToUser(data.merchantId, notification);
    }

    /**
     * Get notification history for user
     */
    getNotificationHistory(userId, limit = 50) {
        const notifications = this.notificationHistory.get(userId) || [];
        return notifications.slice(-limit);
    }

    /**
     * Mark notification as read
     */
    markNotificationAsRead(userId, notificationId) {
        const notifications = this.notificationHistory.get(userId) || [];
        const notification = notifications.find(n => n.id === notificationId);
        
        if (notification) {
            notification.read = true;
            return true;
        }
        
        return false;
    }

    /**
     * Clear notification history for user
     */
    clearNotificationHistory(userId) {
        this.notificationHistory.delete(userId);
    }

    /**
     * Get connection statistics
     */
    getStats() {
        return {
            connectedUsers: this.connectedClients.size,
            totalConnections: Array.from(this.connectedClients.values()).reduce((sum, clients) => sum + clients.size, 0),
            activeRooms: this.roomSubscriptions.size,
            totalNotifications: Array.from(this.notificationHistory.values()).reduce((sum, notifications) => sum + notifications.length, 0)
        };
    }
}

module.exports = NotificationService;




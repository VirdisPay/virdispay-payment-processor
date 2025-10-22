/**
 * NotificationCenter Component
 * Real-time notification center for VirdisPay dashboard
 */

import React, { useState, useEffect } from 'react';
import useNotifications from '../hooks/useNotifications';
import './NotificationCenter.css';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data: any;
  priority: 'low' | 'normal' | 'high';
  timestamp: string;
  read: boolean;
  actions: Array<{
    label: string;
    action: string;
    data: any;
  }>;
}

interface NotificationCenterProps {
  token: string;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ token }) => {
  const {
    notifications,
    unreadCount,
    isConnected,
    connectionError,
    requestNotificationPermission,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    handleNotificationAction,
    getNotificationsByType,
    getNotificationsByPriority
  } = useNotifications(token);

  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'high' | 'payment' | 'kyc' | 'compliance'>('all');
  const [showPermissionRequest, setShowPermissionRequest] = useState(false);

  // Request notification permission on mount
  useEffect(() => {
    if (Notification.permission === 'default') {
      setShowPermissionRequest(true);
    }
  }, []);

  const handlePermissionRequest = async () => {
    const granted = await requestNotificationPermission();
    setShowPermissionRequest(!granted);
  };

  const getFilteredNotifications = (): Notification[] => {
    const typedNotifications = notifications as Notification[];
    
    switch (filter) {
      case 'unread':
        return typedNotifications.filter(n => !n.read);
      case 'high':
        return getNotificationsByPriority('high') as Notification[];
      case 'payment':
        return (getNotificationsByType('payment_created') as Notification[])
          .concat(getNotificationsByType('payment_processed') as Notification[])
          .concat(getNotificationsByType('payment_completed') as Notification[])
          .concat(getNotificationsByType('payment_failed') as Notification[]);
      case 'kyc':
        return (getNotificationsByType('kyc_status_updated') as Notification[])
          .concat(getNotificationsByType('kyc_document_uploaded') as Notification[])
          .concat(getNotificationsByType('kyc_verification_complete') as Notification[]);
      case 'compliance':
        return (getNotificationsByType('compliance_alert') as Notification[])
          .concat(getNotificationsByType('compliance_threshold_exceeded') as Notification[]);
      default:
        return typedNotifications;
    }
  };

  const getNotificationIcon = (type: string): string => {
    switch (type) {
      case 'payment_created':
      case 'payment_processed':
      case 'payment_completed':
        return '💰';
      case 'payment_failed':
        return '❌';
      case 'kyc_status_updated':
      case 'kyc_document_uploaded':
      case 'kyc_verification_complete':
        return '🛡️';
      case 'compliance_alert':
      case 'compliance_threshold_exceeded':
        return '⚠️';
      case 'system_maintenance':
        return '🔧';
      case 'security_alert':
        return '🚨';
      default:
        return '📢';
    }
  };

  const getNotificationColor = (priority: string): string => {
    switch (priority) {
      case 'high':
        return '#dc3545';
      case 'normal':
        return '#28a745';
      case 'low':
        return '#6c757d';
      default:
        return '#6c757d';
    }
  };

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
  };

  const handleActionClick = (notification: Notification, action: any) => {
    handleNotificationAction(action.action, action.data);
    markAsRead(notification.id);
  };

  const filteredNotifications = getFilteredNotifications();

  return (
    <div className="notification-center">
      {/* Permission Request Banner */}
      {showPermissionRequest && (
        <div className="permission-banner">
          <div className="permission-content">
            <span className="permission-icon">🔔</span>
            <span className="permission-text">
              Enable notifications to receive real-time updates about your payments and compliance status.
            </span>
            <button 
              className="permission-button"
              onClick={handlePermissionRequest}
            >
              Enable
            </button>
            <button 
              className="permission-dismiss"
              onClick={() => setShowPermissionRequest(false)}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Connection Status */}
      {connectionError && (
        <div className="connection-error">
          <span className="error-icon">⚠️</span>
          <span>Connection error: {connectionError}</span>
        </div>
      )}

      {/* Notification Toggle Button */}
      <button 
        className="notification-toggle"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="notification-icon">🔔</span>
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount}</span>
        )}
        {!isConnected && (
          <span className="connection-indicator offline"></span>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <div className="notification-panel">
          <div className="notification-header">
            <h3>Notifications</h3>
            <div className="notification-actions">
              <button 
                className="action-button"
                onClick={markAllAsRead}
                disabled={unreadCount === 0}
              >
                Mark All Read
              </button>
              <button 
                className="action-button"
                onClick={clearNotifications}
              >
                Clear All
              </button>
              <button 
                className="close-button"
                onClick={() => setIsOpen(false)}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="notification-filters">
            {[
              { key: 'all', label: 'All', count: notifications.length },
              { key: 'unread', label: 'Unread', count: unreadCount },
              { key: 'high', label: 'High Priority', count: getNotificationsByPriority('high').length },
              { key: 'payment', label: 'Payments', count: getNotificationsByType('payment_created').length + getNotificationsByType('payment_processed').length + getNotificationsByType('payment_completed').length },
              { key: 'kyc', label: 'KYC', count: getNotificationsByType('kyc_status_updated').length + getNotificationsByType('kyc_document_uploaded').length },
              { key: 'compliance', label: 'Compliance', count: getNotificationsByType('compliance_alert').length }
            ].map(filterOption => (
              <button
                key={filterOption.key}
                className={`filter-tab ${filter === filterOption.key ? 'active' : ''}`}
                onClick={() => setFilter(filterOption.key as any)}
              >
                {filterOption.label}
                {filterOption.count > 0 && (
                  <span className="filter-count">{filterOption.count}</span>
                )}
              </button>
            ))}
          </div>

          {/* Notifications List */}
          <div className="notifications-list">
            {filteredNotifications.length === 0 ? (
              <div className="no-notifications">
                <span className="no-notifications-icon">📭</span>
                <p>No notifications</p>
                <small>You'll receive notifications about payments, KYC updates, and compliance alerts here.</small>
              </div>
            ) : (
              filteredNotifications.map(notification => (
                <div
                  key={notification.id}
                  className={`notification-item ${!notification.read ? 'unread' : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="notification-content">
                    <div className="notification-icon">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="notification-details">
                      <div className="notification-title">
                        {notification.title}
                        {notification.priority === 'high' && (
                          <span className="priority-indicator" style={{ color: getNotificationColor(notification.priority) }}>
                            ●
                          </span>
                        )}
                      </div>
                      <div className="notification-message">
                        {notification.message}
                      </div>
                      <div className="notification-meta">
                        <span className="notification-time">
                          {formatTimestamp(notification.timestamp)}
                        </span>
                        {!notification.read && (
                          <span className="unread-indicator">●</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Notification Actions */}
                  {notification.actions && notification.actions.length > 0 && (
                    <div className="notification-actions">
                      {notification.actions.map((action, index) => (
                        <button
                          key={index}
                          className="notification-action-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleActionClick(notification, action);
                          }}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;


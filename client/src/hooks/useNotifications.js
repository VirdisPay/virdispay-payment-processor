/**
 * useNotifications Hook
 * Manages real-time notifications for VirdisPay
 */

import { useState, useEffect, useCallback } from 'react';
import io from 'socket.io-client';

const useNotifications = (token) => {
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);

  // Initialize socket connection
  useEffect(() => {
    if (!token) return;

    const newSocket = io(process.env.REACT_APP_API_URL || '', {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling']
    });

    // Connection events
    newSocket.on('connect', () => {
      console.log('Connected to notification server');
      setIsConnected(true);
      setConnectionError(null);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from notification server');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setConnectionError(error.message);
      setIsConnected(false);
    });

    // Notification events
    newSocket.on('notification', (notification) => {
      console.log('Received notification:', notification);
      setNotifications(prev => [notification, ...prev]);
      
      if (!notification.read) {
        setUnreadCount(prev => prev + 1);
      }

      // Show browser notification if permission granted
      if (Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/favicon.ico',
          tag: notification.id,
          data: notification
        });
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [token]);

  // Request notification permission
  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }, []);

  // Mark notification as read
  const markAsRead = useCallback((notificationId) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true }
          : notification
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
    setUnreadCount(0);
  }, []);

  // Clear notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  // Handle notification action
  const handleNotificationAction = useCallback((action, data) => {
    if (socket) {
      socket.emit('notification_action', { action, data });
    }
  }, [socket]);

  // Subscribe to room
  const subscribeToRoom = useCallback((roomId) => {
    if (socket) {
      socket.emit('subscribe_room', roomId);
    }
  }, [socket]);

  // Unsubscribe from room
  const unsubscribeFromRoom = useCallback((roomId) => {
    if (socket) {
      socket.emit('unsubscribe_room', roomId);
    }
  }, [socket]);

  // Filter notifications by type
  const getNotificationsByType = useCallback((type) => {
    return notifications.filter(notification => notification.type === type);
  }, [notifications]);

  // Get notifications by priority
  const getNotificationsByPriority = useCallback((priority) => {
    return notifications.filter(notification => notification.priority === priority);
  }, [notifications]);

  // Get recent notifications (last 24 hours)
  const getRecentNotifications = useCallback(() => {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return notifications.filter(notification => 
      new Date(notification.timestamp) > oneDayAgo
    );
  }, [notifications]);

  return {
    socket,
    notifications,
    unreadCount,
    isConnected,
    connectionError,
    requestNotificationPermission,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    handleNotificationAction,
    subscribeToRoom,
    unsubscribeFromRoom,
    getNotificationsByType,
    getNotificationsByPriority,
    getRecentNotifications
  };
};

export default useNotifications;




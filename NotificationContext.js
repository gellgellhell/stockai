/**
 * 알림 Context
 * 앱 전체에서 푸시 알림 상태 관리
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import * as notificationService from './services/notificationService';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children, userId }) => {
  // 푸시 토큰
  const [pushToken, setPushToken] = useState(null);
  const [permissionGranted, setPermissionGranted] = useState(false);

  // 알림 설정
  const [settings, setSettings] = useState({
    priceAlerts: true,
    analysisComplete: true,
    dailySummary: true,
    marketing: false,
    quietStart: '22:00',
    quietEnd: '08:00',
  });

  // 알림 이력
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // 로딩 상태
  const [loading, setLoading] = useState(false);

  // 리스너 참조
  const notificationListener = useRef();
  const responseListener = useRef();
  const appStateSubscription = useRef();

  // 푸시 알림 초기화
  const initializePushNotifications = useCallback(async () => {
    if (!userId) return;

    try {
      const token = await notificationService.registerForPushNotifications();

      if (token) {
        setPushToken(token);
        setPermissionGranted(true);

        // 서버에 토큰 등록
        await notificationService.registerPushToken(userId, token);
      }
    } catch (error) {
      console.error('Initialize push notifications error:', error);
    }
  }, [userId]);

  // 알림 설정 로드
  const loadSettings = useCallback(async () => {
    if (!userId) return;

    try {
      const response = await notificationService.getNotificationSettings(userId);
      if (response.success) {
        setSettings(response.data.settings);
      }
    } catch (error) {
      console.error('Load settings error:', error);
    }
  }, [userId]);

  // 알림 설정 업데이트
  const updateSettings = useCallback(async (updates) => {
    if (!userId) return { success: false, error: 'Not logged in' };

    try {
      const response = await notificationService.updateNotificationSettings(userId, updates);
      if (response.success) {
        setSettings(response.data.settings);
      }
      return response;
    } catch (error) {
      console.error('Update settings error:', error);
      return { success: false, error: error.message };
    }
  }, [userId]);

  // 알림 이력 로드
  const loadNotifications = useCallback(async (refresh = false) => {
    if (!userId) return;

    setLoading(true);
    try {
      const offset = refresh ? 0 : notifications.length;
      const response = await notificationService.getNotificationHistory(userId, 50, offset);

      if (response.success) {
        if (refresh) {
          setNotifications(response.data.notifications);
        } else {
          setNotifications((prev) => [...prev, ...response.data.notifications]);
        }
        setUnreadCount(response.data.unreadCount);
      }
    } catch (error) {
      console.error('Load notifications error:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, notifications.length]);

  // 알림 읽음 처리
  const markAsRead = useCallback(async (notificationId) => {
    if (!userId) return;

    try {
      const response = await notificationService.markAsRead(userId, notificationId);

      if (response.success) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Mark as read error:', error);
    }
  }, [userId]);

  // 모든 알림 읽음 처리
  const markAllAsRead = useCallback(async () => {
    if (!userId) return;

    try {
      const response = await notificationService.markAllAsRead(userId);

      if (response.success) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
        );
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Mark all as read error:', error);
    }
  }, [userId]);

  // 알림 클릭 처리
  const handleNotificationClick = useCallback(async (notificationId, data) => {
    if (!userId) return;

    await notificationService.markAsClicked(userId, notificationId);

    // 알림 타입에 따른 네비게이션 처리
    // 이 부분은 앱의 네비게이션 구조에 맞게 구현
    if (data?.type === 'price_alert' && data?.symbol) {
      // 해당 종목 화면으로 이동
      console.log('Navigate to symbol:', data.symbol);
    } else if (data?.type === 'analysis_complete' && data?.symbol) {
      // 분석 결과 화면으로 이동
      console.log('Navigate to analysis:', data.symbol);
    }
  }, [userId]);

  // 배지 업데이트
  const updateBadge = useCallback(async () => {
    await notificationService.setBadgeCount(unreadCount);
  }, [unreadCount]);

  // 배지 초기화
  const clearBadge = useCallback(async () => {
    await notificationService.clearBadge();
    setUnreadCount(0);
  }, []);

  // 알림 수신 핸들러
  const handleNotificationReceived = useCallback((notification) => {
    console.log('Notification received:', notification);

    // 알림 목록 새로고침
    loadNotifications(true);

    // 배지 업데이트
    setUnreadCount((prev) => prev + 1);
  }, [loadNotifications]);

  // 알림 응답 핸들러 (사용자가 알림 클릭)
  const handleNotificationResponse = useCallback((response) => {
    console.log('Notification response:', response);

    const notification = response.notification;
    const data = notification.request.content.data;

    // 알림 클릭 처리
    if (data?.notificationId) {
      handleNotificationClick(data.notificationId, data);
    }
  }, [handleNotificationClick]);

  // 앱 상태 변화 핸들러
  const handleAppStateChange = useCallback((nextAppState) => {
    if (nextAppState === 'active') {
      // 앱이 포그라운드로 돌아오면 알림 새로고침
      loadNotifications(true);
    }
  }, [loadNotifications]);

  // 초기화 및 리스너 설정
  useEffect(() => {
    if (userId) {
      initializePushNotifications();
      loadSettings();
      loadNotifications(true);

      // 알림 리스너 등록
      notificationListener.current = notificationService.addNotificationReceivedListener(
        handleNotificationReceived
      );

      responseListener.current = notificationService.addNotificationResponseListener(
        handleNotificationResponse
      );

      // 앱 상태 리스너 등록
      appStateSubscription.current = AppState.addEventListener('change', handleAppStateChange);
    }

    return () => {
      // 리스너 정리
      if (notificationListener.current) {
        notificationService.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        notificationService.removeNotificationSubscription(responseListener.current);
      }
      if (appStateSubscription.current) {
        appStateSubscription.current.remove();
      }
    };
  }, [
    userId,
    initializePushNotifications,
    loadSettings,
    loadNotifications,
    handleNotificationReceived,
    handleNotificationResponse,
    handleAppStateChange,
  ]);

  // 배지 업데이트
  useEffect(() => {
    updateBadge();
  }, [unreadCount, updateBadge]);

  const value = {
    // 상태
    pushToken,
    permissionGranted,
    settings,
    notifications,
    unreadCount,
    loading,

    // 메서드
    initializePushNotifications,
    loadSettings,
    updateSettings,
    loadNotifications,
    markAsRead,
    markAllAsRead,
    handleNotificationClick,
    clearBadge,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export default NotificationContext;

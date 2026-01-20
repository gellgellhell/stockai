/**
 * 푸시 알림 서비스 (프론트엔드)
 * Expo Push Notifications 및 백엔드 API 통신
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const API_BASE_URL = __DEV__
  ? 'http://localhost:3001/api'
  : 'https://stockai-backend-production.up.railway.app/api';

// 알림 핸들러 설정
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ========== 푸시 토큰 ==========

/**
 * 푸시 알림 권한 요청 및 토큰 발급
 */
export const registerForPushNotifications = async () => {
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  // 권한 확인
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // 권한 요청
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission denied');
    return null;
  }

  // Expo 푸시 토큰 발급
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;

    // Android 채널 설정
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#3B82F6',
      });

      await Notifications.setNotificationChannelAsync('price_alerts', {
        name: '가격 알림',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 500, 250, 500],
      });

      await Notifications.setNotificationChannelAsync('analysis', {
        name: '분석 알림',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    return token;
  } catch (error) {
    console.error('Get push token error:', error);
    return null;
  }
};

/**
 * 서버에 푸시 토큰 등록
 */
export const registerPushToken = async (userId, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/notifications/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
      },
      body: JSON.stringify({
        token,
        platform: Platform.OS,
        deviceId: Device.modelId,
      }),
    });
    return await response.json();
  } catch (error) {
    console.error('Register push token error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 서버에서 푸시 토큰 비활성화
 */
export const deactivatePushToken = async (userId, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/notifications/token`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
      },
      body: JSON.stringify({ token }),
    });
    return await response.json();
  } catch (error) {
    console.error('Deactivate push token error:', error);
    return { success: false, error: error.message };
  }
};

// ========== 알림 설정 ==========

/**
 * 알림 설정 조회
 */
export const getNotificationSettings = async (userId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/notifications/settings`, {
      headers: { 'x-user-id': userId },
    });
    return await response.json();
  } catch (error) {
    console.error('Get notification settings error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 알림 설정 업데이트
 */
export const updateNotificationSettings = async (userId, updates) => {
  try {
    const response = await fetch(`${API_BASE_URL}/notifications/settings`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
      },
      body: JSON.stringify(updates),
    });
    return await response.json();
  } catch (error) {
    console.error('Update notification settings error:', error);
    return { success: false, error: error.message };
  }
};

// ========== 알림 이력 ==========

/**
 * 알림 이력 조회
 */
export const getNotificationHistory = async (userId, limit = 50, offset = 0) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/notifications/history?limit=${limit}&offset=${offset}`,
      {
        headers: { 'x-user-id': userId },
      }
    );
    return await response.json();
  } catch (error) {
    console.error('Get notification history error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 알림 읽음 처리
 */
export const markAsRead = async (userId, notificationId) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/notifications/${notificationId}/read`,
      {
        method: 'PATCH',
        headers: { 'x-user-id': userId },
      }
    );
    return await response.json();
  } catch (error) {
    console.error('Mark as read error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 모든 알림 읽음 처리
 */
export const markAllAsRead = async (userId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/notifications/read-all`, {
      method: 'PATCH',
      headers: { 'x-user-id': userId },
    });
    return await response.json();
  } catch (error) {
    console.error('Mark all as read error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 알림 클릭 처리
 */
export const markAsClicked = async (userId, notificationId) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/notifications/${notificationId}/click`,
      {
        method: 'PATCH',
        headers: { 'x-user-id': userId },
      }
    );
    return await response.json();
  } catch (error) {
    console.error('Mark as clicked error:', error);
    return { success: false, error: error.message };
  }
};

// ========== 로컬 알림 ==========

/**
 * 로컬 알림 예약
 */
export const scheduleLocalNotification = async (title, body, data = {}, seconds = 1) => {
  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: 'default',
      },
      trigger: {
        seconds,
      },
    });
    return { success: true, notificationId };
  } catch (error) {
    console.error('Schedule notification error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 예약된 알림 취소
 */
export const cancelScheduledNotification = async (notificationId) => {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    return { success: true };
  } catch (error) {
    console.error('Cancel notification error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 모든 예약된 알림 취소
 */
export const cancelAllScheduledNotifications = async () => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    return { success: true };
  } catch (error) {
    console.error('Cancel all notifications error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 배지 수 설정
 */
export const setBadgeCount = async (count) => {
  try {
    await Notifications.setBadgeCountAsync(count);
    return { success: true };
  } catch (error) {
    console.error('Set badge count error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 배지 초기화
 */
export const clearBadge = async () => {
  return setBadgeCount(0);
};

// ========== 알림 리스너 ==========

/**
 * 알림 수신 리스너 등록
 */
export const addNotificationReceivedListener = (callback) => {
  return Notifications.addNotificationReceivedListener(callback);
};

/**
 * 알림 응답 리스너 등록 (사용자가 알림을 탭했을 때)
 */
export const addNotificationResponseListener = (callback) => {
  return Notifications.addNotificationResponseReceivedListener(callback);
};

/**
 * 리스너 제거
 */
export const removeNotificationSubscription = (subscription) => {
  Notifications.removeNotificationSubscription(subscription);
};

export default {
  registerForPushNotifications,
  registerPushToken,
  deactivatePushToken,
  getNotificationSettings,
  updateNotificationSettings,
  getNotificationHistory,
  markAsRead,
  markAllAsRead,
  markAsClicked,
  scheduleLocalNotification,
  cancelScheduledNotification,
  cancelAllScheduledNotifications,
  setBadgeCount,
  clearBadge,
  addNotificationReceivedListener,
  addNotificationResponseListener,
  removeNotificationSubscription,
};

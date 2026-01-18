/**
 * 푸시 알림 서비스
 * Expo Push Notifications 연동
 */

const db = require('../db/database');
const { Expo } = require('expo-server-sdk');

// Expo 푸시 클라이언트
const expo = new Expo();

// ========== 푸시 토큰 관리 ==========

/**
 * 푸시 토큰 등록/업데이트
 */
const registerPushToken = (userId, token, platform, deviceId = null) => {
  // Expo 토큰 유효성 검사
  if (!Expo.isExpoPushToken(token)) {
    return { success: false, error: 'Invalid Expo push token' };
  }

  try {
    // 기존 토큰 확인
    const existing = db.prepare(`
      SELECT id FROM push_tokens
      WHERE user_id = ? AND token = ?
    `).get(userId, token);

    if (existing) {
      // 기존 토큰 활성화 업데이트
      db.prepare(`
        UPDATE push_tokens
        SET is_active = 1, platform = ?, device_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(platform, deviceId, existing.id);
    } else {
      // 새 토큰 등록
      db.prepare(`
        INSERT INTO push_tokens (user_id, token, platform, device_id)
        VALUES (?, ?, ?, ?)
      `).run(userId, token, platform, deviceId);
    }

    return { success: true };
  } catch (error) {
    console.error('Register push token error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 푸시 토큰 비활성화
 */
const deactivatePushToken = (userId, token) => {
  try {
    db.prepare(`
      UPDATE push_tokens
      SET is_active = 0, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND token = ?
    `).run(userId, token);

    return { success: true };
  } catch (error) {
    console.error('Deactivate push token error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 사용자의 활성 푸시 토큰 조회
 */
const getUserPushTokens = (userId) => {
  try {
    const tokens = db.prepare(`
      SELECT token, platform FROM push_tokens
      WHERE user_id = ? AND is_active = 1
    `).all(userId);

    return { success: true, data: { tokens } };
  } catch (error) {
    console.error('Get push tokens error:', error);
    return { success: false, error: error.message };
  }
};

// ========== 알림 설정 ==========

/**
 * 알림 설정 조회
 */
const getNotificationSettings = (userId) => {
  try {
    let settings = db.prepare(`
      SELECT * FROM notification_settings WHERE user_id = ?
    `).get(userId);

    // 설정이 없으면 기본값 생성
    if (!settings) {
      db.prepare(`
        INSERT INTO notification_settings (user_id) VALUES (?)
      `).run(userId);

      settings = {
        user_id: userId,
        price_alerts: 1,
        analysis_complete: 1,
        daily_summary: 1,
        marketing: 0,
        quiet_start: '22:00',
        quiet_end: '08:00',
      };
    }

    return {
      success: true,
      data: {
        settings: {
          priceAlerts: !!settings.price_alerts,
          analysisComplete: !!settings.analysis_complete,
          dailySummary: !!settings.daily_summary,
          marketing: !!settings.marketing,
          quietStart: settings.quiet_start,
          quietEnd: settings.quiet_end,
        },
      },
    };
  } catch (error) {
    console.error('Get notification settings error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 알림 설정 업데이트
 */
const updateNotificationSettings = (userId, updates) => {
  try {
    // 먼저 설정이 존재하는지 확인
    const existing = db.prepare(`
      SELECT id FROM notification_settings WHERE user_id = ?
    `).get(userId);

    if (!existing) {
      db.prepare(`
        INSERT INTO notification_settings (user_id) VALUES (?)
      `).run(userId);
    }

    // 업데이트할 필드 매핑
    const fieldMap = {
      priceAlerts: 'price_alerts',
      analysisComplete: 'analysis_complete',
      dailySummary: 'daily_summary',
      marketing: 'marketing',
      quietStart: 'quiet_start',
      quietEnd: 'quiet_end',
    };

    const setClauses = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      if (fieldMap[key]) {
        setClauses.push(`${fieldMap[key]} = ?`);
        values.push(typeof value === 'boolean' ? (value ? 1 : 0) : value);
      }
    }

    if (setClauses.length > 0) {
      values.push(userId);
      db.prepare(`
        UPDATE notification_settings
        SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `).run(...values);
    }

    return getNotificationSettings(userId);
  } catch (error) {
    console.error('Update notification settings error:', error);
    return { success: false, error: error.message };
  }
};

// ========== 알림 전송 ==========

/**
 * 알림 전송 (단일 사용자)
 */
const sendNotification = async (userId, type, title, body, data = {}) => {
  try {
    // 알림 설정 확인
    const settingsResult = getNotificationSettings(userId);
    if (!settingsResult.success) {
      return { success: false, error: 'Failed to get settings' };
    }

    const settings = settingsResult.data.settings;

    // 알림 유형별 설정 확인
    if (type === 'price_alert' && !settings.priceAlerts) {
      return { success: false, error: 'Price alerts disabled' };
    }
    if (type === 'analysis_complete' && !settings.analysisComplete) {
      return { success: false, error: 'Analysis notifications disabled' };
    }
    if (type === 'daily_summary' && !settings.dailySummary) {
      return { success: false, error: 'Daily summary disabled' };
    }
    if (type === 'marketing' && !settings.marketing) {
      return { success: false, error: 'Marketing notifications disabled' };
    }

    // 방해금지 시간 확인
    if (isQuietTime(settings.quietStart, settings.quietEnd)) {
      // 방해금지 시간에는 전송하지 않음 (마케팅 알림만 해당)
      if (type === 'marketing') {
        return { success: false, error: 'Quiet time active' };
      }
    }

    // 푸시 토큰 조회
    const tokensResult = getUserPushTokens(userId);
    if (!tokensResult.success || tokensResult.data.tokens.length === 0) {
      return { success: false, error: 'No push tokens' };
    }

    // 알림 메시지 구성
    const messages = tokensResult.data.tokens.map(({ token }) => ({
      to: token,
      sound: 'default',
      title,
      body,
      data: { ...data, type },
    }));

    // 청크로 나누어 전송
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error('Send chunk error:', error);
      }
    }

    // 알림 이력 저장
    db.prepare(`
      INSERT INTO notification_history (user_id, type, title, body, data)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, type, title, body, JSON.stringify(data));

    return { success: true, tickets };
  } catch (error) {
    console.error('Send notification error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 방해금지 시간 확인
 */
const isQuietTime = (quietStart, quietEnd) => {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [startHour, startMin] = quietStart.split(':').map(Number);
  const [endHour, endMin] = quietEnd.split(':').map(Number);

  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  if (startMinutes <= endMinutes) {
    // 같은 날 내 (예: 09:00 ~ 17:00)
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } else {
    // 자정을 넘기는 경우 (예: 22:00 ~ 08:00)
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
};

/**
 * 가격 알림 전송
 */
const sendPriceAlert = async (userId, symbol, condition, targetPrice, currentPrice) => {
  const conditionText = condition === 'above' ? '이상' : '이하';
  const title = `${symbol} 가격 알림`;
  const body = `${symbol}이(가) 목표가 $${targetPrice} ${conditionText}에 도달했습니다. (현재: $${currentPrice})`;

  return sendNotification(userId, 'price_alert', title, body, {
    symbol,
    condition,
    targetPrice,
    currentPrice,
  });
};

/**
 * 분석 완료 알림 전송
 */
const sendAnalysisComplete = async (userId, symbol, analysisLevel) => {
  const title = '분석 완료';
  const body = `${symbol} Level ${analysisLevel} 분석이 완료되었습니다.`;

  return sendNotification(userId, 'analysis_complete', title, body, {
    symbol,
    analysisLevel,
  });
};

/**
 * 일일 요약 알림 전송
 */
const sendDailySummary = async (userId, summary) => {
  const title = '오늘의 관심종목 요약';
  const body = summary.message || '관심종목 현황을 확인해보세요.';

  return sendNotification(userId, 'daily_summary', title, body, summary);
};

// ========== 알림 이력 ==========

/**
 * 알림 이력 조회
 */
const getNotificationHistory = (userId, limit = 50, offset = 0) => {
  try {
    const notifications = db.prepare(`
      SELECT id, type, title, body, data, sent_at, read_at, clicked_at
      FROM notification_history
      WHERE user_id = ?
      ORDER BY sent_at DESC
      LIMIT ? OFFSET ?
    `).all(userId, limit, offset);

    const total = db.prepare(`
      SELECT COUNT(*) as count FROM notification_history WHERE user_id = ?
    `).get(userId).count;

    const unreadCount = db.prepare(`
      SELECT COUNT(*) as count FROM notification_history
      WHERE user_id = ? AND read_at IS NULL
    `).get(userId).count;

    return {
      success: true,
      data: {
        notifications: notifications.map((n) => ({
          ...n,
          data: n.data ? JSON.parse(n.data) : null,
        })),
        total,
        unreadCount,
      },
    };
  } catch (error) {
    console.error('Get notification history error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 알림 읽음 처리
 */
const markAsRead = (userId, notificationId) => {
  try {
    db.prepare(`
      UPDATE notification_history
      SET read_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ? AND read_at IS NULL
    `).run(notificationId, userId);

    return { success: true };
  } catch (error) {
    console.error('Mark as read error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 모든 알림 읽음 처리
 */
const markAllAsRead = (userId) => {
  try {
    db.prepare(`
      UPDATE notification_history
      SET read_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND read_at IS NULL
    `).run(userId);

    return { success: true };
  } catch (error) {
    console.error('Mark all as read error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 알림 클릭 처리
 */
const markAsClicked = (userId, notificationId) => {
  try {
    db.prepare(`
      UPDATE notification_history
      SET clicked_at = CURRENT_TIMESTAMP, read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
      WHERE id = ? AND user_id = ?
    `).run(notificationId, userId);

    return { success: true };
  } catch (error) {
    console.error('Mark as clicked error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 오래된 알림 정리 (30일 이상)
 */
const cleanupOldNotifications = () => {
  try {
    const result = db.prepare(`
      DELETE FROM notification_history
      WHERE sent_at < datetime('now', '-30 days')
    `).run();

    return { success: true, deleted: result.changes };
  } catch (error) {
    console.error('Cleanup notifications error:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  // 푸시 토큰
  registerPushToken,
  deactivatePushToken,
  getUserPushTokens,

  // 알림 설정
  getNotificationSettings,
  updateNotificationSettings,

  // 알림 전송
  sendNotification,
  sendPriceAlert,
  sendAnalysisComplete,
  sendDailySummary,

  // 알림 이력
  getNotificationHistory,
  markAsRead,
  markAllAsRead,
  markAsClicked,
  cleanupOldNotifications,
};

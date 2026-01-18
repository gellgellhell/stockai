/**
 * 푸시 알림 라우트
 */

const express = require('express');
const router = express.Router();
const notificationService = require('../services/notificationService');

// 사용자 ID 미들웨어
const getUserId = (req) => req.headers['x-user-id'] || 'anonymous';

// ========== 푸시 토큰 ==========

/**
 * 푸시 토큰 등록
 * POST /api/notifications/token
 */
router.post('/token', (req, res) => {
  const userId = getUserId(req);
  const { token, platform, deviceId } = req.body;

  if (!token || !platform) {
    return res.status(400).json({
      success: false,
      error: 'Token and platform are required',
    });
  }

  const result = notificationService.registerPushToken(userId, token, platform, deviceId);
  res.json(result);
});

/**
 * 푸시 토큰 비활성화
 * DELETE /api/notifications/token
 */
router.delete('/token', (req, res) => {
  const userId = getUserId(req);
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({
      success: false,
      error: 'Token is required',
    });
  }

  const result = notificationService.deactivatePushToken(userId, token);
  res.json(result);
});

// ========== 알림 설정 ==========

/**
 * 알림 설정 조회
 * GET /api/notifications/settings
 */
router.get('/settings', (req, res) => {
  const userId = getUserId(req);
  const result = notificationService.getNotificationSettings(userId);
  res.json(result);
});

/**
 * 알림 설정 업데이트
 * PATCH /api/notifications/settings
 */
router.patch('/settings', (req, res) => {
  const userId = getUserId(req);
  const updates = req.body;

  const result = notificationService.updateNotificationSettings(userId, updates);
  res.json(result);
});

// ========== 알림 이력 ==========

/**
 * 알림 이력 조회
 * GET /api/notifications/history
 */
router.get('/history', (req, res) => {
  const userId = getUserId(req);
  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;

  const result = notificationService.getNotificationHistory(userId, limit, offset);
  res.json(result);
});

/**
 * 단일 알림 읽음 처리
 * PATCH /api/notifications/:id/read
 */
router.patch('/:id/read', (req, res) => {
  const userId = getUserId(req);
  const notificationId = parseInt(req.params.id);

  const result = notificationService.markAsRead(userId, notificationId);
  res.json(result);
});

/**
 * 모든 알림 읽음 처리
 * PATCH /api/notifications/read-all
 */
router.patch('/read-all', (req, res) => {
  const userId = getUserId(req);
  const result = notificationService.markAllAsRead(userId);
  res.json(result);
});

/**
 * 알림 클릭 처리
 * PATCH /api/notifications/:id/click
 */
router.patch('/:id/click', (req, res) => {
  const userId = getUserId(req);
  const notificationId = parseInt(req.params.id);

  const result = notificationService.markAsClicked(userId, notificationId);
  res.json(result);
});

// ========== 테스트용 (개발 환경에서만) ==========

if (process.env.NODE_ENV !== 'production') {
  /**
   * 테스트 알림 전송
   * POST /api/notifications/test
   */
  router.post('/test', async (req, res) => {
    const userId = getUserId(req);
    const { type, title, body, data } = req.body;

    const result = await notificationService.sendNotification(
      userId,
      type || 'test',
      title || '테스트 알림',
      body || '테스트 알림입니다.',
      data || {}
    );

    res.json(result);
  });
}

module.exports = router;

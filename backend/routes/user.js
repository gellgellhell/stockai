/**
 * 사용자 및 사용량 관리 라우트
 */

const express = require('express');
const router = express.Router();
const {
  getOrCreateUser,
  updateUserPlan,
  getTodayUsage,
  getUserStats,
  getGlobalStats,
  resetDailyUsage,
  checkUsageLimit
} = require('../services/usageService');
const { PLANS } = require('../config/plans');
const { extractUserId } = require('../middleware/usageMiddleware');

/**
 * GET /api/user/me
 * 현재 사용자 정보 조회
 */
router.get('/me', (req, res) => {
  try {
    const userId = extractUserId(req);
    const user = getOrCreateUser(userId);
    const plan = PLANS[user.plan] || PLANS.free;

    res.json({
      success: true,
      data: {
        userId: user.user_id,
        email: user.email,
        plan: {
          id: user.plan,
          name: plan.name,
          nameKr: plan.nameKr,
          price: plan.priceDisplay
        },
        limits: plan.limits,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error('User info error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/user/usage
 * 오늘의 사용량 조회
 */
router.get('/usage', (req, res) => {
  try {
    const userId = extractUserId(req);
    const user = getOrCreateUser(userId);
    const plan = PLANS[user.plan] || PLANS.free;
    const usage = getTodayUsage(userId);

    // 각 타입별 남은 횟수 계산
    const formatLimit = (limit, used) => {
      if (limit === -1) return { limit: '무제한', used, remaining: '무제한' };
      return { limit, used, remaining: Math.max(0, limit - used) };
    };

    res.json({
      success: true,
      data: {
        plan: user.plan,
        planName: plan.nameKr,
        date: usage.date,
        refresh: formatLimit(plan.limits.dailyRefresh, usage.refresh_count),
        level1: formatLimit(plan.limits.level1Analysis, usage.level1_count),
        level2: formatLimit(plan.limits.level2Analysis, usage.level2_count),
        level3: formatLimit(plan.limits.level3Analysis, usage.level3_count)
      }
    });
  } catch (error) {
    console.error('Usage info error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/user/stats
 * 사용자 통계 조회
 */
router.get('/stats', (req, res) => {
  try {
    const userId = extractUserId(req);
    const days = parseInt(req.query.days) || 30;
    const stats = getUserStats(userId, days);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('User stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/user/plan
 * 플랜 변경 (실제로는 결제 시스템과 연동)
 */
router.post('/plan', (req, res) => {
  try {
    const userId = extractUserId(req);
    const { plan } = req.body;

    if (!PLANS[plan]) {
      return res.status(400).json({
        success: false,
        error: 'Invalid plan',
        validPlans: Object.keys(PLANS)
      });
    }

    const result = updateUserPlan(userId, plan);

    res.json({
      success: true,
      data: {
        message: `플랜이 ${result.oldPlan}에서 ${result.newPlan}으로 변경되었습니다`,
        ...result,
        newPlanInfo: PLANS[plan]
      }
    });
  } catch (error) {
    console.error('Plan update error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/user/check-limit
 * 특정 사용량 제한 체크
 */
router.get('/check-limit', (req, res) => {
  try {
    const userId = extractUserId(req);
    const { type = 'level1' } = req.query;

    const check = checkUsageLimit(userId, type);

    res.json({
      success: true,
      data: {
        type,
        ...check
      }
    });
  } catch (error) {
    console.error('Check limit error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/user/reset-usage (개발용)
 * 일일 사용량 리셋
 */
router.post('/reset-usage', (req, res) => {
  try {
    // 프로덕션에서는 비활성화
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Not allowed in production' });
    }

    const userId = extractUserId(req);
    resetDailyUsage(userId);

    res.json({
      success: true,
      message: '오늘의 사용량이 리셋되었습니다',
      usage: getTodayUsage(userId)
    });
  } catch (error) {
    console.error('Reset usage error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/user/admin/stats (관리자용)
 * 전체 통계 조회
 */
router.get('/admin/stats', (req, res) => {
  try {
    // 실제로는 관리자 권한 체크 필요
    const days = parseInt(req.query.days) || 7;
    const stats = getGlobalStats(days);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

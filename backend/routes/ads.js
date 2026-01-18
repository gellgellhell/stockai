/**
 * 광고 보상 라우트
 * 광고 시청 및 보상 지급 API
 */

const express = require('express');
const router = express.Router();
const {
  AD_REWARD_CONFIG,
  canWatchAd,
  completeAdWatch,
  getTotalAvailableUsage,
  canUnlockWithAd,
  getUserAdStats,
  getDailyAdSummary
} = require('../services/adRewardService');
const { getOrCreateUser } = require('../services/usageService');
const { extractUserId } = require('../middleware/usageMiddleware');

/**
 * GET /api/ads/config
 * 광고 보상 설정 조회
 */
router.get('/config', (req, res) => {
  res.json({
    success: true,
    data: {
      rewards: AD_REWARD_CONFIG.rewards,
      dailyLimits: AD_REWARD_CONFIG.dailyLimits,
      cooldown: AD_REWARD_CONFIG.cooldown,
      adEnabledPlans: AD_REWARD_CONFIG.adEnabledPlans
    }
  });
});

/**
 * GET /api/ads/status
 * 광고 시청 가능 상태 확인
 */
router.get('/status', (req, res) => {
  try {
    const userId = extractUserId(req);
    const user = getOrCreateUser(userId);

    // 유료 플랜은 광고 불필요
    if (!AD_REWARD_CONFIG.adEnabledPlans.includes(user.plan)) {
      return res.json({
        success: true,
        data: {
          adsEnabled: false,
          reason: '현재 플랜에서는 광고 없이 이용 가능합니다',
          plan: user.plan
        }
      });
    }

    const rewardedStatus = canWatchAd(userId, 'rewarded');
    const interstitialStatus = canWatchAd(userId, 'interstitial');
    const todaySummary = getDailyAdSummary(userId);

    res.json({
      success: true,
      data: {
        adsEnabled: true,
        rewarded: rewardedStatus,
        interstitial: interstitialStatus,
        todaySummary: {
          adsWatched: todaySummary.total_ads_watched,
          refreshEarned: todaySummary.refresh_earned,
          level2Earned: todaySummary.level2_earned
        }
      }
    });
  } catch (error) {
    console.error('Ad status error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/ads/can-unlock
 * 특정 사용량을 광고로 해제 가능한지 확인
 */
router.get('/can-unlock', (req, res) => {
  try {
    const userId = extractUserId(req);
    const { type = 'refresh' } = req.query;

    const result = canUnlockWithAd(userId, type);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Can unlock error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ads/watch
 * 광고 시청 시작 (프론트엔드에서 광고 표시 전 호출)
 */
router.post('/watch', (req, res) => {
  try {
    const userId = extractUserId(req);
    const { adType = 'rewarded' } = req.body;

    const canWatch = canWatchAd(userId, adType);

    if (!canWatch.canWatch) {
      return res.status(429).json({
        success: false,
        ...canWatch
      });
    }

    // 광고 시청 토큰 생성 (실제로는 서명된 토큰 사용)
    const watchToken = Buffer.from(JSON.stringify({
      userId,
      adType,
      timestamp: Date.now(),
      expiresIn: 300000 // 5분
    })).toString('base64');

    res.json({
      success: true,
      data: {
        watchToken,
        adType,
        expectedRewards: AD_REWARD_CONFIG.rewards[adType],
        message: '광고를 시청해주세요'
      }
    });
  } catch (error) {
    console.error('Watch ad error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ads/complete
 * 광고 시청 완료 및 보상 지급
 */
router.post('/complete', (req, res) => {
  try {
    const userId = extractUserId(req);
    const {
      adType = 'rewarded',
      watchToken,
      adProvider,
      adUnitId
    } = req.body;

    // 토큰 검증 (실제로는 서명 검증 필요)
    if (watchToken) {
      try {
        const tokenData = JSON.parse(Buffer.from(watchToken, 'base64').toString());

        // 만료 체크
        if (Date.now() - tokenData.timestamp > tokenData.expiresIn) {
          return res.status(400).json({
            success: false,
            error: 'TOKEN_EXPIRED',
            message: '광고 시청 세션이 만료되었습니다. 다시 시도해주세요.'
          });
        }

        // 사용자 확인
        if (tokenData.userId !== userId) {
          return res.status(400).json({
            success: false,
            error: 'INVALID_TOKEN',
            message: '유효하지 않은 토큰입니다.'
          });
        }
      } catch (e) {
        // 토큰 파싱 실패 - 개발 환경에서는 무시
        console.warn('Token validation skipped:', e.message);
      }
    }

    // 광고 완료 처리 및 보상 지급
    const result = completeAdWatch(userId, adType, adProvider, adUnitId);

    if (!result.success) {
      return res.status(429).json(result);
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Complete ad error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/ads/usage
 * 광고 보상 포함 총 사용량 조회
 */
router.get('/usage', (req, res) => {
  try {
    const userId = extractUserId(req);
    const user = getOrCreateUser(userId);

    const usage = getTotalAvailableUsage(userId, user.plan);

    res.json({
      success: true,
      data: {
        plan: user.plan,
        ...usage
      }
    });
  } catch (error) {
    console.error('Ad usage error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/ads/stats
 * 광고 시청 통계
 */
router.get('/stats', (req, res) => {
  try {
    const userId = extractUserId(req);
    const days = parseInt(req.query.days) || 30;

    const stats = getUserAdStats(userId, days);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Ad stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ads/simulate (개발용)
 * 광고 시청 시뮬레이션
 */
router.post('/simulate', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Not allowed in production' });
  }

  try {
    const userId = extractUserId(req);
    const { adType = 'rewarded', count = 1 } = req.body;

    const results = [];
    for (let i = 0; i < Math.min(count, 5); i++) {
      const result = completeAdWatch(userId, adType, 'simulator', 'test-unit');
      results.push(result);
      if (!result.success) break;
    }

    res.json({
      success: true,
      data: {
        simulated: results.length,
        results
      }
    });
  } catch (error) {
    console.error('Simulate ad error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

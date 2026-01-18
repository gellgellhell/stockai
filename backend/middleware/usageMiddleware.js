/**
 * 사용량 체크 미들웨어
 * API 요청 전 사용량 제한 확인 (광고 보상 포함)
 */

const { checkUsageLimit, incrementUsage, logApiCall, getOrCreateUser, getTodayUsage } = require('../services/usageService');
const { getAdEarnedUsage, canUnlockWithAd, AD_REWARD_CONFIG } = require('../services/adRewardService');
const { PLANS } = require('../config/plans');

/**
 * 사용자 ID 추출 (헤더 또는 쿼리에서)
 * 실제 구현에서는 JWT 토큰에서 추출
 */
const extractUserId = (req) => {
  // 헤더에서 사용자 ID 확인
  const userId = req.headers['x-user-id'] || req.query.userId || 'anonymous';
  return userId;
};

/**
 * 광고 보상 포함 사용량 체크
 */
const checkUsageWithAdBonus = (userId, usageType, plan) => {
  const planConfig = PLANS[plan] || PLANS.free;
  const usage = getTodayUsage(userId);
  const adEarned = getAdEarnedUsage(userId);

  // 사용량 타입에 따른 값 추출
  const typeMap = {
    level1: { limit: planConfig.limits.level1Analysis, used: usage.level1_count, adBonus: 0 },
    level2: { limit: planConfig.limits.level2Analysis, used: usage.level2_count, adBonus: adEarned.level2 },
    level3: { limit: planConfig.limits.level3Analysis, used: usage.level3_count, adBonus: adEarned.level3 },
    refresh: { limit: planConfig.limits.dailyRefresh, used: usage.refresh_count, adBonus: adEarned.refresh }
  };

  const { limit, used, adBonus } = typeMap[usageType] || { limit: 0, used: 0, adBonus: 0 };

  // -1은 무제한
  if (limit === -1) {
    return { allowed: true, remaining: -1, unlimited: true };
  }

  const totalLimit = limit + adBonus;

  if (used >= totalLimit) {
    return {
      allowed: false,
      message: `일일 ${usageType} 한도 초과`,
      baseLimit: limit,
      adBonus,
      totalLimit,
      current: used,
      remaining: 0
    };
  }

  return {
    allowed: true,
    baseLimit: limit,
    adBonus,
    totalLimit,
    current: used,
    remaining: totalLimit - used
  };
};

/**
 * 분석 레벨별 사용량 체크 미들웨어 (광고 보상 포함)
 */
const checkAnalysisUsage = (req, res, next) => {
  const userId = extractUserId(req);
  const level = parseInt(req.query.level) || 1;

  // 사용자 확인/생성
  const user = getOrCreateUser(userId);

  // 레벨에 따른 사용량 타입
  const usageType = `level${level}`;

  // 사용량 체크 (광고 보상 포함)
  const usageCheck = checkUsageWithAdBonus(userId, usageType, user.plan);

  if (!usageCheck.allowed) {
    // 광고로 해제 가능한지 확인
    const adUnlock = canUnlockWithAd(userId, usageType);
    const canWatchAd = AD_REWARD_CONFIG.adEnabledPlans.includes(user.plan) && adUnlock.canUnlock;

    return res.status(429).json({
      success: false,
      error: 'USAGE_LIMIT_EXCEEDED',
      message: usageCheck.message,
      baseLimit: usageCheck.baseLimit,
      adBonus: usageCheck.adBonus,
      totalLimit: usageCheck.totalLimit,
      current: usageCheck.current,
      // 광고로 해제 가능 여부
      adUnlock: canWatchAd ? {
        available: true,
        rewardAmount: adUnlock.rewardAmount,
        message: '광고를 시청하면 추가 사용량을 얻을 수 있습니다'
      } : null,
      // 플랜 업그레이드 힌트
      upgradeHint: {
        message: '더 많은 분석을 위해 플랜을 업그레이드하세요',
        currentPlan: user.plan,
        recommendedPlan: getRecommendedPlan(user.plan)
      }
    });
  }

  // 요청에 사용량 정보 첨부
  req.usageInfo = {
    userId,
    usageType,
    remaining: usageCheck.remaining,
    adBonus: usageCheck.adBonus,
    plan: user.plan
  };

  next();
};

/**
 * 새로고침 사용량 체크 미들웨어
 */
const checkRefreshUsage = (req, res, next) => {
  const userId = extractUserId(req);

  const user = getOrCreateUser(userId);
  const usageCheck = checkUsageLimit(userId, 'refresh');

  if (!usageCheck.allowed) {
    return res.status(429).json({
      success: false,
      error: 'REFRESH_LIMIT_EXCEEDED',
      message: usageCheck.message,
      limit: usageCheck.limit,
      current: usageCheck.current
    });
  }

  req.usageInfo = {
    userId,
    usageType: 'refresh',
    remaining: usageCheck.remaining,
    plan: user.plan
  };

  next();
};

/**
 * 사용량 기록 미들웨어 (응답 후 실행)
 */
const recordUsage = (req, res, next) => {
  const startTime = Date.now();

  // 원본 json 메서드 저장
  const originalJson = res.json.bind(res);

  // json 메서드 오버라이드
  res.json = (data) => {
    const responseTime = Date.now() - startTime;
    const userId = req.usageInfo?.userId || extractUserId(req);
    const usageType = req.usageInfo?.usageType;

    // 성공적인 응답인 경우에만 사용량 증가
    if (data.success && usageType) {
      incrementUsage(userId, usageType);
    }

    // API 로그 기록
    if (usageType) {
      const level = parseInt(req.query.level) || 1;

      logApiCall({
        userId,
        endpoint: req.originalUrl.split('?')[0],
        symbol: req.params.symbol,
        timeframe: req.query.timeframe,
        analysisLevel: level,
        method: data.data?.method,
        tokensUsed: data.data?.apiUsage?.totalTokens || 0,
        costUsd: parseFloat(data.data?.apiUsage?.estimatedCost?.estimatedUSD) || 0,
        responseTimeMs: responseTime,
        success: data.success,
        errorMessage: data.error
      });
    }

    // 응답에 사용량 정보 추가
    if (data.success && req.usageInfo) {
      data.usage = {
        type: usageType,
        remaining: req.usageInfo.remaining - 1,
        plan: req.usageInfo.plan
      };
    }

    return originalJson(data);
  };

  next();
};

/**
 * 추천 플랜 결정
 */
const getRecommendedPlan = (currentPlan) => {
  const planOrder = ['free', 'basic', 'pro', 'premium'];
  const currentIndex = planOrder.indexOf(currentPlan);

  if (currentIndex < planOrder.length - 1) {
    return planOrder[currentIndex + 1];
  }
  return null; // 이미 최상위 플랜
};

/**
 * 플랜 정보 미들웨어 (사용자 플랜 정보 첨부)
 */
const attachPlanInfo = (req, res, next) => {
  const userId = extractUserId(req);
  const user = getOrCreateUser(userId);
  const plan = PLANS[user.plan] || PLANS.free;

  req.userPlan = {
    userId: user.user_id,
    planId: user.plan,
    planName: plan.nameKr,
    limits: plan.limits
  };

  next();
};

module.exports = {
  extractUserId,
  checkAnalysisUsage,
  checkRefreshUsage,
  recordUsage,
  attachPlanInfo,
  getRecommendedPlan
};

/**
 * 광고 보상 서비스
 * 광고 시청 후 무료 사용량 지급
 */

const db = require('../db/database');
const { PLANS } = require('../config/plans');

// 광고 보상 설정
const AD_REWARD_CONFIG = {
  // 광고 타입별 보상
  rewards: {
    // 리워드 광고 (30초 영상)
    rewarded: {
      refresh: 3,      // 새로고침 3회
      level2: 1,       // Level 2 분석 1회
      level3: 0        // Level 3는 광고로 제공 안함
    },
    // 인터스티셜 광고 (전면 광고)
    interstitial: {
      refresh: 1,
      level2: 0,
      level3: 0
    }
  },

  // 일일 광고 시청 제한
  dailyLimits: {
    rewarded: 10,      // 리워드 광고 최대 10회/일
    interstitial: 20   // 전면 광고 최대 20회/일
  },

  // 플랜별 광고 허용 여부
  adEnabledPlans: ['free', 'basic'],  // Pro, Premium은 광고 없음

  // 쿨다운 (초) - 연속 광고 시청 방지
  cooldown: {
    rewarded: 60,      // 리워드 광고 간 1분 대기
    interstitial: 30   // 전면 광고 간 30초 대기
  }
};

/**
 * 오늘 날짜 문자열
 */
const getTodayDate = () => {
  return new Date().toISOString().split('T')[0];
};

/**
 * 일일 광고 요약 조회/생성
 */
const getDailyAdSummary = (userId) => {
  const today = getTodayDate();

  let summary = db.prepare(`
    SELECT * FROM daily_ad_summary WHERE user_id = ? AND date = ?
  `).get(userId, today);

  if (!summary) {
    db.prepare(`
      INSERT INTO daily_ad_summary (user_id, date) VALUES (?, ?)
    `).run(userId, today);

    summary = {
      user_id: userId,
      date: today,
      total_ads_watched: 0,
      refresh_earned: 0,
      level2_earned: 0,
      level3_earned: 0
    };
  }

  return summary;
};

/**
 * 광고 시청 가능 여부 확인
 */
const canWatchAd = (userId, adType = 'rewarded') => {
  const today = getTodayDate();
  const limit = AD_REWARD_CONFIG.dailyLimits[adType] || 10;

  // 오늘 해당 타입 광고 시청 횟수
  const watched = db.prepare(`
    SELECT COUNT(*) as count FROM ad_rewards
    WHERE user_id = ? AND date = ? AND ad_type = ?
  `).get(userId, today, adType);

  if (watched.count >= limit) {
    return {
      canWatch: false,
      reason: 'DAILY_LIMIT_REACHED',
      message: `오늘의 ${adType} 광고 시청 한도(${limit}회)에 도달했습니다`,
      watchedToday: watched.count,
      limit
    };
  }

  // 쿨다운 체크
  const cooldownSeconds = AD_REWARD_CONFIG.cooldown[adType] || 30;
  const lastAd = db.prepare(`
    SELECT watched_at FROM ad_rewards
    WHERE user_id = ? AND ad_type = ?
    ORDER BY watched_at DESC LIMIT 1
  `).get(userId, adType);

  if (lastAd) {
    const lastWatchedTime = new Date(lastAd.watched_at).getTime();
    const now = Date.now();
    const elapsedSeconds = (now - lastWatchedTime) / 1000;

    if (elapsedSeconds < cooldownSeconds) {
      const remainingSeconds = Math.ceil(cooldownSeconds - elapsedSeconds);
      return {
        canWatch: false,
        reason: 'COOLDOWN',
        message: `${remainingSeconds}초 후에 다시 시청할 수 있습니다`,
        remainingSeconds
      };
    }
  }

  return {
    canWatch: true,
    remaining: limit - watched.count,
    rewards: AD_REWARD_CONFIG.rewards[adType]
  };
};

/**
 * 광고 시청 완료 처리 및 보상 지급
 */
const completeAdWatch = (userId, adType = 'rewarded', adProvider = null, adUnitId = null) => {
  const today = getTodayDate();
  const rewards = AD_REWARD_CONFIG.rewards[adType];

  if (!rewards) {
    throw new Error(`Invalid ad type: ${adType}`);
  }

  // 시청 가능 여부 재확인
  const canWatch = canWatchAd(userId, adType);
  if (!canWatch.canWatch) {
    return { success: false, ...canWatch };
  }

  // 보상 타입 결정 (가장 높은 우선순위)
  let rewardType = 'refresh';
  let rewardAmount = rewards.refresh;

  if (rewards.level2 > 0) {
    rewardType = 'level2';
    rewardAmount = rewards.level2;
  }

  // 광고 시청 기록
  db.prepare(`
    INSERT INTO ad_rewards (user_id, date, ad_type, reward_type, reward_amount, ad_provider, ad_unit_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(userId, today, adType, rewardType, rewardAmount, adProvider, adUnitId);

  // 일일 요약 업데이트
  const columnMap = {
    refresh: 'refresh_earned',
    level2: 'level2_earned',
    level3: 'level3_earned'
  };
  const column = columnMap[rewardType];

  db.prepare(`
    UPDATE daily_ad_summary
    SET total_ads_watched = total_ads_watched + 1,
        ${column} = ${column} + ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ? AND date = ?
  `).run(rewardAmount, userId, today);

  return {
    success: true,
    rewardType,
    rewardAmount,
    message: `${rewardType === 'refresh' ? '새로고침' : 'Level 2 분석'} ${rewardAmount}회가 지급되었습니다!`,
    todaySummary: getDailyAdSummary(userId)
  };
};

/**
 * 광고로 얻은 보상 사용량 조회
 */
const getAdEarnedUsage = (userId) => {
  const summary = getDailyAdSummary(userId);

  return {
    refresh: summary.refresh_earned,
    level2: summary.level2_earned,
    level3: summary.level3_earned,
    totalAdsWatched: summary.total_ads_watched
  };
};

/**
 * 사용 가능한 총 사용량 계산 (기본 + 광고 보상)
 */
const getTotalAvailableUsage = (userId, plan = 'free') => {
  const planConfig = PLANS[plan] || PLANS.free;
  const adEarned = getAdEarnedUsage(userId);

  // 일일 사용량 조회
  const today = getTodayDate();
  const usage = db.prepare(`
    SELECT * FROM daily_usage WHERE user_id = ? AND date = ?
  `).get(userId, today) || {
    refresh_count: 0,
    level1_count: 0,
    level2_count: 0,
    level3_count: 0
  };

  const calculateRemaining = (baseLimit, used, adBonus) => {
    if (baseLimit === -1) return { limit: '무제한', used, remaining: '무제한', adBonus };
    const total = baseLimit + adBonus;
    return {
      baseLimit,
      adBonus,
      totalLimit: total,
      used,
      remaining: Math.max(0, total - used)
    };
  };

  return {
    refresh: calculateRemaining(planConfig.limits.dailyRefresh, usage.refresh_count, adEarned.refresh),
    level1: calculateRemaining(planConfig.limits.level1Analysis, usage.level1_count, 0),
    level2: calculateRemaining(planConfig.limits.level2Analysis, usage.level2_count, adEarned.level2),
    level3: calculateRemaining(planConfig.limits.level3Analysis, usage.level3_count, adEarned.level3),
    adSummary: {
      totalAdsWatched: adEarned.totalAdsWatched,
      earnedToday: adEarned
    }
  };
};

/**
 * 광고 시청으로 사용량 제한 해제 가능 여부
 */
const canUnlockWithAd = (userId, usageType) => {
  const adCheck = canWatchAd(userId, 'rewarded');

  if (!adCheck.canWatch) {
    return {
      canUnlock: false,
      ...adCheck
    };
  }

  const rewards = AD_REWARD_CONFIG.rewards.rewarded;
  const rewardAmount = rewards[usageType] || rewards.refresh;

  if (rewardAmount === 0) {
    return {
      canUnlock: false,
      reason: 'NOT_AVAILABLE',
      message: `${usageType}은(는) 광고로 얻을 수 없습니다. 플랜 업그레이드가 필요합니다.`
    };
  }

  return {
    canUnlock: true,
    rewardAmount,
    message: `광고를 시청하면 ${usageType === 'refresh' ? '새로고침' : usageType} ${rewardAmount}회를 얻을 수 있습니다`
  };
};

/**
 * 사용자 광고 통계
 */
const getUserAdStats = (userId, days = 30) => {
  const stats = db.prepare(`
    SELECT
      COUNT(*) as total_ads,
      SUM(CASE WHEN ad_type = 'rewarded' THEN 1 ELSE 0 END) as rewarded_count,
      SUM(CASE WHEN ad_type = 'interstitial' THEN 1 ELSE 0 END) as interstitial_count,
      SUM(reward_amount) as total_rewards
    FROM ad_rewards
    WHERE user_id = ? AND date >= date('now', '-' || ? || ' days')
  `).get(userId, days);

  const dailyBreakdown = db.prepare(`
    SELECT date, total_ads_watched, refresh_earned, level2_earned
    FROM daily_ad_summary
    WHERE user_id = ? AND date >= date('now', '-' || ? || ' days')
    ORDER BY date DESC
  `).all(userId, days);

  return {
    summary: stats,
    dailyBreakdown,
    config: {
      dailyLimits: AD_REWARD_CONFIG.dailyLimits,
      rewards: AD_REWARD_CONFIG.rewards
    }
  };
};

module.exports = {
  AD_REWARD_CONFIG,
  canWatchAd,
  completeAdWatch,
  getAdEarnedUsage,
  getTotalAvailableUsage,
  canUnlockWithAd,
  getUserAdStats,
  getDailyAdSummary
};

/**
 * 사용량 추적 서비스
 * 일일 API 사용량 관리 및 제한 체크
 */

const db = require('../db/database');
const { PLANS } = require('../config/plans');

/**
 * 오늘 날짜 문자열 (YYYY-MM-DD)
 */
const getTodayDate = () => {
  return new Date().toISOString().split('T')[0];
};

/**
 * 사용자 조회 또는 생성
 */
const getOrCreateUser = (userId) => {
  const existing = db.prepare('SELECT * FROM users WHERE user_id = ?').get(userId);

  if (existing) {
    return existing;
  }

  // 새 사용자 생성
  db.prepare(`
    INSERT INTO users (user_id, plan) VALUES (?, 'free')
  `).run(userId);

  return db.prepare('SELECT * FROM users WHERE user_id = ?').get(userId);
};

/**
 * 사용자 플랜 업데이트
 */
const updateUserPlan = (userId, plan) => {
  const user = getOrCreateUser(userId);
  const oldPlan = user.plan;

  db.prepare(`
    UPDATE users SET plan = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?
  `).run(plan, userId);

  // 구독 이력 기록
  db.prepare(`
    INSERT INTO subscription_history (user_id, plan, action, started_at)
    VALUES (?, ?, 'upgrade', CURRENT_TIMESTAMP)
  `).run(userId, plan);

  return { oldPlan, newPlan: plan };
};

/**
 * 오늘의 사용량 조회
 */
const getTodayUsage = (userId) => {
  const today = getTodayDate();

  let usage = db.prepare(`
    SELECT * FROM daily_usage WHERE user_id = ? AND date = ?
  `).get(userId, today);

  if (!usage) {
    // 오늘 사용량 레코드 생성
    db.prepare(`
      INSERT INTO daily_usage (user_id, date) VALUES (?, ?)
    `).run(userId, today);

    usage = {
      user_id: userId,
      date: today,
      refresh_count: 0,
      level1_count: 0,
      level2_count: 0,
      level3_count: 0
    };
  }

  return usage;
};

/**
 * 사용량 증가
 * @param {string} userId - 사용자 ID
 * @param {string} usageType - 사용량 타입 (refresh, level1, level2, level3)
 * @param {number} amount - 증가량 (기본 1)
 */
const incrementUsage = (userId, usageType, amount = 1) => {
  const today = getTodayDate();
  const columnMap = {
    refresh: 'refresh_count',
    level1: 'level1_count',
    level2: 'level2_count',
    level3: 'level3_count'
  };

  const column = columnMap[usageType];
  if (!column) {
    throw new Error(`Invalid usage type: ${usageType}`);
  }

  // 레코드가 없으면 먼저 생성
  getTodayUsage(userId);

  // 사용량 증가
  db.prepare(`
    UPDATE daily_usage
    SET ${column} = ${column} + ?, updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ? AND date = ?
  `).run(amount, userId, today);

  return getTodayUsage(userId);
};

/**
 * 사용량 제한 체크
 * @returns {Object} { allowed: boolean, remaining: number, message?: string }
 */
const checkUsageLimit = (userId, usageType) => {
  const user = getOrCreateUser(userId);
  const plan = PLANS[user.plan] || PLANS.free;
  const usage = getTodayUsage(userId);

  const limitMap = {
    refresh: { limit: plan.limits.dailyRefresh, current: usage.refresh_count },
    level1: { limit: plan.limits.level1Analysis, current: usage.level1_count },
    level2: { limit: plan.limits.level2Analysis, current: usage.level2_count },
    level3: { limit: plan.limits.level3Analysis, current: usage.level3_count }
  };

  const { limit, current } = limitMap[usageType] || { limit: 0, current: 0 };

  // -1은 무제한
  if (limit === -1) {
    return { allowed: true, remaining: -1, unlimited: true };
  }

  // 제한 초과 체크
  if (current >= limit) {
    return {
      allowed: false,
      remaining: 0,
      message: `일일 ${usageType} 한도 초과 (${limit}회)`,
      limit,
      current
    };
  }

  return {
    allowed: true,
    remaining: limit - current,
    limit,
    current
  };
};

/**
 * API 호출 로그 기록
 */
const logApiCall = (params) => {
  const {
    userId,
    endpoint,
    symbol,
    timeframe,
    analysisLevel,
    method,
    tokensUsed = 0,
    costUsd = 0,
    responseTimeMs = 0,
    success = true,
    errorMessage = null
  } = params;

  db.prepare(`
    INSERT INTO api_logs (
      user_id, endpoint, symbol, timeframe, analysis_level,
      method, tokens_used, cost_usd, response_time_ms, success, error_message
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId, endpoint, symbol, timeframe, analysisLevel,
    method, tokensUsed, costUsd, responseTimeMs, success ? 1 : 0, errorMessage
  );
};

/**
 * 사용자 통계 조회
 */
const getUserStats = (userId, days = 30) => {
  const user = getOrCreateUser(userId);
  const plan = PLANS[user.plan] || PLANS.free;

  // 오늘 사용량
  const todayUsage = getTodayUsage(userId);

  // 최근 N일 총 사용량
  const recentStats = db.prepare(`
    SELECT
      SUM(refresh_count) as total_refresh,
      SUM(level1_count) as total_level1,
      SUM(level2_count) as total_level2,
      SUM(level3_count) as total_level3,
      COUNT(DISTINCT date) as active_days
    FROM daily_usage
    WHERE user_id = ? AND date >= date('now', '-' || ? || ' days')
  `).get(userId, days);

  // API 비용 통계
  const costStats = db.prepare(`
    SELECT
      SUM(tokens_used) as total_tokens,
      SUM(cost_usd) as total_cost,
      COUNT(*) as total_calls,
      AVG(response_time_ms) as avg_response_time
    FROM api_logs
    WHERE user_id = ? AND created_at >= datetime('now', '-' || ? || ' days')
  `).get(userId, days);

  return {
    user: {
      userId: user.user_id,
      plan: user.plan,
      planName: plan.nameKr,
      createdAt: user.created_at
    },
    limits: {
      refresh: { limit: plan.limits.dailyRefresh, used: todayUsage.refresh_count },
      level1: { limit: plan.limits.level1Analysis, used: todayUsage.level1_count },
      level2: { limit: plan.limits.level2Analysis, used: todayUsage.level2_count },
      level3: { limit: plan.limits.level3Analysis, used: todayUsage.level3_count }
    },
    todayUsage,
    recentStats: {
      days,
      ...recentStats
    },
    costStats: {
      days,
      totalTokens: costStats?.total_tokens || 0,
      totalCostUSD: costStats?.total_cost || 0,
      totalCalls: costStats?.total_calls || 0,
      avgResponseTimeMs: Math.round(costStats?.avg_response_time || 0)
    }
  };
};

/**
 * 관리자용: 전체 사용량 통계
 */
const getGlobalStats = (days = 7) => {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();

  const dailyStats = db.prepare(`
    SELECT
      date,
      COUNT(DISTINCT user_id) as active_users,
      SUM(refresh_count) as total_refresh,
      SUM(level1_count) as total_level1,
      SUM(level2_count) as total_level2,
      SUM(level3_count) as total_level3
    FROM daily_usage
    WHERE date >= date('now', '-' || ? || ' days')
    GROUP BY date
    ORDER BY date DESC
  `).all(days);

  const costStats = db.prepare(`
    SELECT
      DATE(created_at) as date,
      SUM(tokens_used) as tokens,
      SUM(cost_usd) as cost,
      COUNT(*) as calls
    FROM api_logs
    WHERE created_at >= datetime('now', '-' || ? || ' days')
    GROUP BY DATE(created_at)
    ORDER BY date DESC
  `).all(days);

  const planDistribution = db.prepare(`
    SELECT plan, COUNT(*) as count FROM users GROUP BY plan
  `).all();

  return {
    totalUsers: userCount.count,
    planDistribution,
    dailyStats,
    costStats
  };
};

/**
 * 사용량 리셋 (테스트용)
 */
const resetDailyUsage = (userId) => {
  const today = getTodayDate();
  db.prepare(`
    DELETE FROM daily_usage WHERE user_id = ? AND date = ?
  `).run(userId, today);
};

module.exports = {
  getOrCreateUser,
  updateUserPlan,
  getTodayUsage,
  incrementUsage,
  checkUsageLimit,
  logApiCall,
  getUserStats,
  getGlobalStats,
  resetDailyUsage
};

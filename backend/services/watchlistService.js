/**
 * 관심종목 서비스
 * 관심종목 CRUD 및 그룹 관리
 */

const db = require('../db/database');
const { PLANS } = require('../config/plans');
const { getOrCreateUser } = require('./usageService');
const notificationService = require('./notificationService');

/**
 * 플랜별 관심종목 한도
 */
const getWatchlistLimit = (plan) => {
  const limits = {
    free: 5,
    basic: 20,
    pro: 50,
    premium: -1, // 무제한
  };
  return limits[plan] || limits.free;
};

/**
 * 관심종목 개수 확인
 */
const getWatchlistCount = (userId) => {
  const result = db.prepare(`
    SELECT COUNT(*) as count FROM watchlist WHERE user_id = ?
  `).get(userId);
  return result.count;
};

/**
 * 관심종목 한도 체크
 */
const checkWatchlistLimit = (userId) => {
  const user = getOrCreateUser(userId);
  const limit = getWatchlistLimit(user.plan);
  const count = getWatchlistCount(userId);

  if (limit === -1) {
    return { allowed: true, current: count, limit: '무제한' };
  }

  return {
    allowed: count < limit,
    current: count,
    limit,
    remaining: Math.max(0, limit - count),
  };
};

/**
 * 관심종목 추가
 */
const addToWatchlist = (userId, stockData) => {
  const { symbol, name, type = 'stock', groupId = null, memo = null } = stockData;

  // 한도 체크
  const limitCheck = checkWatchlistLimit(userId);
  if (!limitCheck.allowed) {
    return {
      success: false,
      error: 'WATCHLIST_LIMIT_EXCEEDED',
      message: `관심종목 한도(${limitCheck.limit}개)에 도달했습니다. 플랜을 업그레이드하세요.`,
      current: limitCheck.current,
      limit: limitCheck.limit,
    };
  }

  // 이미 존재하는지 확인
  const existing = db.prepare(`
    SELECT id FROM watchlist WHERE user_id = ? AND symbol = ?
  `).get(userId, symbol);

  if (existing) {
    return {
      success: false,
      error: 'ALREADY_EXISTS',
      message: '이미 관심종목에 추가된 종목입니다.',
    };
  }

  // 정렬 순서 계산
  const maxOrder = db.prepare(`
    SELECT MAX(sort_order) as max_order FROM watchlist WHERE user_id = ?
  `).get(userId);
  const sortOrder = (maxOrder?.max_order || 0) + 1;

  // 추가
  const result = db.prepare(`
    INSERT INTO watchlist (user_id, symbol, name, type, group_id, sort_order, memo)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(userId, symbol, name, type, groupId, sortOrder, memo);

  return {
    success: true,
    id: result.lastInsertRowid,
    message: `${name || symbol}이(가) 관심종목에 추가되었습니다.`,
  };
};

/**
 * 관심종목 제거
 */
const removeFromWatchlist = (userId, symbol) => {
  const result = db.prepare(`
    DELETE FROM watchlist WHERE user_id = ? AND symbol = ?
  `).run(userId, symbol);

  if (result.changes === 0) {
    return {
      success: false,
      error: 'NOT_FOUND',
      message: '관심종목에서 찾을 수 없습니다.',
    };
  }

  return {
    success: true,
    message: '관심종목에서 제거되었습니다.',
  };
};

/**
 * 관심종목 조회
 */
const getWatchlist = (userId, groupId = null) => {
  let query = `
    SELECT w.*, g.name as group_name, g.color as group_color
    FROM watchlist w
    LEFT JOIN watchlist_groups g ON w.group_id = g.id
    WHERE w.user_id = ?
  `;
  const params = [userId];

  if (groupId !== null) {
    query += ` AND w.group_id = ?`;
    params.push(groupId);
  }

  query += ` ORDER BY w.sort_order ASC`;

  return db.prepare(query).all(...params);
};

/**
 * 관심종목 상세 조회
 */
const getWatchlistItem = (userId, symbol) => {
  return db.prepare(`
    SELECT w.*, g.name as group_name, g.color as group_color
    FROM watchlist w
    LEFT JOIN watchlist_groups g ON w.group_id = g.id
    WHERE w.user_id = ? AND w.symbol = ?
  `).get(userId, symbol);
};

/**
 * 관심종목 여부 확인
 */
const isInWatchlist = (userId, symbol) => {
  const result = db.prepare(`
    SELECT id FROM watchlist WHERE user_id = ? AND symbol = ?
  `).get(userId, symbol);
  return !!result;
};

/**
 * 관심종목 업데이트
 */
const updateWatchlistItem = (userId, symbol, updates) => {
  const { groupId, memo, targetPrice, alertAbove, alertBelow, alertEnabled } = updates;

  const setClauses = [];
  const params = [];

  if (groupId !== undefined) {
    setClauses.push('group_id = ?');
    params.push(groupId);
  }
  if (memo !== undefined) {
    setClauses.push('memo = ?');
    params.push(memo);
  }
  if (targetPrice !== undefined) {
    setClauses.push('target_price = ?');
    params.push(targetPrice);
  }
  if (alertAbove !== undefined) {
    setClauses.push('alert_above = ?');
    params.push(alertAbove);
  }
  if (alertBelow !== undefined) {
    setClauses.push('alert_below = ?');
    params.push(alertBelow);
  }
  if (alertEnabled !== undefined) {
    setClauses.push('alert_enabled = ?');
    params.push(alertEnabled ? 1 : 0);
  }

  if (setClauses.length === 0) {
    return { success: false, error: 'NO_UPDATES', message: '업데이트할 내용이 없습니다.' };
  }

  setClauses.push('updated_at = CURRENT_TIMESTAMP');
  params.push(userId, symbol);

  const result = db.prepare(`
    UPDATE watchlist SET ${setClauses.join(', ')}
    WHERE user_id = ? AND symbol = ?
  `).run(...params);

  if (result.changes === 0) {
    return { success: false, error: 'NOT_FOUND', message: '관심종목을 찾을 수 없습니다.' };
  }

  return { success: true, message: '관심종목이 업데이트되었습니다.' };
};

/**
 * 관심종목 순서 변경
 */
const reorderWatchlist = (userId, orderedSymbols) => {
  const updateStmt = db.prepare(`
    UPDATE watchlist SET sort_order = ?, updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ? AND symbol = ?
  `);

  const transaction = db.transaction(() => {
    orderedSymbols.forEach((symbol, index) => {
      updateStmt.run(index, userId, symbol);
    });
  });

  transaction();

  return { success: true, message: '순서가 변경되었습니다.' };
};

/**
 * 관심종목 가격 업데이트
 */
const updateWatchlistPrices = (userId, priceData) => {
  // priceData: [{ symbol, price, changePercent }]
  const updateStmt = db.prepare(`
    UPDATE watchlist
    SET last_price = ?, last_change_percent = ?, last_updated = CURRENT_TIMESTAMP
    WHERE user_id = ? AND symbol = ?
  `);

  const transaction = db.transaction(() => {
    priceData.forEach(({ symbol, price, changePercent }) => {
      updateStmt.run(price, changePercent, userId, symbol);
    });
  });

  transaction();

  return { success: true };
};

// ========== 그룹 관리 ==========

/**
 * 그룹 생성
 */
const createGroup = (userId, name, color = '#3B82F6', icon = 'folder') => {
  // 이름 중복 체크
  const existing = db.prepare(`
    SELECT id FROM watchlist_groups WHERE user_id = ? AND name = ?
  `).get(userId, name);

  if (existing) {
    return {
      success: false,
      error: 'DUPLICATE_NAME',
      message: '같은 이름의 그룹이 이미 존재합니다.',
    };
  }

  // 정렬 순서
  const maxOrder = db.prepare(`
    SELECT MAX(sort_order) as max_order FROM watchlist_groups WHERE user_id = ?
  `).get(userId);
  const sortOrder = (maxOrder?.max_order || 0) + 1;

  const result = db.prepare(`
    INSERT INTO watchlist_groups (user_id, name, color, icon, sort_order)
    VALUES (?, ?, ?, ?, ?)
  `).run(userId, name, color, icon, sortOrder);

  return {
    success: true,
    id: result.lastInsertRowid,
    message: `'${name}' 그룹이 생성되었습니다.`,
  };
};

/**
 * 그룹 목록 조회
 */
const getGroups = (userId) => {
  const groups = db.prepare(`
    SELECT g.*,
      (SELECT COUNT(*) FROM watchlist w WHERE w.group_id = g.id) as stock_count
    FROM watchlist_groups g
    WHERE g.user_id = ?
    ORDER BY g.sort_order ASC
  `).all(userId);

  // 그룹 없는 종목 수
  const ungroupedCount = db.prepare(`
    SELECT COUNT(*) as count FROM watchlist WHERE user_id = ? AND group_id IS NULL
  `).get(userId);

  return {
    groups,
    ungroupedCount: ungroupedCount.count,
  };
};

/**
 * 그룹 업데이트
 */
const updateGroup = (userId, groupId, updates) => {
  const { name, color, icon } = updates;

  const setClauses = [];
  const params = [];

  if (name !== undefined) {
    // 이름 중복 체크
    const existing = db.prepare(`
      SELECT id FROM watchlist_groups WHERE user_id = ? AND name = ? AND id != ?
    `).get(userId, name, groupId);

    if (existing) {
      return {
        success: false,
        error: 'DUPLICATE_NAME',
        message: '같은 이름의 그룹이 이미 존재합니다.',
      };
    }

    setClauses.push('name = ?');
    params.push(name);
  }
  if (color !== undefined) {
    setClauses.push('color = ?');
    params.push(color);
  }
  if (icon !== undefined) {
    setClauses.push('icon = ?');
    params.push(icon);
  }

  if (setClauses.length === 0) {
    return { success: false, error: 'NO_UPDATES' };
  }

  setClauses.push('updated_at = CURRENT_TIMESTAMP');
  params.push(userId, groupId);

  const result = db.prepare(`
    UPDATE watchlist_groups SET ${setClauses.join(', ')}
    WHERE user_id = ? AND id = ?
  `).run(...params);

  if (result.changes === 0) {
    return { success: false, error: 'NOT_FOUND' };
  }

  return { success: true, message: '그룹이 업데이트되었습니다.' };
};

/**
 * 그룹 삭제
 */
const deleteGroup = (userId, groupId) => {
  // 그룹 내 종목들의 group_id를 null로 설정
  db.prepare(`
    UPDATE watchlist SET group_id = NULL WHERE user_id = ? AND group_id = ?
  `).run(userId, groupId);

  const result = db.prepare(`
    DELETE FROM watchlist_groups WHERE user_id = ? AND id = ?
  `).run(userId, groupId);

  if (result.changes === 0) {
    return { success: false, error: 'NOT_FOUND' };
  }

  return { success: true, message: '그룹이 삭제되었습니다.' };
};

/**
 * 그룹 순서 변경
 */
const reorderGroups = (userId, orderedGroupIds) => {
  const updateStmt = db.prepare(`
    UPDATE watchlist_groups SET sort_order = ?, updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ? AND id = ?
  `);

  const transaction = db.transaction(() => {
    orderedGroupIds.forEach((groupId, index) => {
      updateStmt.run(index, userId, groupId);
    });
  });

  transaction();

  return { success: true };
};

// ========== 가격 알림 ==========

/**
 * 가격 알림 생성
 */
const createPriceAlert = (userId, symbol, condition, targetPrice) => {
  // condition: 'above' | 'below' | 'change_percent'

  const result = db.prepare(`
    INSERT INTO price_alerts (user_id, symbol, condition, target_price)
    VALUES (?, ?, ?, ?)
  `).run(userId, symbol, condition, targetPrice);

  return {
    success: true,
    id: result.lastInsertRowid,
    message: '가격 알림이 설정되었습니다.',
  };
};

/**
 * 가격 알림 목록 조회
 */
const getPriceAlerts = (userId, symbol = null) => {
  let query = `SELECT * FROM price_alerts WHERE user_id = ?`;
  const params = [userId];

  if (symbol) {
    query += ` AND symbol = ?`;
    params.push(symbol);
  }

  query += ` ORDER BY created_at DESC`;

  return db.prepare(query).all(...params);
};

/**
 * 가격 알림 삭제
 */
const deletePriceAlert = (userId, alertId) => {
  const result = db.prepare(`
    DELETE FROM price_alerts WHERE user_id = ? AND id = ?
  `).run(userId, alertId);

  return { success: result.changes > 0 };
};

/**
 * 트리거된 알림 확인 (가격 체크용)
 */
const checkPriceAlerts = async (priceUpdates) => {
  // priceUpdates: [{ symbol, price }]
  const triggeredAlerts = [];

  const alerts = db.prepare(`
    SELECT * FROM price_alerts WHERE triggered = 0
  `).all();

  for (const alert of alerts) {
    const priceUpdate = priceUpdates.find((p) => p.symbol === alert.symbol);
    if (!priceUpdate) continue;

    let shouldTrigger = false;

    if (alert.condition === 'above' && priceUpdate.price >= alert.target_price) {
      shouldTrigger = true;
    } else if (alert.condition === 'below' && priceUpdate.price <= alert.target_price) {
      shouldTrigger = true;
    }

    if (shouldTrigger) {
      db.prepare(`
        UPDATE price_alerts
        SET triggered = 1, triggered_at = CURRENT_TIMESTAMP, current_price = ?, notification_sent = 1
        WHERE id = ?
      `).run(priceUpdate.price, alert.id);

      triggeredAlerts.push({
        ...alert,
        currentPrice: priceUpdate.price,
      });

      // 푸시 알림 전송
      try {
        await notificationService.sendPriceAlert(
          alert.user_id,
          alert.symbol,
          alert.condition,
          alert.target_price,
          priceUpdate.price
        );
      } catch (error) {
        console.error('Send price alert notification error:', error);
      }
    }
  }

  return triggeredAlerts;
};

module.exports = {
  getWatchlistLimit,
  getWatchlistCount,
  checkWatchlistLimit,
  addToWatchlist,
  removeFromWatchlist,
  getWatchlist,
  getWatchlistItem,
  isInWatchlist,
  updateWatchlistItem,
  reorderWatchlist,
  updateWatchlistPrices,
  createGroup,
  getGroups,
  updateGroup,
  deleteGroup,
  reorderGroups,
  createPriceAlert,
  getPriceAlerts,
  deletePriceAlert,
  checkPriceAlerts,
};

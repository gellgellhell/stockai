/**
 * 관심종목 라우트
 * 관심종목 CRUD, 그룹 관리, 가격 알림 API
 */

const express = require('express');
const router = express.Router();
const {
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
} = require('../services/watchlistService');
const { extractUserId } = require('../middleware/usageMiddleware');

// ========== 관심종목 ==========

/**
 * GET /api/watchlist
 * 관심종목 목록 조회
 */
router.get('/', (req, res) => {
  try {
    const userId = extractUserId(req);
    const groupId = req.query.groupId ? parseInt(req.query.groupId) : null;

    const watchlist = getWatchlist(userId, groupId);
    const limitInfo = checkWatchlistLimit(userId);

    res.json({
      success: true,
      data: {
        items: watchlist,
        count: watchlist.length,
        limit: limitInfo.limit,
        remaining: limitInfo.remaining,
      },
    });
  } catch (error) {
    console.error('Get watchlist error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/watchlist/check/:symbol
 * 특정 종목의 관심종목 여부 확인
 */
router.get('/check/:symbol', (req, res) => {
  try {
    const userId = extractUserId(req);
    const { symbol } = req.params;

    const inWatchlist = isInWatchlist(userId, symbol);
    const item = inWatchlist ? getWatchlistItem(userId, symbol) : null;

    res.json({
      success: true,
      data: {
        inWatchlist,
        item,
      },
    });
  } catch (error) {
    console.error('Check watchlist error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/watchlist/limit
 * 관심종목 한도 확인
 */
router.get('/limit', (req, res) => {
  try {
    const userId = extractUserId(req);
    const limitInfo = checkWatchlistLimit(userId);

    res.json({
      success: true,
      data: limitInfo,
    });
  } catch (error) {
    console.error('Check limit error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/watchlist
 * 관심종목 추가
 */
router.post('/', (req, res) => {
  try {
    const userId = extractUserId(req);
    const { symbol, name, type, groupId, memo } = req.body;

    if (!symbol) {
      return res.status(400).json({
        success: false,
        error: 'Symbol is required',
      });
    }

    const result = addToWatchlist(userId, { symbol, name, type, groupId, memo });

    if (!result.success) {
      const statusCode = result.error === 'WATCHLIST_LIMIT_EXCEEDED' ? 403 : 400;
      return res.status(statusCode).json(result);
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Add watchlist error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/watchlist/:symbol
 * 관심종목 제거
 */
router.delete('/:symbol', (req, res) => {
  try {
    const userId = extractUserId(req);
    const { symbol } = req.params;

    const result = removeFromWatchlist(userId, symbol);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Remove watchlist error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/watchlist/:symbol
 * 관심종목 업데이트
 */
router.patch('/:symbol', (req, res) => {
  try {
    const userId = extractUserId(req);
    const { symbol } = req.params;
    const updates = req.body;

    const result = updateWatchlistItem(userId, symbol, updates);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Update watchlist error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/watchlist/reorder
 * 관심종목 순서 변경
 */
router.post('/reorder', (req, res) => {
  try {
    const userId = extractUserId(req);
    const { symbols } = req.body;

    if (!Array.isArray(symbols)) {
      return res.status(400).json({
        success: false,
        error: 'Symbols array is required',
      });
    }

    const result = reorderWatchlist(userId, symbols);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Reorder watchlist error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/watchlist/update-prices
 * 관심종목 가격 일괄 업데이트
 */
router.post('/update-prices', (req, res) => {
  try {
    const userId = extractUserId(req);
    const { prices } = req.body;

    if (!Array.isArray(prices)) {
      return res.status(400).json({
        success: false,
        error: 'Prices array is required',
      });
    }

    const result = updateWatchlistPrices(userId, prices);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Update prices error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== 그룹 ==========

/**
 * GET /api/watchlist/groups
 * 그룹 목록 조회
 */
router.get('/groups', (req, res) => {
  try {
    const userId = extractUserId(req);
    const result = getGroups(userId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/watchlist/groups
 * 그룹 생성
 */
router.post('/groups', (req, res) => {
  try {
    const userId = extractUserId(req);
    const { name, color, icon } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Group name is required',
      });
    }

    const result = createGroup(userId, name, color, icon);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/watchlist/groups/:groupId
 * 그룹 업데이트
 */
router.patch('/groups/:groupId', (req, res) => {
  try {
    const userId = extractUserId(req);
    const groupId = parseInt(req.params.groupId);
    const updates = req.body;

    const result = updateGroup(userId, groupId, updates);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Update group error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/watchlist/groups/:groupId
 * 그룹 삭제
 */
router.delete('/groups/:groupId', (req, res) => {
  try {
    const userId = extractUserId(req);
    const groupId = parseInt(req.params.groupId);

    const result = deleteGroup(userId, groupId);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Delete group error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/watchlist/groups/reorder
 * 그룹 순서 변경
 */
router.post('/groups/reorder', (req, res) => {
  try {
    const userId = extractUserId(req);
    const { groupIds } = req.body;

    if (!Array.isArray(groupIds)) {
      return res.status(400).json({
        success: false,
        error: 'GroupIds array is required',
      });
    }

    const result = reorderGroups(userId, groupIds);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Reorder groups error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== 가격 알림 ==========

/**
 * GET /api/watchlist/alerts
 * 가격 알림 목록 조회
 */
router.get('/alerts', (req, res) => {
  try {
    const userId = extractUserId(req);
    const symbol = req.query.symbol || null;

    const alerts = getPriceAlerts(userId, symbol);

    res.json({
      success: true,
      data: { alerts },
    });
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/watchlist/alerts
 * 가격 알림 생성
 */
router.post('/alerts', (req, res) => {
  try {
    const userId = extractUserId(req);
    const { symbol, condition, targetPrice } = req.body;

    if (!symbol || !condition || targetPrice === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Symbol, condition, and targetPrice are required',
      });
    }

    const result = createPriceAlert(userId, symbol, condition, targetPrice);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Create alert error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/watchlist/alerts/:alertId
 * 가격 알림 삭제
 */
router.delete('/alerts/:alertId', (req, res) => {
  try {
    const userId = extractUserId(req);
    const alertId = parseInt(req.params.alertId);

    const result = deletePriceAlert(userId, alertId);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found',
      });
    }

    res.json({
      success: true,
      data: { message: '알림이 삭제되었습니다.' },
    });
  } catch (error) {
    console.error('Delete alert error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

/**
 * 관심종목 서비스 (프론트엔드)
 * 백엔드 관심종목 API 통신
 */

const API_BASE_URL = __DEV__
  ? 'http://localhost:3001/api'
  : 'https://stockai-backend-production.up.railway.app/api';

/**
 * 관심종목 목록 조회
 */
export const getWatchlist = async (userId, groupId = null) => {
  try {
    let url = `${API_BASE_URL}/watchlist`;
    if (groupId) {
      url += `?groupId=${groupId}`;
    }

    const response = await fetch(url, {
      headers: { 'x-user-id': userId },
    });
    return await response.json();
  } catch (error) {
    console.error('Get watchlist error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 관심종목 여부 확인
 */
export const checkWatchlist = async (userId, symbol) => {
  try {
    const response = await fetch(`${API_BASE_URL}/watchlist/check/${symbol}`, {
      headers: { 'x-user-id': userId },
    });
    return await response.json();
  } catch (error) {
    console.error('Check watchlist error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 관심종목 한도 확인
 */
export const getWatchlistLimit = async (userId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/watchlist/limit`, {
      headers: { 'x-user-id': userId },
    });
    return await response.json();
  } catch (error) {
    console.error('Get limit error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 관심종목 추가
 */
export const addToWatchlist = async (userId, stockData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/watchlist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
      },
      body: JSON.stringify(stockData),
    });
    return await response.json();
  } catch (error) {
    console.error('Add watchlist error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 관심종목 제거
 */
export const removeFromWatchlist = async (userId, symbol) => {
  try {
    const response = await fetch(`${API_BASE_URL}/watchlist/${symbol}`, {
      method: 'DELETE',
      headers: { 'x-user-id': userId },
    });
    return await response.json();
  } catch (error) {
    console.error('Remove watchlist error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 관심종목 업데이트
 */
export const updateWatchlistItem = async (userId, symbol, updates) => {
  try {
    const response = await fetch(`${API_BASE_URL}/watchlist/${symbol}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
      },
      body: JSON.stringify(updates),
    });
    return await response.json();
  } catch (error) {
    console.error('Update watchlist error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 관심종목 순서 변경
 */
export const reorderWatchlist = async (userId, symbols) => {
  try {
    const response = await fetch(`${API_BASE_URL}/watchlist/reorder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
      },
      body: JSON.stringify({ symbols }),
    });
    return await response.json();
  } catch (error) {
    console.error('Reorder watchlist error:', error);
    return { success: false, error: error.message };
  }
};

// ========== 그룹 ==========

/**
 * 그룹 목록 조회
 */
export const getGroups = async (userId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/watchlist/groups`, {
      headers: { 'x-user-id': userId },
    });
    return await response.json();
  } catch (error) {
    console.error('Get groups error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 그룹 생성
 */
export const createGroup = async (userId, name, color, icon) => {
  try {
    const response = await fetch(`${API_BASE_URL}/watchlist/groups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
      },
      body: JSON.stringify({ name, color, icon }),
    });
    return await response.json();
  } catch (error) {
    console.error('Create group error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 그룹 업데이트
 */
export const updateGroup = async (userId, groupId, updates) => {
  try {
    const response = await fetch(`${API_BASE_URL}/watchlist/groups/${groupId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
      },
      body: JSON.stringify(updates),
    });
    return await response.json();
  } catch (error) {
    console.error('Update group error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 그룹 삭제
 */
export const deleteGroup = async (userId, groupId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/watchlist/groups/${groupId}`, {
      method: 'DELETE',
      headers: { 'x-user-id': userId },
    });
    return await response.json();
  } catch (error) {
    console.error('Delete group error:', error);
    return { success: false, error: error.message };
  }
};

// ========== 가격 알림 ==========

/**
 * 가격 알림 목록 조회
 */
export const getPriceAlerts = async (userId, symbol = null) => {
  try {
    let url = `${API_BASE_URL}/watchlist/alerts`;
    if (symbol) {
      url += `?symbol=${symbol}`;
    }

    const response = await fetch(url, {
      headers: { 'x-user-id': userId },
    });
    return await response.json();
  } catch (error) {
    console.error('Get alerts error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 가격 알림 생성
 */
export const createPriceAlert = async (userId, symbol, condition, targetPrice) => {
  try {
    const response = await fetch(`${API_BASE_URL}/watchlist/alerts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
      },
      body: JSON.stringify({ symbol, condition, targetPrice }),
    });
    return await response.json();
  } catch (error) {
    console.error('Create alert error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 가격 알림 삭제
 */
export const deletePriceAlert = async (userId, alertId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/watchlist/alerts/${alertId}`, {
      method: 'DELETE',
      headers: { 'x-user-id': userId },
    });
    return await response.json();
  } catch (error) {
    console.error('Delete alert error:', error);
    return { success: false, error: error.message };
  }
};

export default {
  getWatchlist,
  checkWatchlist,
  getWatchlistLimit,
  addToWatchlist,
  removeFromWatchlist,
  updateWatchlistItem,
  reorderWatchlist,
  getGroups,
  createGroup,
  updateGroup,
  deleteGroup,
  getPriceAlerts,
  createPriceAlert,
  deletePriceAlert,
};

/**
 * 광고 서비스
 * 백엔드 광고 API와 통신
 */

const API_BASE_URL = __DEV__
  ? 'http://localhost:3001/api'
  : 'https://stockai-backend-production.up.railway.app/api';

/**
 * 광고 설정 조회
 */
export const getAdConfig = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/ads/config`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to get ad config:', error);
    throw error;
  }
};

/**
 * 광고 시청 가능 상태 확인
 * @param {string} userId - 사용자 ID
 */
export const getAdStatus = async (userId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/ads/status`, {
      headers: {
        'x-user-id': userId,
      },
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to get ad status:', error);
    throw error;
  }
};

/**
 * 특정 사용량을 광고로 해제 가능한지 확인
 * @param {string} userId - 사용자 ID
 * @param {string} type - 사용량 타입 (refresh, level2, level3)
 */
export const canUnlockWithAd = async (userId, type = 'refresh') => {
  try {
    const response = await fetch(`${API_BASE_URL}/ads/can-unlock?type=${type}`, {
      headers: {
        'x-user-id': userId,
      },
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to check ad unlock:', error);
    throw error;
  }
};

/**
 * 광고 시청 시작 (토큰 발급)
 * @param {string} userId - 사용자 ID
 * @param {string} adType - 광고 타입 (rewarded, interstitial)
 */
export const startAdWatch = async (userId, adType = 'rewarded') => {
  try {
    const response = await fetch(`${API_BASE_URL}/ads/watch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
      },
      body: JSON.stringify({ adType }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to start ad watch:', error);
    throw error;
  }
};

/**
 * 광고 시청 완료 및 보상 수령
 * @param {string} userId - 사용자 ID
 * @param {string} adType - 광고 타입
 * @param {string} watchToken - 시청 토큰
 * @param {string} adProvider - 광고 제공자 (admob, unity 등)
 * @param {string} adUnitId - 광고 단위 ID
 */
export const completeAdWatch = async (userId, adType, watchToken, adProvider, adUnitId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/ads/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
      },
      body: JSON.stringify({
        adType,
        watchToken,
        adProvider,
        adUnitId,
      }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to complete ad watch:', error);
    throw error;
  }
};

/**
 * 광고 보상 포함 총 사용량 조회
 * @param {string} userId - 사용자 ID
 */
export const getAdUsage = async (userId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/ads/usage`, {
      headers: {
        'x-user-id': userId,
      },
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to get ad usage:', error);
    throw error;
  }
};

/**
 * 광고 시청 통계 조회
 * @param {string} userId - 사용자 ID
 * @param {number} days - 조회 기간 (일)
 */
export const getAdStats = async (userId, days = 30) => {
  try {
    const response = await fetch(`${API_BASE_URL}/ads/stats?days=${days}`, {
      headers: {
        'x-user-id': userId,
      },
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to get ad stats:', error);
    throw error;
  }
};

/**
 * 개발용 광고 시뮬레이션
 * @param {string} userId - 사용자 ID
 * @param {string} adType - 광고 타입
 * @param {number} count - 시뮬레이션 횟수
 */
export const simulateAd = async (userId, adType = 'rewarded', count = 1) => {
  try {
    const response = await fetch(`${API_BASE_URL}/ads/simulate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
      },
      body: JSON.stringify({ adType, count }),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to simulate ad:', error);
    throw error;
  }
};

export default {
  getAdConfig,
  getAdStatus,
  canUnlockWithAd,
  startAdWatch,
  completeAdWatch,
  getAdUsage,
  getAdStats,
  simulateAd,
};

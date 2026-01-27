/**
 * 광고 서비스
 * Google AdMob + 백엔드 광고 API 통합
 */

import { Platform } from 'react-native';

const API_BASE_URL = __DEV__
  ? 'http://localhost:3001/api'
  : 'https://stockai-backend-production.up.railway.app/api';

// 웹에서는 광고 비활성화
const isWeb = Platform.OS === 'web';

// 테스트 광고 ID (실제 배포 시 실제 ID로 교체 필요)
const AD_UNIT_IDS = {
  rewarded: {
    android: 'ca-app-pub-3940256099942544/5224354917', // 테스트 ID
    ios: 'ca-app-pub-3940256099942544/1712485313',     // 테스트 ID
  }
};

let RewardedAd = null;
let RewardedAdEventType = null;
let rewardedAd = null;
let isAdLoaded = false;
let isAdLoading = false;

/**
 * AdMob SDK 초기화 (네이티브 환경에서만)
 */
export const initializeAdMob = async () => {
  if (isWeb) {
    console.log('📺 AdMob disabled on web platform');
    return false;
  }

  try {
    const mobileAds = require('react-native-google-mobile-ads').default;
    const adModule = require('react-native-google-mobile-ads');
    RewardedAd = adModule.RewardedAd;
    RewardedAdEventType = adModule.RewardedAdEventType;

    await mobileAds().initialize();
    console.log('✅ AdMob initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ AdMob initialization failed:', error);
    return false;
  }
};

/**
 * 리워드 광고 미리 로드
 */
export const loadRewardedAd = () => {
  if (isWeb || !RewardedAd) {
    return Promise.resolve(false);
  }

  if (isAdLoading || isAdLoaded) {
    return Promise.resolve(isAdLoaded);
  }

  return new Promise((resolve) => {
    isAdLoading = true;
    const adUnitId = Platform.OS === 'ios'
      ? AD_UNIT_IDS.rewarded.ios
      : AD_UNIT_IDS.rewarded.android;

    try {
      rewardedAd = RewardedAd.createForAdRequest(adUnitId, {
        requestNonPersonalizedAdsOnly: true,
      });

      const unsubscribeLoaded = rewardedAd.addAdEventListener(
        RewardedAdEventType.LOADED,
        () => {
          console.log('✅ Rewarded ad loaded');
          isAdLoaded = true;
          isAdLoading = false;
          unsubscribeLoaded();
          resolve(true);
        }
      );

      rewardedAd.addAdEventListener('error', (error) => {
        console.error('❌ Rewarded ad error:', error);
        isAdLoaded = false;
        isAdLoading = false;
        resolve(false);
      });

      rewardedAd.load();
    } catch (error) {
      console.error('❌ Error creating rewarded ad:', error);
      isAdLoading = false;
      resolve(false);
    }
  });
};

/**
 * 리워드 광고 표시 및 보상 처리
 * @param {Function} onRewarded - 보상 콜백 (광고 시청 완료 시)
 * @param {Function} onClosed - 광고 종료 콜백
 * @returns {Promise<boolean>}
 */
export const showRewardedAd = async (onRewarded, onClosed) => {
  // 웹에서는 시뮬레이션 (1초 후 보상)
  if (isWeb) {
    console.log('📺 Simulating ad on web...');
    return new Promise((resolve) => {
      setTimeout(() => {
        if (onRewarded) onRewarded({ type: 'refresh', amount: 1 });
        if (onClosed) onClosed();
        resolve(true);
      }, 1500);
    });
  }

  // 광고가 로드되지 않았으면 먼저 로드
  if (!rewardedAd || !isAdLoaded) {
    const loaded = await loadRewardedAd();
    if (!loaded) {
      console.log('📺 Failed to load ad');
      return false;
    }
  }

  return new Promise((resolve) => {
    let rewarded = false;

    const unsubscribeEarned = rewardedAd.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      (reward) => {
        console.log('🎁 User earned reward:', reward);
        rewarded = true;
        if (onRewarded) onRewarded(reward);
      }
    );

    const unsubscribeClosed = rewardedAd.addAdEventListener(
      'closed',
      () => {
        console.log('📺 Ad closed, rewarded:', rewarded);
        isAdLoaded = false;
        rewardedAd = null;
        unsubscribeEarned();
        unsubscribeClosed();
        if (onClosed) onClosed();
        loadRewardedAd(); // 다음 광고 미리 로드
        resolve(rewarded);
      }
    );

    rewardedAd.show().catch((error) => {
      console.error('❌ Failed to show ad:', error);
      unsubscribeEarned();
      unsubscribeClosed();
      isAdLoaded = false;
      resolve(false);
    });
  });
};

/**
 * 광고 준비 상태 확인
 */
export const isAdReady = () => {
  if (isWeb) return true;
  return isAdLoaded;
};

/**
 * 광고 지원 플랫폼 여부
 */
export const isAdsSupported = () => !isWeb;

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
  // AdMob SDK
  initializeAdMob,
  loadRewardedAd,
  showRewardedAd,
  isAdReady,
  isAdsSupported,
  // Backend API
  getAdConfig,
  getAdStatus,
  canUnlockWithAd,
  startAdWatch,
  completeAdWatch,
  getAdUsage,
  getAdStats,
  simulateAd,
};

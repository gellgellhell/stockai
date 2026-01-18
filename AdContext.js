/**
 * 광고 Context
 * 앱 전체에서 광고 상태 관리
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import * as adService from './services/adService';
import { AD_CONFIG } from './config/adConfig';

const AdContext = createContext(null);

export const AdProvider = ({ children, userId }) => {
  // 광고 상태
  const [adStatus, setAdStatus] = useState({
    adsEnabled: false,
    rewarded: { canWatch: false },
    interstitial: { canWatch: false },
    todaySummary: {
      adsWatched: 0,
      refreshEarned: 0,
      level2Earned: 0,
    },
  });

  // 사용량 상태
  const [usage, setUsage] = useState({
    refresh: { remaining: 0 },
    level1: { remaining: 0 },
    level2: { remaining: 0 },
    level3: { remaining: 0 },
  });

  // 로딩 상태
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 광고 시청 토큰
  const [watchToken, setWatchToken] = useState(null);

  // 광고 상태 새로고침
  const refreshAdStatus = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const response = await adService.getAdStatus(userId);
      if (response.success) {
        setAdStatus(response.data);
      }
    } catch (err) {
      console.error('Failed to refresh ad status:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // 사용량 새로고침
  const refreshUsage = useCallback(async () => {
    if (!userId) return;

    try {
      const response = await adService.getAdUsage(userId);
      if (response.success) {
        setUsage(response.data);
      }
    } catch (err) {
      console.error('Failed to refresh usage:', err);
    }
  }, [userId]);

  // 광고로 해제 가능 여부 확인
  const checkCanUnlock = useCallback(async (type) => {
    if (!userId) return { canUnlock: false };

    try {
      const response = await adService.canUnlockWithAd(userId, type);
      return response.data || { canUnlock: false };
    } catch (err) {
      console.error('Failed to check unlock:', err);
      return { canUnlock: false };
    }
  }, [userId]);

  // 광고 시청 시작
  const startWatchingAd = useCallback(async (adType = 'rewarded') => {
    if (!userId) {
      return { success: false, error: 'User not logged in' };
    }

    try {
      setLoading(true);
      const response = await adService.startAdWatch(userId, adType);

      if (response.success) {
        setWatchToken(response.data.watchToken);
        return {
          success: true,
          watchToken: response.data.watchToken,
          expectedRewards: response.data.expectedRewards,
        };
      } else {
        return {
          success: false,
          error: response.reason || response.message,
          ...response,
        };
      }
    } catch (err) {
      console.error('Failed to start ad:', err);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // 광고 시청 완료
  const completeWatchingAd = useCallback(async (adType = 'rewarded', adUnitId = null) => {
    if (!userId) {
      return { success: false, error: 'User not logged in' };
    }

    try {
      setLoading(true);
      const response = await adService.completeAdWatch(
        userId,
        adType,
        watchToken,
        'admob',
        adUnitId
      );

      if (response.success) {
        // 광고 상태 및 사용량 새로고침
        await Promise.all([refreshAdStatus(), refreshUsage()]);
        setWatchToken(null);

        return {
          success: true,
          rewardType: response.data.rewardType,
          rewardAmount: response.data.rewardAmount,
          message: response.data.message,
        };
      } else {
        return {
          success: false,
          error: response.reason || response.message,
        };
      }
    } catch (err) {
      console.error('Failed to complete ad:', err);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [userId, watchToken, refreshAdStatus, refreshUsage]);

  // 초기 로드
  useEffect(() => {
    if (userId) {
      refreshAdStatus();
      refreshUsage();
    }
  }, [userId, refreshAdStatus, refreshUsage]);

  const value = {
    // 상태
    adStatus,
    usage,
    loading,
    error,
    config: AD_CONFIG,

    // 계산된 값
    canWatchRewarded: adStatus.adsEnabled && adStatus.rewarded?.canWatch,
    canWatchInterstitial: adStatus.adsEnabled && adStatus.interstitial?.canWatch,

    // 메서드
    refreshAdStatus,
    refreshUsage,
    checkCanUnlock,
    startWatchingAd,
    completeWatchingAd,
  };

  return (
    <AdContext.Provider value={value}>
      {children}
    </AdContext.Provider>
  );
};

export const useAd = () => {
  const context = useContext(AdContext);
  if (!context) {
    throw new Error('useAd must be used within an AdProvider');
  }
  return context;
};

export default AdContext;

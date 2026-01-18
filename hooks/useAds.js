/**
 * useAds Hook
 * 광고 관련 기능을 쉽게 사용할 수 있는 커스텀 훅
 */

import { useState, useCallback, useEffect } from 'react';
import { useAd } from '../AdContext';
import * as adService from '../services/adService';

/**
 * 광고 관련 기능 통합 훅
 */
export const useAds = () => {
  const adContext = useAd();
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitType, setLimitType] = useState('refresh');

  // 사용량 제한 모달 표시
  const showUsageLimitModal = useCallback((type = 'refresh') => {
    setLimitType(type);
    setShowLimitModal(true);
  }, []);

  // 사용량 제한 모달 닫기
  const hideLimitModal = useCallback(() => {
    setShowLimitModal(false);
  }, []);

  // API 응답에서 사용량 제한 체크
  const checkApiResponse = useCallback((response) => {
    if (response?.error === 'USAGE_LIMIT_EXCEEDED') {
      // 광고로 해제 가능하면 모달 표시
      if (response.adUnlock?.available) {
        // usageType 추출 (level1, level2, level3, refresh)
        const type = response.message?.includes('level')
          ? response.message.match(/level(\d)/i)?.[0]?.toLowerCase() || 'refresh'
          : 'refresh';
        showUsageLimitModal(type);
        return true;
      }
    }
    return false;
  }, [showUsageLimitModal]);

  return {
    ...adContext,
    showLimitModal,
    limitType,
    showUsageLimitModal,
    hideLimitModal,
    checkApiResponse,
  };
};

/**
 * 특정 타입의 사용량 체크 및 자동 광고 유도 훅
 */
export const useUsageCheck = (usageType = 'refresh') => {
  const { usage, checkCanUnlock, canWatchRewarded } = useAd();
  const [canUnlock, setCanUnlock] = useState(false);
  const [unlockInfo, setUnlockInfo] = useState(null);

  // 사용량 정보
  const usageInfo = usage?.[usageType] || { remaining: 0 };
  const hasRemaining = usageInfo.remaining > 0 || usageInfo.remaining === '무제한';

  // 광고로 해제 가능 여부 체크
  useEffect(() => {
    const check = async () => {
      if (!hasRemaining && canWatchRewarded) {
        const result = await checkCanUnlock(usageType);
        setCanUnlock(result.canUnlock);
        setUnlockInfo(result);
      } else {
        setCanUnlock(false);
        setUnlockInfo(null);
      }
    };
    check();
  }, [hasRemaining, canWatchRewarded, usageType, checkCanUnlock]);

  return {
    usageInfo,
    hasRemaining,
    canUnlockWithAd: canUnlock,
    unlockInfo,
  };
};

/**
 * 광고 시청 후 액션 실행 훅
 */
export const useAdRewardedAction = (action, usageType = 'refresh') => {
  const { canWatchRewarded, startWatchingAd, completeWatchingAd } = useAd();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const executeWithAd = useCallback(async () => {
    if (!canWatchRewarded) {
      setError('광고를 시청할 수 없습니다');
      return { success: false, error: '광고를 시청할 수 없습니다' };
    }

    setLoading(true);
    setError(null);

    try {
      // 광고 시작
      const startResult = await startWatchingAd('rewarded');
      if (!startResult.success) {
        throw new Error(startResult.error);
      }

      // 여기서 실제 광고 SDK 호출 (시뮬레이션)
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // 광고 완료
      const completeResult = await completeWatchingAd('rewarded', 'hook');
      if (!completeResult.success) {
        throw new Error(completeResult.error);
      }

      // 액션 실행
      if (action) {
        await action();
      }

      return { success: true, reward: completeResult };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [canWatchRewarded, startWatchingAd, completeWatchingAd, action]);

  return {
    executeWithAd,
    loading,
    error,
    canWatch: canWatchRewarded,
  };
};

/**
 * 광고 통계 훅
 */
export const useAdStats = (days = 30) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchStats = useCallback(async (userId) => {
    if (!userId) return;

    setLoading(true);
    try {
      const response = await adService.getAdStats(userId, days);
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch ad stats:', error);
    } finally {
      setLoading(false);
    }
  }, [days]);

  return { stats, loading, fetchStats };
};

export default useAds;

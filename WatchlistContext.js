/**
 * 관심종목 Context
 * 앱 전체에서 관심종목 상태 관리
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import * as watchlistService from './services/watchlistService';

const WatchlistContext = createContext(null);

export const WatchlistProvider = ({ children, userId }) => {
  // 관심종목 목록
  const [watchlist, setWatchlist] = useState([]);
  const [groups, setGroups] = useState([]);
  const [ungroupedCount, setUngroupedCount] = useState(0);

  // 한도 정보
  const [limitInfo, setLimitInfo] = useState({
    current: 0,
    limit: 5,
    remaining: 5,
    allowed: true,
  });

  // 가격 알림
  const [alerts, setAlerts] = useState([]);

  // 로딩 상태
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 선택된 그룹
  const [selectedGroupId, setSelectedGroupId] = useState(null);

  // 관심종목 목록 새로고침
  const refreshWatchlist = useCallback(async (groupId = null) => {
    if (!userId) return;

    setLoading(true);
    try {
      const response = await watchlistService.getWatchlist(userId, groupId);
      if (response.success) {
        setWatchlist(response.data.items);
        setLimitInfo({
          current: response.data.count,
          limit: response.data.limit,
          remaining: response.data.remaining,
          allowed: response.data.remaining > 0 || response.data.limit === '무제한',
        });
      }
    } catch (err) {
      console.error('Refresh watchlist error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // 그룹 목록 새로고침
  const refreshGroups = useCallback(async () => {
    if (!userId) return;

    try {
      const response = await watchlistService.getGroups(userId);
      if (response.success) {
        setGroups(response.data.groups);
        setUngroupedCount(response.data.ungroupedCount);
      }
    } catch (err) {
      console.error('Refresh groups error:', err);
    }
  }, [userId]);

  // 관심종목 추가
  const addStock = useCallback(async (stockData) => {
    if (!userId) return { success: false, error: 'Not logged in' };

    setLoading(true);
    try {
      const response = await watchlistService.addToWatchlist(userId, stockData);

      if (response.success) {
        await refreshWatchlist(selectedGroupId);
        await refreshGroups();
      }

      return response;
    } catch (err) {
      console.error('Add stock error:', err);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [userId, selectedGroupId, refreshWatchlist, refreshGroups]);

  // 관심종목 제거
  const removeStock = useCallback(async (symbol) => {
    if (!userId) return { success: false, error: 'Not logged in' };

    setLoading(true);
    try {
      const response = await watchlistService.removeFromWatchlist(userId, symbol);

      if (response.success) {
        // 로컬 상태 즉시 업데이트
        setWatchlist((prev) => prev.filter((item) => item.symbol !== symbol));
        setLimitInfo((prev) => ({
          ...prev,
          current: prev.current - 1,
          remaining: prev.remaining + 1,
        }));
        await refreshGroups();
      }

      return response;
    } catch (err) {
      console.error('Remove stock error:', err);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [userId, refreshGroups]);

  // 관심종목 여부 확인
  const isInWatchlist = useCallback((symbol) => {
    return watchlist.some((item) => item.symbol === symbol);
  }, [watchlist]);

  // 관심종목 토글
  const toggleWatchlist = useCallback(async (stockData) => {
    const { symbol } = stockData;
    const inList = isInWatchlist(symbol);

    if (inList) {
      return await removeStock(symbol);
    } else {
      return await addStock(stockData);
    }
  }, [isInWatchlist, addStock, removeStock]);

  // 관심종목 업데이트
  const updateStock = useCallback(async (symbol, updates) => {
    if (!userId) return { success: false, error: 'Not logged in' };

    try {
      const response = await watchlistService.updateWatchlistItem(userId, symbol, updates);

      if (response.success) {
        // 로컬 상태 업데이트
        setWatchlist((prev) =>
          prev.map((item) =>
            item.symbol === symbol ? { ...item, ...updates } : item
          )
        );
      }

      return response;
    } catch (err) {
      console.error('Update stock error:', err);
      return { success: false, error: err.message };
    }
  }, [userId]);

  // 관심종목 순서 변경
  const reorderStocks = useCallback(async (orderedSymbols) => {
    if (!userId) return { success: false, error: 'Not logged in' };

    // 낙관적 업데이트
    const orderedList = orderedSymbols.map((symbol) =>
      watchlist.find((item) => item.symbol === symbol)
    ).filter(Boolean);
    setWatchlist(orderedList);

    try {
      const response = await watchlistService.reorderWatchlist(userId, orderedSymbols);
      if (!response.success) {
        // 실패시 롤백
        await refreshWatchlist(selectedGroupId);
      }
      return response;
    } catch (err) {
      console.error('Reorder error:', err);
      await refreshWatchlist(selectedGroupId);
      return { success: false, error: err.message };
    }
  }, [userId, watchlist, selectedGroupId, refreshWatchlist]);

  // 그룹 생성
  const createGroup = useCallback(async (name, color, icon) => {
    if (!userId) return { success: false, error: 'Not logged in' };

    try {
      const response = await watchlistService.createGroup(userId, name, color, icon);

      if (response.success) {
        await refreshGroups();
      }

      return response;
    } catch (err) {
      console.error('Create group error:', err);
      return { success: false, error: err.message };
    }
  }, [userId, refreshGroups]);

  // 그룹 삭제
  const deleteGroup = useCallback(async (groupId) => {
    if (!userId) return { success: false, error: 'Not logged in' };

    try {
      const response = await watchlistService.deleteGroup(userId, groupId);

      if (response.success) {
        await refreshGroups();
        if (selectedGroupId === groupId) {
          setSelectedGroupId(null);
          await refreshWatchlist(null);
        }
      }

      return response;
    } catch (err) {
      console.error('Delete group error:', err);
      return { success: false, error: err.message };
    }
  }, [userId, selectedGroupId, refreshGroups, refreshWatchlist]);

  // 그룹 선택
  const selectGroup = useCallback(async (groupId) => {
    setSelectedGroupId(groupId);
    await refreshWatchlist(groupId);
  }, [refreshWatchlist]);

  // 가격 알림 새로고침
  const refreshAlerts = useCallback(async () => {
    if (!userId) return;

    try {
      const response = await watchlistService.getPriceAlerts(userId);
      if (response.success) {
        setAlerts(response.data.alerts);
      }
    } catch (err) {
      console.error('Refresh alerts error:', err);
    }
  }, [userId]);

  // 가격 알림 생성
  const createAlert = useCallback(async (symbol, condition, targetPrice) => {
    if (!userId) return { success: false, error: 'Not logged in' };

    try {
      const response = await watchlistService.createPriceAlert(
        userId,
        symbol,
        condition,
        targetPrice
      );

      if (response.success) {
        await refreshAlerts();
      }

      return response;
    } catch (err) {
      console.error('Create alert error:', err);
      return { success: false, error: err.message };
    }
  }, [userId, refreshAlerts]);

  // 가격 알림 삭제
  const deleteAlert = useCallback(async (alertId) => {
    if (!userId) return { success: false, error: 'Not logged in' };

    try {
      const response = await watchlistService.deletePriceAlert(userId, alertId);

      if (response.success) {
        setAlerts((prev) => prev.filter((a) => a.id !== alertId));
      }

      return response;
    } catch (err) {
      console.error('Delete alert error:', err);
      return { success: false, error: err.message };
    }
  }, [userId]);

  // 초기 로드
  useEffect(() => {
    if (userId) {
      refreshWatchlist();
      refreshGroups();
      refreshAlerts();
    }
  }, [userId, refreshWatchlist, refreshGroups, refreshAlerts]);

  const value = {
    // 상태
    watchlist,
    groups,
    ungroupedCount,
    limitInfo,
    alerts,
    loading,
    error,
    selectedGroupId,

    // 메서드 - 관심종목
    refreshWatchlist,
    addStock,
    removeStock,
    isInWatchlist,
    toggleWatchlist,
    updateStock,
    reorderStocks,

    // 메서드 - 그룹
    refreshGroups,
    createGroup,
    deleteGroup,
    selectGroup,

    // 메서드 - 알림
    refreshAlerts,
    createAlert,
    deleteAlert,
  };

  return (
    <WatchlistContext.Provider value={value}>
      {children}
    </WatchlistContext.Provider>
  );
};

export const useWatchlist = () => {
  const context = useContext(WatchlistContext);
  if (!context) {
    throw new Error('useWatchlist must be used within a WatchlistProvider');
  }
  return context;
};

export default WatchlistContext;

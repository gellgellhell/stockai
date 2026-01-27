import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getCryptoData, getStockData } from './services/marketApi';
import { useTheme } from './ThemeContext';
import { useAuth } from './AuthContext';
import { getQuickScore } from './services/aiAnalysis';
import { getWatchlist, getWatchlistLimit, removeFromWatchlist } from './services/watchlistService';
import { getRefreshStatus, useRefresh } from './services/refreshLimitService';

// 임시 AI 점수 생성 (실제로는 AI 분석 결과 사용)
const generateAIScore = (change) => {
  const base = 50;
  const changeImpact = change * 2;
  const random = Math.floor(Math.random() * 20) - 10;
  return Math.min(100, Math.max(0, Math.round(base + changeImpact + random)));
};

const getScoreColor = (score) => {
  if (score >= 70) return '#10B981';
  if (score >= 40) return '#F59E0B';
  return '#EF4444';
};

const getScoreLabel = (score) => {
  if (score >= 80) return '매우 좋음';
  if (score >= 60) return '좋음';
  if (score >= 40) return '보통';
  return '주의';
};

// 기본 타임프레임 설정
const DEFAULT_TIMEFRAME = '1d';
const TIMEFRAME_LABELS = {
  '1h': '1H',
  '1d': '1D',
  '1w': '1W',
};

export default function HomeScreen({ navigation }) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState(DEFAULT_TIMEFRAME);
  const [watchlistLimit, setWatchlistLimit] = useState({ current: 0, limit: 1 });
  const [refreshStatus, setRefreshStatus] = useState({
    used: 0,
    limit: 5,
    remaining: 5,
    canRefresh: true,
  });

  // 새로고침 상태 초기화
  useEffect(() => {
    const loadRefreshStatus = async () => {
      const status = await getRefreshStatus(false); // TODO: 프리미엄 여부 확인
      setRefreshStatus(status);
    };
    loadRefreshStatus();
  }, []);

  const fetchWatchlistData = async () => {
    try {
      let watchlistItems = [];

      // 로그인된 경우 백엔드에서 관심종목 가져오기
      if (user?.uid) {
        const [watchlistResult, limitResult] = await Promise.all([
          getWatchlist(user.uid),
          getWatchlistLimit(user.uid)
        ]);

        if (watchlistResult.success && watchlistResult.data?.items?.length > 0) {
          watchlistItems = watchlistResult.data.items;
        }

        if (limitResult.success) {
          setWatchlistLimit({
            current: limitResult.data.current,
            limit: limitResult.data.limit
          });
        }

        // 관심종목의 실시간 가격 데이터 가져오기
        if (watchlistItems.length > 0) {
          const cryptoSymbols = watchlistItems.filter(i => i.type === 'crypto').map(i => i.symbol);
          const stockSymbols = watchlistItems.filter(i => i.type === 'stock').map(i => i.symbol);

          const [cryptoPrices, stockPrices] = await Promise.all([
            cryptoSymbols.length > 0 ? getCryptoData(cryptoSymbols) : [],
            stockSymbols.length > 0 ? getStockData(stockSymbols) : [],
          ]);

          // 가격 데이터 병합
          const priceMap = new Map();
          [...cryptoPrices, ...stockPrices].forEach(item => {
            priceMap.set(item.symbol, item);
          });

          watchlistItems = watchlistItems.map(item => ({
            ...item,
            ...(priceMap.get(item.symbol) || {}),
          }));
        }
      }

      // 관심종목이 있으면 AI 점수 가져오기
      if (watchlistItems.length > 0) {
        const allData = await Promise.all(
          watchlistItems.map(async (item) => {
            try {
              const scoreData = await getQuickScore(
                item.symbol,
                item.type || 'crypto',
                selectedTimeframe
              );
              return {
                ...item,
                score: scoreData.score || generateAIScore(item.change || 0),
                timeframe: selectedTimeframe,
                timeframeLabel: TIMEFRAME_LABELS[selectedTimeframe] || '1D',
              };
            } catch (err) {
              return {
                ...item,
                score: generateAIScore(item.change || 0),
                timeframe: selectedTimeframe,
                timeframeLabel: TIMEFRAME_LABELS[selectedTimeframe] || '1D',
              };
            }
          })
        );
        setStocks(allData);
      } else {
        setStocks([]);
      }
    } catch (error) {
      console.error('Failed to fetch watchlist:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWatchlistData();
  }, [selectedTimeframe]);

  // 화면에 다시 포커스될 때 데이터 새로고침
  useFocusEffect(
    useCallback(() => {
      fetchWatchlistData();
    }, [selectedTimeframe, user?.uid])
  );

  // 관심종목 삭제 실행
  const executeRemoveStock = async (stock) => {
    try {
      const result = await removeFromWatchlist(user.uid, stock.symbol);
      if (result.success) {
        // 로컬 상태에서 즉시 제거
        setStocks(prev => prev.filter(s => s.symbol !== stock.symbol));
        setWatchlistLimit(prev => ({
          ...prev,
          current: Math.max(0, prev.current - 1)
        }));
      } else {
        if (Platform.OS === 'web') {
          window.alert(result.error || '삭제에 실패했습니다.');
        } else {
          Alert.alert('오류', result.error || '삭제에 실패했습니다.');
        }
      }
    } catch (error) {
      console.error('Remove stock error:', error);
      if (Platform.OS === 'web') {
        window.alert('삭제 중 오류가 발생했습니다.');
      } else {
        Alert.alert('오류', '삭제 중 오류가 발생했습니다.');
      }
    }
  };

  // 관심종목 삭제 핸들러
  const handleRemoveStock = useCallback((stock) => {
    if (!user?.uid) {
      if (Platform.OS === 'web') {
        window.alert('로그인이 필요합니다.');
      } else {
        Alert.alert('알림', '로그인이 필요합니다.');
      }
      return;
    }

    const stockName = stock.nameKr || stock.name || stock.symbol;

    if (Platform.OS === 'web') {
      // 웹에서는 window.confirm 사용
      if (window.confirm(`${stockName}을(를) 관심종목에서 삭제하시겠습니까?`)) {
        executeRemoveStock(stock);
      }
    } else {
      // 네이티브에서는 Alert.alert 사용
      Alert.alert(
        '관심종목 삭제',
        `${stockName}을(를) 관심종목에서 삭제하시겠습니까?`,
        [
          { text: '취소', style: 'cancel' },
          {
            text: '삭제',
            style: 'destructive',
            onPress: () => executeRemoveStock(stock),
          },
        ]
      );
    }
  }, [user?.uid]);

  const onRefresh = async () => {
    // 새로고침 제한 확인 및 차감
    const refreshResult = await useRefresh(false); // TODO: 프리미엄 여부 확인
    if (!refreshResult.success) {
      const message = `오늘의 무료 새로고침 횟수(${refreshResult.limit}회)를 모두 사용했습니다.\n\n광고를 시청하거나 프리미엄으로 업그레이드하세요.`;
      if (Platform.OS === 'web') {
        window.alert(message);
      } else {
        Alert.alert(
          '새로고침 제한',
          message,
          [
            { text: '광고 보기', onPress: () => Alert.alert('준비 중', '광고 기능은 준비 중입니다.') },
            { text: '확인', style: 'cancel' },
          ]
        );
      }
      return;
    }

    // 새로고침 상태 업데이트
    setRefreshStatus({
      used: refreshResult.used,
      limit: refreshResult.limit,
      remaining: refreshResult.remaining,
      canRefresh: refreshResult.canRefresh,
    });

    setRefreshing(true);
    fetchWatchlistData();
  };

  const formatPrice = (price, type) => {
    if (!price) return '-';
    if (type === 'crypto') {
      return price >= 1 ? `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : `$${price.toFixed(6)}`;
    }
    return `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  };

  const avgScore = stocks.length > 0
    ? Math.round(stocks.reduce((sum, s) => sum + (s.score || 0), 0) / stocks.length)
    : 0;

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 12, color: colors.textSecondary }}>데이터 로딩 중...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* 오늘의 내 관심 분야 점수 */}
        <View style={[styles.scoreCard, { backgroundColor: colors.card }]}>
          <View style={styles.scoreHeader}>
            <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>내 관심 분야 점수</Text>
            <View style={styles.refreshInfo}>
              <Text style={[styles.refreshLabel, { color: colors.textTertiary }]}>새로고침</Text>
              <Text style={[styles.refreshCount, {
                color: refreshStatus.remaining > 2 ? colors.success :
                       refreshStatus.remaining > 0 ? colors.warning :
                       colors.error
              }]}>{refreshStatus.remaining}/{refreshStatus.limit}</Text>
            </View>
          </View>

          {/* 타임프레임 선택기 */}
          <View style={[styles.timeframeSelector, { backgroundColor: colors.surfaceSecondary }]}>
            {Object.entries(TIMEFRAME_LABELS).map(([key, label]) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.timeframeButton,
                  selectedTimeframe === key && [styles.timeframeButtonActive, { backgroundColor: colors.card }]
                ]}
                onPress={() => {
                  if (selectedTimeframe !== key) {
                    setLoading(true);
                    setSelectedTimeframe(key);
                  }
                }}
              >
                <Text style={[
                  styles.timeframeButtonText,
                  { color: colors.textSecondary },
                  selectedTimeframe === key && { color: colors.primary, fontWeight: '700' }
                ]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {stocks.length > 0 ? (
            <>
              <View style={styles.scoreRow}>
                <Text style={[styles.scoreNumber, { color: colors.text }]}>{avgScore}</Text>
                <Text style={[styles.scoreUnit, { color: colors.text }]}>점</Text>
                <View style={[styles.scoreBadge, { backgroundColor: getScoreColor(avgScore) + '20' }]}>
                  <Text style={[styles.scoreBadgeText, { color: getScoreColor(avgScore) }]}>
                    {getScoreLabel(avgScore)}
                  </Text>
                </View>
              </View>

              <Text style={[styles.timeframeHint, { color: colors.textTertiary }]}>
                기준: {TIMEFRAME_LABELS[selectedTimeframe]} 데이터 기반 AI 분석
              </Text>
            </>
          ) : (
            <View style={styles.noWatchlistScore}>
              <Ionicons name="star-outline" size={32} color={colors.textTertiary} />
              <Text style={[styles.noWatchlistTitle, { color: colors.textSecondary }]}>
                등록된 관심종목이 없습니다
              </Text>
              <Text style={[styles.noWatchlistSubtitle, { color: colors.textTertiary }]}>
                관심종목을 등록하면 AI 분석 점수를 확인할 수 있어요
              </Text>
              <TouchableOpacity
                style={[styles.noWatchlistButton, { backgroundColor: colors.primary }]}
                onPress={() => navigation.navigate('Search')}
              >
                <Ionicons name="search" size={16} color="#FFFFFF" />
                <Text style={styles.noWatchlistButtonText}>종목 검색하기</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* 내 관심 종목 리스트 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>내 관심 종목</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Subscription')}>
              <Text style={[styles.limitText, { color: colors.primary }]}>
                {watchlistLimit.current}/{watchlistLimit.limit} 종목
              </Text>
            </TouchableOpacity>
          </View>

          {stocks.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
              <Ionicons name="star-outline" size={48} color={colors.textTertiary} />
              <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
                관심종목이 없습니다
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>
                검색에서 종목을 추가해보세요
              </Text>
              <TouchableOpacity
                style={[styles.emptyButton, { backgroundColor: colors.primary }]}
                onPress={() => navigation.navigate('Search')}
              >
                <Ionicons name="search" size={18} color="#FFFFFF" />
                <Text style={styles.emptyButtonText}>종목 검색하기</Text>
              </TouchableOpacity>
            </View>
          ) : stocks.map((stock, index) => (
            <View
              key={stock.symbol + index}
              style={[styles.stockCard, { backgroundColor: colors.card }]}
            >
              <TouchableOpacity
                style={styles.stockCardContent}
                onPress={() => navigation.navigate('StockDetail', { stock })}
                onLongPress={() => handleRemoveStock(stock)}
              >
                <View style={styles.stockLeft}>
                  <View style={[styles.stockIcon, {
                    backgroundColor: stock.type === 'crypto' ? colors.primary : colors.success
                  }]}>
                    <Text style={styles.stockIconText}>{stock.symbol?.charAt(0)}</Text>
                  </View>
                  <View>
                    <Text style={[styles.stockSymbol, { color: colors.text }]}>{stock.symbol}</Text>
                    <Text style={[styles.stockName, { color: colors.textSecondary }]}>{stock.nameKr || stock.name}</Text>
                  </View>
                </View>

                <View style={styles.stockMiddle}>
                  <Text style={[styles.stockPrice, { color: colors.text }]}>{formatPrice(stock.price, stock.type)}</Text>
                  <Text style={[styles.stockChange, {
                    color: (stock.change || 0) >= 0 ? colors.success : colors.error
                  }]}>
                    {(stock.change || 0) >= 0 ? '▲' : '▼'} {Math.abs(stock.change || 0).toFixed(2)}%
                  </Text>
                </View>

                <View style={styles.scoreContainer}>
                  <View style={[styles.aiScoreBadge, { backgroundColor: getScoreColor(stock.score || 50) }]}>
                    <Text style={styles.aiScoreText}>{stock.score || 50}</Text>
                  </View>
                  <Text style={[styles.scoreTimeframe, { color: colors.textTertiary }]}>
                    {stock.timeframeLabel || '1D'}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* 삭제 버튼 */}
              {user?.uid && (
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleRemoveStock(stock)}
                >
                  <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
                </TouchableOpacity>
              )}
            </View>
          ))}

          {/* 종목 추가 버튼 - 관심종목이 있을 때만 표시 */}
          {stocks.length > 0 && (
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => navigation.navigate('Search')}
            >
              <Ionicons name="add" size={24} color={colors.textTertiary} />
              <Text style={[styles.addButtonText, { color: colors.textTertiary }]}>관심 종목 추가</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* 새로고침 버튼 */}
      <TouchableOpacity style={[styles.refreshButton, { backgroundColor: colors.primary }]} onPress={onRefresh}>
        <Ionicons name="refresh" size={20} color="#FFFFFF" />
        <Text style={styles.refreshButtonText}>AI 분석 새로고침</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  scoreCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  scoreLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  refreshInfo: {
    alignItems: 'flex-end',
  },
  refreshLabel: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  refreshCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  scoreNumber: {
    fontSize: 48,
    fontWeight: '700',
    color: '#1F2937',
  },
  scoreUnit: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginRight: 12,
  },
  scoreBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  scoreBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  timeframeSelector: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
  },
  timeframeButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  timeframeButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  timeframeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  timeframeHint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
  noWatchlistScore: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  noWatchlistTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },
  noWatchlistSubtitle: {
    fontSize: 13,
    textAlign: 'center',
  },
  noWatchlistButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 8,
    gap: 6,
  },
  noWatchlistButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  limitText: {
    fontSize: 14,
    color: '#3B82F6',
  },
  stockCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingLeft: 16,
    paddingVertical: 12,
    paddingRight: 8,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  stockCardContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deleteButton: {
    padding: 8,
    marginLeft: 4,
  },
  stockLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stockIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stockIconText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  stockSymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  stockName: {
    fontSize: 13,
    color: '#6B7280',
  },
  stockMiddle: {
    flex: 1,
    alignItems: 'flex-end',
    marginRight: 12,
  },
  stockPrice: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  stockRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  scoreContainer: {
    alignItems: 'center',
    gap: 4,
  },
  aiScoreBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiScoreText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  scoreTimeframe: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  stockChange: {
    fontSize: 13,
    fontWeight: '500',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    gap: 8,
  },
  addButtonText: {
    fontSize: 15,
    color: '#9CA3AF',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    borderRadius: 16,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
    gap: 8,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  refreshButton: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

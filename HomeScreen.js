import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getCryptoData, getStockData } from './services/marketApi';
import { useTheme } from './ThemeContext';
import { useAuth } from './AuthContext';
import { getQuickScore } from './services/aiAnalysis';
import { getWatchlist, getWatchlistLimit } from './services/watchlistService';

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
  const [refreshCount, setRefreshCount] = useState(5);
  const [selectedTimeframe, setSelectedTimeframe] = useState(DEFAULT_TIMEFRAME);
  const [watchlistLimit, setWatchlistLimit] = useState({ current: 0, limit: 1 });

  const fetchWatchlistData = async () => {
    try {
      let watchlistItems = [];

      // 로그인된 경우 백엔드에서 관심종목 가져오기
      if (user?.uid) {
        const [watchlistResult, limitResult] = await Promise.all([
          getWatchlist(user.uid),
          getWatchlistLimit(user.uid)
        ]);

        if (watchlistResult.success && watchlistResult.data?.length > 0) {
          watchlistItems = watchlistResult.data;
        }

        if (limitResult.success) {
          setWatchlistLimit({
            current: limitResult.data.current,
            limit: limitResult.data.limit
          });
        }
      }

      // 관심종목이 없으면 기본 종목 표시
      if (watchlistItems.length === 0) {
        const [cryptos, usStocks] = await Promise.all([
          getCryptoData(['BTC', 'ETH']),
          getStockData(['AAPL', 'TSLA']),
        ]);
        watchlistItems = [...cryptos, ...usStocks];
      } else {
        // 관심종목의 실시간 가격 데이터 가져오기
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

      // 백엔드에서 AI 점수 가져오기
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
    } catch (error) {
      console.error('Failed to fetch watchlist:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWatchlistData();
  }, [selectedTimeframe, user?.uid]);

  // 화면에 다시 포커스될 때 데이터 새로고침
  useFocusEffect(
    useCallback(() => {
      if (!loading) {
        fetchWatchlistData();
      }
    }, [selectedTimeframe, user?.uid])
  );

  const onRefresh = () => {
    if (refreshCount <= 0) {
      alert('무료 새로고침 횟수를 모두 사용했습니다.\n광고를 시청하거나 구독을 업그레이드하세요.');
      return;
    }
    setRefreshing(true);
    setRefreshCount(prev => prev - 1);
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
              <Text style={[styles.refreshCount, { color: colors.primary }]}>{refreshCount}/5</Text>
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

          {stocks.map((stock, index) => (
            <TouchableOpacity
              key={stock.symbol + index}
              style={[styles.stockCard, { backgroundColor: colors.card }]}
              onPress={() => navigation.navigate('StockDetail', { stock })}
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
          ))}

          {/* 종목 추가 버튼 */}
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => navigation.navigate('Search')}
          >
            <Ionicons name="add" size={24} color={colors.textTertiary} />
            <Text style={[styles.addButtonText, { color: colors.textTertiary }]}>관심 종목 추가</Text>
          </TouchableOpacity>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
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

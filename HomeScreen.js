import React, { useState, useEffect } from 'react';
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
import { getCryptoData, getStockData } from './services/marketApi';

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

export default function HomeScreen({ navigation }) {
  const [refreshing, setRefreshing] = useState(false);
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshCount, setRefreshCount] = useState(5);

  const fetchWatchlistData = async () => {
    try {
      // 기본 관심 종목 (BTC, ETH, AAPL, TSLA)
      const [cryptos, usStocks] = await Promise.all([
        getCryptoData(['BTC', 'ETH']),
        getStockData(['AAPL', 'TSLA']),
      ]);

      const allData = [...cryptos, ...usStocks].map(item => ({
        ...item,
        score: generateAIScore(item.change || 0),
      }));

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
  }, []);

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
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={{ marginTop: 12, color: '#6B7280' }}>데이터 로딩 중...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />
        }
      >
        {/* 오늘의 내 관심 분야 점수 */}
        <View style={styles.scoreCard}>
          <View style={styles.scoreHeader}>
            <Text style={styles.scoreLabel}>오늘의 내 관심 분야 점수</Text>
            <View style={styles.refreshInfo}>
              <Text style={styles.refreshLabel}>새로고침</Text>
              <Text style={styles.refreshCount}>{refreshCount}/5</Text>
            </View>
          </View>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreNumber}>{avgScore}</Text>
            <Text style={styles.scoreUnit}>점</Text>
            <View style={[styles.scoreBadge, { backgroundColor: getScoreColor(avgScore) + '20' }]}>
              <Text style={[styles.scoreBadgeText, { color: getScoreColor(avgScore) }]}>
                {getScoreLabel(avgScore)}
              </Text>
            </View>
          </View>
        </View>

        {/* 내 관심 종목 리스트 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>내 관심 종목</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Subscription')}>
              <Text style={styles.limitText}>{stocks.length}/1 종목</Text>
            </TouchableOpacity>
          </View>

          {stocks.map((stock, index) => (
            <TouchableOpacity
              key={stock.symbol + index}
              style={styles.stockCard}
              onPress={() => navigation.navigate('StockDetail', { stock })}
            >
              <View style={styles.stockLeft}>
                <View style={[styles.stockIcon, {
                  backgroundColor: stock.type === 'crypto' ? '#3B82F6' : '#10B981'
                }]}>
                  <Text style={styles.stockIconText}>{stock.symbol?.charAt(0)}</Text>
                </View>
                <View>
                  <Text style={styles.stockSymbol}>{stock.symbol}</Text>
                  <Text style={styles.stockName}>{stock.nameKr || stock.name}</Text>
                </View>
              </View>

              <View style={styles.stockMiddle}>
                <Text style={styles.stockPrice}>{formatPrice(stock.price, stock.type)}</Text>
                <Text style={[styles.stockChange, {
                  color: (stock.change || 0) >= 0 ? '#10B981' : '#EF4444'
                }]}>
                  {(stock.change || 0) >= 0 ? '▲' : '▼'} {Math.abs(stock.change || 0).toFixed(2)}%
                </Text>
              </View>

              <View style={[styles.aiScoreBadge, { backgroundColor: getScoreColor(stock.score || 50) }]}>
                <Text style={styles.aiScoreText}>{stock.score || 50}</Text>
              </View>
            </TouchableOpacity>
          ))}

          {/* 종목 추가 버튼 */}
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => navigation.navigate('Search')}
          >
            <Ionicons name="add" size={24} color="#9CA3AF" />
            <Text style={styles.addButtonText}>관심 종목 추가</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* 새로고침 버튼 */}
      <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
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

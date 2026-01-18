import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getTopCryptos, getTopUSStocks, getTopKoreanStocks } from './services/marketApi';

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

export default function TrendingScreen({ navigation }) {
  const [selectedCategory, setSelectedCategory] = useState('crypto');
  const [sortBy, setSortBy] = useState('marketCap');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const categories = [
    { key: 'crypto', label: '코인' },
    { key: 'us', label: '미국주식' },
    { key: 'kr', label: '한국주식' },
  ];

  const fetchData = async () => {
    try {
      let result = [];
      if (selectedCategory === 'crypto') {
        result = await getTopCryptos(20);
      } else if (selectedCategory === 'us') {
        result = await getTopUSStocks();
      } else if (selectedCategory === 'kr') {
        result = await getTopKoreanStocks();
      }

      // AI 점수 추가
      result = result.map(item => ({
        ...item,
        score: generateAIScore(item.change || 0),
        views: Math.floor(Math.random() * 10000) + 1000,
        registers: Math.floor(Math.random() * 3000) + 500,
      }));

      setData(result);
    } catch (error) {
      console.error('Failed to fetch trending data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [selectedCategory]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const currentData = [...data].sort((a, b) => {
    if (sortBy === 'marketCap') return (b.marketCap || 0) - (a.marketCap || 0);
    if (sortBy === 'change') return (b.change || 0) - (a.change || 0);
    return (b.score || 0) - (a.score || 0);
  });

  const formatNumber = (num) => {
    if (num >= 10000) return `${(num / 10000).toFixed(1)}만`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}천`;
    return num.toString();
  };

  const formatPrice = (price, type) => {
    if (!price) return '-';
    if (type === 'crypto') {
      return price >= 1 ? `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : `$${price.toFixed(6)}`;
    }
    return `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  };

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
      {/* 카테고리 선택 */}
      <View style={styles.periodContainer}>
        {categories.map((category) => (
          <TouchableOpacity
            key={category.key}
            style={[styles.periodTab, selectedCategory === category.key && styles.periodTabActive]}
            onPress={() => setSelectedCategory(category.key)}
          >
            <Text style={[styles.periodText, selectedCategory === category.key && styles.periodTextActive]}>
              {category.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 정렬 기준 */}
      <View style={styles.sortContainer}>
        <TouchableOpacity
          style={[styles.sortButton, sortBy === 'marketCap' && styles.sortButtonActive]}
          onPress={() => setSortBy('marketCap')}
        >
          <Ionicons name="trending-up-outline" size={16} color={sortBy === 'marketCap' ? '#3B82F6' : '#6B7280'} />
          <Text style={[styles.sortText, sortBy === 'marketCap' && styles.sortTextActive]}>
            시가총액순
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sortButton, sortBy === 'change' && styles.sortButtonActive]}
          onPress={() => setSortBy('change')}
        >
          <Ionicons name="pulse-outline" size={16} color={sortBy === 'change' ? '#3B82F6' : '#6B7280'} />
          <Text style={[styles.sortText, sortBy === 'change' && styles.sortTextActive]}>
            변동률순
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sortButton, sortBy === 'score' && styles.sortButtonActive]}
          onPress={() => setSortBy('score')}
        >
          <Ionicons name="star-outline" size={16} color={sortBy === 'score' ? '#3B82F6' : '#6B7280'} />
          <Text style={[styles.sortText, sortBy === 'score' && styles.sortTextActive]}>
            AI점수순
          </Text>
        </TouchableOpacity>
      </View>

      {/* 종목 리스트 */}
      <ScrollView
        style={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />
        }
      >
        {currentData.map((item, index) => (
          <TouchableOpacity
            key={item.symbol + item.id}
            style={styles.stockItem}
            onPress={() => navigation.navigate('StockDetail', { stock: item })}
          >
            {/* 순위 */}
            <View style={[styles.rankBadge, index < 3 && styles.rankBadgeTop]}>
              <Text style={[styles.rankText, index < 3 && styles.rankTextTop]}>{index + 1}</Text>
            </View>

            {/* 종목 정보 */}
            <View style={[styles.stockIcon, {
              backgroundColor: item.type === 'crypto' ? '#3B82F6' : '#10B981'
            }]}>
              <Text style={styles.stockIconText}>{item.symbol?.charAt(0)}</Text>
            </View>

            <View style={styles.stockInfo}>
              <Text style={styles.stockName}>{item.nameKr || item.name}</Text>
              <View style={styles.statsRow}>
                <Text style={styles.priceText}>{formatPrice(item.price, item.type)}</Text>
                <Text style={[styles.changeText, { color: item.change >= 0 ? '#10B981' : '#EF4444' }]}>
                  {item.change >= 0 ? '▲' : '▼'} {Math.abs(item.change || 0).toFixed(2)}%
                </Text>
              </View>
            </View>

            {/* AI 점수 */}
            <View style={[styles.scoreBadge, { backgroundColor: getScoreColor(item.score) }]}>
              <Text style={styles.scoreText}>{item.score}</Text>
            </View>
          </TouchableOpacity>
        ))}

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  periodContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  periodTabActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  periodText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  periodTextActive: {
    color: '#FFFFFF',
  },
  sortContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 4,
  },
  sortButtonActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  sortText: {
    fontSize: 13,
    color: '#6B7280',
  },
  sortTextActive: {
    color: '#3B82F6',
    fontWeight: '500',
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  stockItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  rankBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  rankBadgeTop: {
    backgroundColor: '#3B82F6',
  },
  rankText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  rankTextTop: {
    color: '#FFFFFF',
  },
  stockIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stockIconText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  stockInfo: {
    flex: 1,
  },
  stockName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  priceText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    marginRight: 8,
  },
  changeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  scoreBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});

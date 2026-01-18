import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { searchAll, getTopCryptos, getTopUSStocks, getTopKoreanStocks } from './services/marketApi';

const POPULAR_KEYWORDS = ['BTC', 'ETH', 'NVDA', 'TSLA', 'AAPL', '삼성전자'];

export default function SearchScreen({ navigation }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [recentSearches, setRecentSearches] = useState(['BTC', 'AAPL', 'TSLA']);
  const [isSearching, setIsSearching] = useState(false);
  const [categoryData, setCategoryData] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loadingCategory, setLoadingCategory] = useState(false);
  const searchTimeout = useRef(null);

  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
    setSelectedCategory(null);

    // 이전 타이머 취소
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    if (query.length === 0) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    // 디바운스: 300ms 후 검색 실행
    setIsSearching(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const results = await searchAll(query);
        setSearchResults(results);
      } catch (error) {
        console.error('Search failed:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }, []);

  const handleCategoryPress = async (category) => {
    setSelectedCategory(category);
    setLoadingCategory(true);
    setSearchQuery('');
    setSearchResults([]);

    try {
      let data = [];
      if (category === 'crypto') {
        data = await getTopCryptos(20);
      } else if (category === 'us') {
        data = await getTopUSStocks();
      } else if (category === 'kr') {
        data = await getTopKoreanStocks();
      }
      setCategoryData(data);
    } catch (error) {
      console.error('Category fetch failed:', error);
      setCategoryData([]);
    } finally {
      setLoadingCategory(false);
    }
  };

  const addToRecent = (symbol) => {
    setRecentSearches(prev => {
      const filtered = prev.filter(s => s !== symbol);
      return [symbol, ...filtered].slice(0, 5);
    });
  };

  const formatPrice = (price, type) => {
    if (!price) return '';
    if (type === 'crypto') {
      return price >= 1 ? `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : `$${price.toFixed(6)}`;
    }
    return `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* 검색 입력 */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="종목명 또는 심볼 검색"
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={handleSearch}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* 검색 중이거나 검색어가 있을 때 */}
        {searchQuery.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>검색 결과 ({searchResults.length})</Text>
            {isSearching ? (
              <View style={styles.loadingState}>
                <ActivityIndicator size="small" color="#3B82F6" />
                <Text style={styles.loadingText}>검색 중...</Text>
              </View>
            ) : searchResults.length > 0 ? (
              searchResults.map((item, index) => (
                <TouchableOpacity
                  key={item.symbol + index}
                  style={styles.resultItem}
                  onPress={() => {
                    addToRecent(item.symbol);
                    navigation.navigate('StockDetail', { stock: { ...item, score: 75, change: 0 } });
                  }}
                >
                  <View style={styles.resultLeft}>
                    <View style={[styles.resultIcon, {
                      backgroundColor: item.type === 'crypto' ? '#3B82F6' : '#10B981'
                    }]}>
                      <Text style={styles.resultIconText}>{item.symbol?.charAt(0)}</Text>
                    </View>
                    <View>
                      <Text style={styles.resultSymbol}>{item.symbol}</Text>
                      <Text style={styles.resultName}>{item.name}</Text>
                    </View>
                  </View>
                  <View style={styles.resultRight}>
                    <Text style={styles.exchangeText}>{item.exchange || item.type}</Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="search-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyText}>검색 결과가 없습니다</Text>
              </View>
            )}
          </View>
        ) : selectedCategory ? (
          /* 카테고리 선택 시 */
          <View style={styles.section}>
            <View style={styles.categoryHeader}>
              <TouchableOpacity onPress={() => setSelectedCategory(null)} style={styles.backButton}>
                <Ionicons name="arrow-back" size={20} color="#3B82F6" />
                <Text style={styles.backText}>뒤로</Text>
              </TouchableOpacity>
              <Text style={styles.sectionTitle}>
                {selectedCategory === 'crypto' ? '암호화폐' : selectedCategory === 'us' ? '미국 주식' : '한국 주식'}
              </Text>
            </View>
            {loadingCategory ? (
              <View style={styles.loadingState}>
                <ActivityIndicator size="large" color="#3B82F6" />
                <Text style={styles.loadingText}>데이터 로딩 중...</Text>
              </View>
            ) : (
              categoryData.map((item, index) => (
                <TouchableOpacity
                  key={item.symbol + index}
                  style={styles.resultItem}
                  onPress={() => {
                    addToRecent(item.symbol);
                    navigation.navigate('StockDetail', { stock: { ...item, score: 75 } });
                  }}
                >
                  <View style={styles.resultLeft}>
                    <View style={[styles.resultIcon, {
                      backgroundColor: item.type === 'crypto' ? '#3B82F6' : '#10B981'
                    }]}>
                      <Text style={styles.resultIconText}>{item.symbol?.charAt(0)}</Text>
                    </View>
                    <View>
                      <Text style={styles.resultSymbol}>{item.symbol}</Text>
                      <Text style={styles.resultName}>{item.nameKr || item.name}</Text>
                    </View>
                  </View>
                  <View style={styles.resultRight}>
                    <Text style={styles.priceText}>{formatPrice(item.price, item.type)}</Text>
                    <Text style={[styles.changeText, { color: (item.change || 0) >= 0 ? '#10B981' : '#EF4444' }]}>
                      {(item.change || 0) >= 0 ? '+' : ''}{(item.change || 0).toFixed(2)}%
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        ) : (
          <>
            {/* 최근 검색어 */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>최근 검색</Text>
                <TouchableOpacity>
                  <Text style={styles.clearText}>전체 삭제</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.tagsContainer}>
                {recentSearches.map((keyword, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.tag}
                    onPress={() => handleSearch(keyword)}
                  >
                    <Ionicons name="time-outline" size={14} color="#6B7280" />
                    <Text style={styles.tagText}>{keyword}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 인기 검색어 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>인기 검색어</Text>
              <View style={styles.tagsContainer}>
                {POPULAR_KEYWORDS.map((keyword, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.tag, styles.popularTag]}
                    onPress={() => handleSearch(keyword)}
                  >
                    <Text style={styles.popularTagText}>{keyword}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 카테고리 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>카테고리</Text>
              <View style={styles.categoriesGrid}>
                <TouchableOpacity style={styles.categoryCard} onPress={() => handleCategoryPress('crypto')}>
                  <View style={[styles.categoryIcon, { backgroundColor: '#EFF6FF' }]}>
                    <Ionicons name="logo-bitcoin" size={24} color="#3B82F6" />
                  </View>
                  <Text style={styles.categoryName}>암호화폐</Text>
                  <Text style={styles.categoryCount}>TOP 20</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.categoryCard} onPress={() => handleCategoryPress('us')}>
                  <View style={[styles.categoryIcon, { backgroundColor: '#ECFDF5' }]}>
                    <Ionicons name="trending-up" size={24} color="#10B981" />
                  </View>
                  <Text style={styles.categoryName}>미국 주식</Text>
                  <Text style={styles.categoryCount}>TOP 10</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.categoryCard} onPress={() => handleCategoryPress('kr')}>
                  <View style={[styles.categoryIcon, { backgroundColor: '#FEF3C7' }]}>
                    <Ionicons name="flag" size={24} color="#F59E0B" />
                  </View>
                  <Text style={styles.categoryName}>한국 주식</Text>
                  <Text style={styles.categoryCount}>TOP 10</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.categoryCard} onPress={() => navigation.navigate('Trending')}>
                  <View style={[styles.categoryIcon, { backgroundColor: '#FEE2E2' }]}>
                    <Ionicons name="flame" size={24} color="#EF4444" />
                  </View>
                  <Text style={styles.categoryName}>인기 급상승</Text>
                  <Text style={styles.categoryCount}>실시간</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    marginLeft: 10,
    marginRight: 10,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  clearText: {
    fontSize: 14,
    color: '#6B7280',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  tagText: {
    fontSize: 14,
    color: '#374151',
  },
  popularTag: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  popularTagText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    width: '47%',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  categoryCount: {
    fontSize: 13,
    color: '#6B7280',
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  resultLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  resultIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultIconText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  resultSymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  resultName: {
    fontSize: 13,
    color: '#6B7280',
  },
  addButton: {
    padding: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
  },
  loadingState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 12,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  backText: {
    fontSize: 14,
    color: '#3B82F6',
    marginLeft: 4,
  },
  resultRight: {
    alignItems: 'flex-end',
  },
  exchangeText: {
    fontSize: 12,
    color: '#9CA3AF',
    textTransform: 'uppercase',
  },
  priceText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  changeText: {
    fontSize: 13,
    fontWeight: '500',
  },
});

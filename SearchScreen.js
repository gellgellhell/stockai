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
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { searchAll, getTopCryptos, getTopUSStocks, getTopKoreanStocks } from './services/marketApi';
import { useTheme } from './ThemeContext';
import { useAuth } from './AuthContext';
import { addToWatchlist, checkWatchlist, getWatchlistLimit } from './services/watchlistService';

const POPULAR_KEYWORDS = ['BTC', 'ETH', 'NVDA', 'TSLA', 'AAPL', '삼성전자'];

export default function SearchScreen({ navigation }) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [recentSearches, setRecentSearches] = useState(['BTC', 'AAPL', 'TSLA']);
  const [isSearching, setIsSearching] = useState(false);
  const [categoryData, setCategoryData] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loadingCategory, setLoadingCategory] = useState(false);
  const [addingSymbol, setAddingSymbol] = useState(null); // 추가 중인 종목
  const [addedSymbols, setAddedSymbols] = useState(new Set()); // 이미 추가된 종목
  const searchTimeout = useRef(null);

  // 관심종목 추가 핸들러
  const handleAddToWatchlist = async (item) => {
    if (!user) {
      Alert.alert('로그인 필요', '관심종목을 추가하려면 로그인이 필요합니다.');
      return;
    }

    setAddingSymbol(item.symbol);

    try {
      // 한도 확인
      const limitResult = await getWatchlistLimit(user.uid);
      if (limitResult.success && limitResult.data.current >= limitResult.data.limit) {
        Alert.alert(
          '한도 초과',
          `무료 플랜은 최대 ${limitResult.data.limit}개까지 추가할 수 있습니다.\n프리미엄으로 업그레이드하세요.`,
          [
            { text: '취소', style: 'cancel' },
            { text: '업그레이드', onPress: () => navigation.navigate('Subscription') }
          ]
        );
        return;
      }

      // 이미 추가되어 있는지 확인
      const checkResult = await checkWatchlist(user.uid, item.symbol);
      if (checkResult.success && checkResult.data.inWatchlist) {
        Alert.alert('알림', '이미 관심종목에 추가된 종목입니다.');
        setAddedSymbols(prev => new Set([...prev, item.symbol]));
        return;
      }

      // 관심종목 추가
      const result = await addToWatchlist(user.uid, {
        symbol: item.symbol,
        name: item.name,
        nameKr: item.nameKr || item.name,
        type: item.type || 'crypto',
        exchange: item.exchange || '',
      });

      if (result.success) {
        setAddedSymbols(prev => new Set([...prev, item.symbol]));
        Alert.alert('추가 완료', `${item.symbol}이(가) 관심종목에 추가되었습니다.`);
      } else {
        Alert.alert('오류', result.error || '추가에 실패했습니다.');
      }
    } catch (error) {
      console.error('Add to watchlist error:', error);
      Alert.alert('오류', '관심종목 추가 중 오류가 발생했습니다.');
    } finally {
      setAddingSymbol(null);
    }
  };

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
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* 검색 입력 */}
      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={[styles.searchInputWrapper, { backgroundColor: colors.surfaceSecondary }]}>
          <Ionicons name="search" size={20} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="종목명 또는 심볼 검색"
            placeholderTextColor={colors.placeholder}
            value={searchQuery}
            onChangeText={handleSearch}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* 검색 중이거나 검색어가 있을 때 */}
        {searchQuery.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>검색 결과 ({searchResults.length})</Text>
            {isSearching ? (
              <View style={styles.loadingState}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>검색 중...</Text>
              </View>
            ) : searchResults.length > 0 ? (
              searchResults.map((item, index) => (
                <View
                  key={item.symbol + index}
                  style={[styles.resultItem, { backgroundColor: colors.card }]}
                >
                  <TouchableOpacity
                    style={styles.resultContent}
                    onPress={() => {
                      addToRecent(item.symbol);
                      navigation.navigate('StockDetail', { stock: { ...item, score: 75, change: 0 } });
                    }}
                  >
                    <View style={styles.resultLeft}>
                      <View style={[styles.resultIcon, {
                        backgroundColor: item.type === 'crypto' ? colors.primary : colors.success
                      }]}>
                        <Text style={styles.resultIconText}>{item.symbol?.charAt(0)}</Text>
                      </View>
                      <View>
                        <Text style={[styles.resultSymbol, { color: colors.text }]}>{item.symbol}</Text>
                        <Text style={[styles.resultName, { color: colors.textSecondary }]}>{item.name}</Text>
                      </View>
                    </View>
                    <Text style={[styles.exchangeText, { color: colors.textTertiary }]}>{item.exchange || item.type}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.addWatchlistButton, addedSymbols.has(item.symbol) && styles.addedButton]}
                    onPress={() => handleAddToWatchlist(item)}
                    disabled={addingSymbol === item.symbol || addedSymbols.has(item.symbol)}
                  >
                    {addingSymbol === item.symbol ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : addedSymbols.has(item.symbol) ? (
                      <Ionicons name="checkmark" size={20} color={colors.success} />
                    ) : (
                      <Ionicons name="add" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="search-outline" size={48} color={colors.textTertiary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>검색 결과가 없습니다</Text>
              </View>
            )}
          </View>
        ) : selectedCategory ? (
          /* 카테고리 선택 시 */
          <View style={styles.section}>
            <View style={styles.categoryHeader}>
              <TouchableOpacity onPress={() => setSelectedCategory(null)} style={styles.backButton}>
                <Ionicons name="arrow-back" size={20} color={colors.primary} />
                <Text style={[styles.backText, { color: colors.primary }]}>뒤로</Text>
              </TouchableOpacity>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {selectedCategory === 'crypto' ? '암호화폐' : selectedCategory === 'us' ? '미국 주식' : '한국 주식'}
              </Text>
            </View>
            {loadingCategory ? (
              <View style={styles.loadingState}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>데이터 로딩 중...</Text>
              </View>
            ) : (
              categoryData.map((item, index) => (
                <View
                  key={item.symbol + index}
                  style={[styles.resultItem, { backgroundColor: colors.card }]}
                >
                  <TouchableOpacity
                    style={styles.resultContent}
                    onPress={() => {
                      addToRecent(item.symbol);
                      navigation.navigate('StockDetail', { stock: { ...item, score: 75 } });
                    }}
                  >
                    <View style={styles.resultLeft}>
                      <View style={[styles.resultIcon, {
                        backgroundColor: item.type === 'crypto' ? colors.primary : colors.success
                      }]}>
                        <Text style={styles.resultIconText}>{item.symbol?.charAt(0)}</Text>
                      </View>
                      <View>
                        <Text style={[styles.resultSymbol, { color: colors.text }]}>{item.symbol}</Text>
                        <Text style={[styles.resultName, { color: colors.textSecondary }]}>{item.nameKr || item.name}</Text>
                      </View>
                    </View>
                    <View style={styles.resultRight}>
                      <Text style={[styles.priceText, { color: colors.text }]}>{formatPrice(item.price, item.type)}</Text>
                      <Text style={[styles.changeText, { color: (item.change || 0) >= 0 ? colors.success : colors.error }]}>
                        {(item.change || 0) >= 0 ? '+' : ''}{(item.change || 0).toFixed(2)}%
                      </Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.addWatchlistButton, addedSymbols.has(item.symbol) && styles.addedButton]}
                    onPress={() => handleAddToWatchlist(item)}
                    disabled={addingSymbol === item.symbol || addedSymbols.has(item.symbol)}
                  >
                    {addingSymbol === item.symbol ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : addedSymbols.has(item.symbol) ? (
                      <Ionicons name="checkmark" size={20} color={colors.success} />
                    ) : (
                      <Ionicons name="add" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        ) : (
          <>
            {/* 최근 검색어 */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>최근 검색</Text>
                <TouchableOpacity>
                  <Text style={[styles.clearText, { color: colors.textSecondary }]}>전체 삭제</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.tagsContainer}>
                {recentSearches.map((keyword, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.tag, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => handleSearch(keyword)}
                  >
                    <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                    <Text style={[styles.tagText, { color: colors.text }]}>{keyword}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 인기 검색어 */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>인기 검색어</Text>
              <View style={styles.tagsContainer}>
                {POPULAR_KEYWORDS.map((keyword, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.tag, { backgroundColor: colors.primaryBg, borderColor: colors.primaryLight }]}
                    onPress={() => handleSearch(keyword)}
                  >
                    <Text style={[styles.popularTagText, { color: colors.primary }]}>{keyword}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 카테고리 */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>카테고리</Text>
              <View style={styles.categoriesGrid}>
                <TouchableOpacity style={[styles.categoryCard, { backgroundColor: colors.card }]} onPress={() => handleCategoryPress('crypto')}>
                  <View style={[styles.categoryIcon, { backgroundColor: colors.primaryBg }]}>
                    <Ionicons name="logo-bitcoin" size={24} color={colors.primary} />
                  </View>
                  <Text style={[styles.categoryName, { color: colors.text }]}>암호화폐</Text>
                  <Text style={[styles.categoryCount, { color: colors.textSecondary }]}>TOP 20</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.categoryCard, { backgroundColor: colors.card }]} onPress={() => handleCategoryPress('us')}>
                  <View style={[styles.categoryIcon, { backgroundColor: colors.successBg }]}>
                    <Ionicons name="trending-up" size={24} color={colors.success} />
                  </View>
                  <Text style={[styles.categoryName, { color: colors.text }]}>미국 주식</Text>
                  <Text style={[styles.categoryCount, { color: colors.textSecondary }]}>TOP 10</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.categoryCard, { backgroundColor: colors.card }]} onPress={() => handleCategoryPress('kr')}>
                  <View style={[styles.categoryIcon, { backgroundColor: colors.warningBg }]}>
                    <Ionicons name="flag" size={24} color={colors.warning} />
                  </View>
                  <Text style={[styles.categoryName, { color: colors.text }]}>한국 주식</Text>
                  <Text style={[styles.categoryCount, { color: colors.textSecondary }]}>TOP 10</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.categoryCard, { backgroundColor: colors.card }]} onPress={() => navigation.navigate('Trending')}>
                  <View style={[styles.categoryIcon, { backgroundColor: colors.errorBg }]}>
                    <Ionicons name="flame" size={24} color={colors.error} />
                  </View>
                  <Text style={[styles.categoryName, { color: colors.text }]}>인기 급상승</Text>
                  <Text style={[styles.categoryCount, { color: colors.textSecondary }]}>실시간</Text>
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
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingLeft: 14,
    paddingRight: 8,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  resultContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resultLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  addWatchlistButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  addedButton: {
    backgroundColor: 'transparent',
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

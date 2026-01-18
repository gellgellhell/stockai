/**
 * 분석 화면
 * 종목 검색 및 AI 분석 요청
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// 인기 종목 리스트
const POPULAR_STOCKS = [
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'MSFT', name: 'Microsoft Corp.' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.' },
  { symbol: 'TSLA', name: 'Tesla Inc.' },
  { symbol: 'META', name: 'Meta Platforms' },
  { symbol: 'JPM', name: 'JPMorgan Chase' },
];

const AnalysisLevelCard = ({ level, title, description, features, selected, onSelect, disabled }) => (
  <TouchableOpacity
    style={[
      styles.levelCard,
      selected && styles.levelCardSelected,
      disabled && styles.levelCardDisabled,
    ]}
    onPress={onSelect}
    disabled={disabled}
  >
    <View style={styles.levelHeader}>
      <View style={[styles.levelBadge, selected && styles.levelBadgeSelected]}>
        <Text style={[styles.levelBadgeText, selected && styles.levelBadgeTextSelected]}>
          Level {level}
        </Text>
      </View>
      {selected && <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />}
    </View>
    <Text style={[styles.levelTitle, disabled && styles.levelTitleDisabled]}>{title}</Text>
    <Text style={styles.levelDescription}>{description}</Text>
    <View style={styles.levelFeatures}>
      {features.map((feature, index) => (
        <View key={index} style={styles.levelFeatureItem}>
          <Ionicons name="checkmark" size={16} color={disabled ? '#9CA3AF' : '#10B981'} />
          <Text style={[styles.levelFeatureText, disabled && styles.levelFeatureTextDisabled]}>
            {feature}
          </Text>
        </View>
      ))}
    </View>
    {disabled && (
      <View style={styles.upgradeTag}>
        <Ionicons name="lock-closed" size={12} color="#F59E0B" />
        <Text style={styles.upgradeTagText}>Pro 플랜 필요</Text>
      </View>
    )}
  </TouchableOpacity>
);

const AnalysisScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSymbol, setSelectedSymbol] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [analyzing, setAnalyzing] = useState(false);

  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
  }, []);

  const handleSelectStock = useCallback((stock) => {
    setSelectedSymbol(stock);
    setSearchQuery(stock.symbol);
  }, []);

  const handleAnalyze = useCallback(() => {
    if (!selectedSymbol) {
      Alert.alert('종목 선택', '분석할 종목을 선택해주세요.');
      return;
    }

    setAnalyzing(true);
    // 분석 API 호출 시뮬레이션
    setTimeout(() => {
      setAnalyzing(false);
      navigation.navigate('StockDetail', {
        symbol: selectedSymbol.symbol,
        name: selectedSymbol.name,
        analysisLevel: selectedLevel,
      });
    }, 2000);
  }, [selectedSymbol, selectedLevel, navigation]);

  const filteredStocks = POPULAR_STOCKS.filter(
    (stock) =>
      stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stock.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.title}>AI 분석</Text>
        <Text style={styles.subtitle}>종목을 선택하고 분석을 시작하세요</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 검색 */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="종목 검색 (예: AAPL, Tesla)"
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={handleSearch}
              autoCapitalize="characters"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>

          {/* 검색 결과 / 인기 종목 */}
          <View style={styles.stockList}>
            <Text style={styles.stockListTitle}>
              {searchQuery ? '검색 결과' : '인기 종목'}
            </Text>
            <View style={styles.stockGrid}>
              {filteredStocks.slice(0, 6).map((stock) => (
                <TouchableOpacity
                  key={stock.symbol}
                  style={[
                    styles.stockChip,
                    selectedSymbol?.symbol === stock.symbol && styles.stockChipSelected,
                  ]}
                  onPress={() => handleSelectStock(stock)}
                >
                  <Text
                    style={[
                      styles.stockChipSymbol,
                      selectedSymbol?.symbol === stock.symbol && styles.stockChipSymbolSelected,
                    ]}
                  >
                    {stock.symbol}
                  </Text>
                  <Text style={styles.stockChipName} numberOfLines={1}>
                    {stock.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* 분석 레벨 선택 */}
        <View style={styles.levelSection}>
          <Text style={styles.levelSectionTitle}>분석 레벨 선택</Text>

          <AnalysisLevelCard
            level={1}
            title="기본 분석"
            description="기술적 지표 기반 빠른 분석"
            features={['이동평균선', 'RSI / MACD', '지지/저항선']}
            selected={selectedLevel === 1}
            onSelect={() => setSelectedLevel(1)}
          />

          <AnalysisLevelCard
            level={2}
            title="심층 분석"
            description="패턴 인식 및 추세 분석"
            features={['차트 패턴 인식', '추세 분석', '거래량 분석']}
            selected={selectedLevel === 2}
            onSelect={() => setSelectedLevel(2)}
          />

          <AnalysisLevelCard
            level={3}
            title="AI 비전 분석"
            description="GPT-4 Vision 기반 고급 분석"
            features={['AI 차트 해석', '종합 시그널', '투자 전략 제안']}
            selected={selectedLevel === 3}
            onSelect={() => setSelectedLevel(3)}
            disabled={false} // Pro 플랜 체크 필요
          />
        </View>
      </ScrollView>

      {/* 분석 버튼 */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.analyzeButton, !selectedSymbol && styles.analyzeButtonDisabled]}
          onPress={handleAnalyze}
          disabled={!selectedSymbol || analyzing}
        >
          {analyzing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="analytics" size={20} color="#FFFFFF" />
              <Text style={styles.analyzeButtonText}>
                {selectedSymbol ? `${selectedSymbol.symbol} 분석 시작` : '종목을 선택하세요'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  searchSection: {
    marginTop: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
  },
  stockList: {
    marginTop: 16,
  },
  stockListTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 12,
  },
  stockGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  stockChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  stockChipSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  stockChipSymbol: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  stockChipSymbolSelected: {
    color: '#3B82F6',
  },
  stockChipName: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
    maxWidth: 80,
  },
  levelSection: {
    marginTop: 24,
    marginBottom: 100,
  },
  levelSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  levelCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  levelCardSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#FAFBFF',
  },
  levelCardDisabled: {
    opacity: 0.7,
  },
  levelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  levelBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  levelBadgeSelected: {
    backgroundColor: '#DBEAFE',
  },
  levelBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  levelBadgeTextSelected: {
    color: '#3B82F6',
  },
  levelTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  levelTitleDisabled: {
    color: '#9CA3AF',
  },
  levelDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  levelFeatures: {
    gap: 6,
  },
  levelFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  levelFeatureText: {
    fontSize: 13,
    color: '#374151',
  },
  levelFeatureTextDisabled: {
    color: '#9CA3AF',
  },
  upgradeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  upgradeTagText: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '500',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3B82F6',
    borderRadius: 14,
    paddingVertical: 16,
  },
  analyzeButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  analyzeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default AnalysisScreen;

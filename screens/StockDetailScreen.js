/**
 * 종목 상세 화면
 * 분석 결과 및 종목 정보 표시
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// 분석 결과 카드
const AnalysisCard = ({ title, icon, color, children }) => (
  <View style={styles.analysisCard}>
    <View style={styles.analysisCardHeader}>
      <View style={[styles.analysisCardIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.analysisCardTitle}>{title}</Text>
    </View>
    {children}
  </View>
);

// 시그널 배지
const SignalBadge = ({ signal }) => {
  const config = {
    buy: { color: '#10B981', bgColor: '#ECFDF5', text: '매수', icon: 'trending-up' },
    sell: { color: '#EF4444', bgColor: '#FEF2F2', text: '매도', icon: 'trending-down' },
    hold: { color: '#F59E0B', bgColor: '#FFFBEB', text: '관망', icon: 'remove' },
  };

  const { color, bgColor, text, icon } = config[signal] || config.hold;

  return (
    <View style={[styles.signalBadge, { backgroundColor: bgColor }]}>
      <Ionicons name={icon} size={16} color={color} />
      <Text style={[styles.signalText, { color }]}>{text}</Text>
    </View>
  );
};

const StockDetailScreen = ({ navigation, route }) => {
  const { symbol = 'AAPL', name = 'Apple Inc.', analysisLevel = 1 } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [analysisData, setAnalysisData] = useState(null);

  // 분석 데이터 로드 시뮬레이션
  useEffect(() => {
    const loadAnalysis = async () => {
      setLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 1500));

      setAnalysisData({
        price: 182.52,
        change: 2.34,
        changePercent: 1.30,
        signal: 'buy',
        confidence: 78,
        summary: 'AAPL은 현재 상승 추세에 있으며, 기술적 지표들이 긍정적인 신호를 보내고 있습니다. 단기적으로 추가 상승 여력이 있어 보입니다.',
        technicals: {
          rsi: { value: 58.2, signal: '중립' },
          macd: { value: 1.24, signal: '매수' },
          ma20: { value: 178.50, signal: '지지' },
          ma50: { value: 175.20, signal: '지지' },
        },
        supportResistance: {
          support1: 180.00,
          support2: 175.50,
          resistance1: 185.00,
          resistance2: 190.00,
        },
        patterns: ['상승 삼각형', '골든 크로스 형성 중'],
      });
      setLoading(false);
    };

    loadAnalysis();
  }, [symbol]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{symbol}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Level {analysisLevel} 분석 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{symbol}</Text>
        <TouchableOpacity style={styles.starButton}>
          <Ionicons name="star-outline" size={24} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 가격 정보 */}
        <View style={styles.priceSection}>
          <Text style={styles.stockName}>{name}</Text>
          <Text style={styles.price}>${analysisData.price.toFixed(2)}</Text>
          <View style={styles.changeContainer}>
            <Ionicons
              name={analysisData.change >= 0 ? 'caret-up' : 'caret-down'}
              size={16}
              color={analysisData.change >= 0 ? '#10B981' : '#EF4444'}
            />
            <Text
              style={[
                styles.changeText,
                { color: analysisData.change >= 0 ? '#10B981' : '#EF4444' },
              ]}
            >
              ${Math.abs(analysisData.change).toFixed(2)} ({analysisData.changePercent.toFixed(2)}%)
            </Text>
          </View>
        </View>

        {/* 분석 시그널 */}
        <View style={styles.signalSection}>
          <Text style={styles.signalLabel}>AI 분석 결과</Text>
          <View style={styles.signalRow}>
            <SignalBadge signal={analysisData.signal} />
            <View style={styles.confidenceContainer}>
              <Text style={styles.confidenceLabel}>신뢰도</Text>
              <Text style={styles.confidenceValue}>{analysisData.confidence}%</Text>
            </View>
          </View>
        </View>

        {/* 분석 요약 */}
        <AnalysisCard title="분석 요약" icon="analytics" color="#8B5CF6">
          <Text style={styles.summaryText}>{analysisData.summary}</Text>
        </AnalysisCard>

        {/* 기술적 지표 */}
        <AnalysisCard title="기술적 지표" icon="stats-chart" color="#3B82F6">
          <View style={styles.technicalGrid}>
            {Object.entries(analysisData.technicals).map(([key, data]) => (
              <View key={key} style={styles.technicalItem}>
                <Text style={styles.technicalLabel}>{key.toUpperCase()}</Text>
                <Text style={styles.technicalValue}>{data.value}</Text>
                <Text style={[styles.technicalSignal, { color: '#6B7280' }]}>{data.signal}</Text>
              </View>
            ))}
          </View>
        </AnalysisCard>

        {/* 지지/저항선 */}
        <AnalysisCard title="지지/저항선" icon="git-commit" color="#10B981">
          <View style={styles.srGrid}>
            <View style={styles.srColumn}>
              <Text style={styles.srTitle}>저항선</Text>
              <Text style={styles.srValue}>${analysisData.supportResistance.resistance2}</Text>
              <Text style={styles.srValue}>${analysisData.supportResistance.resistance1}</Text>
            </View>
            <View style={styles.srDivider} />
            <View style={styles.srColumn}>
              <Text style={styles.srTitle}>지지선</Text>
              <Text style={styles.srValue}>${analysisData.supportResistance.support1}</Text>
              <Text style={styles.srValue}>${analysisData.supportResistance.support2}</Text>
            </View>
          </View>
        </AnalysisCard>

        {/* 패턴 인식 */}
        <AnalysisCard title="패턴 인식" icon="shapes" color="#F59E0B">
          <View style={styles.patternList}>
            {analysisData.patterns.map((pattern, index) => (
              <View key={index} style={styles.patternItem}>
                <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                <Text style={styles.patternText}>{pattern}</Text>
              </View>
            ))}
          </View>
        </AnalysisCard>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* 하단 액션 버튼 */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.alertButton}>
          <Ionicons name="notifications-outline" size={20} color="#3B82F6" />
          <Text style={styles.alertButtonText}>가격 알림</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.shareButton}>
          <Ionicons name="share-outline" size={20} color="#FFFFFF" />
          <Text style={styles.shareButtonText}>공유</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  starButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  priceSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  stockName: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  price: {
    fontSize: 36,
    fontWeight: '700',
    color: '#1F2937',
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  changeText: {
    fontSize: 16,
    fontWeight: '500',
  },
  signalSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  signalLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  signalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  signalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  signalText: {
    fontSize: 16,
    fontWeight: '600',
  },
  confidenceContainer: {
    alignItems: 'flex-end',
  },
  confidenceLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  confidenceValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  analysisCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  analysisCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  analysisCardIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  analysisCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  summaryText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
  },
  technicalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  technicalItem: {
    width: '47%',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
  },
  technicalLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  technicalValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 4,
  },
  technicalSignal: {
    fontSize: 12,
    marginTop: 2,
  },
  srGrid: {
    flexDirection: 'row',
  },
  srColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  srDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 16,
  },
  srTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 4,
  },
  srValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  patternList: {
    gap: 8,
  },
  patternItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  patternText: {
    fontSize: 14,
    color: '#374151',
  },
  bottomPadding: {
    height: 100,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  alertButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  alertButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3B82F6',
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
  },
  shareButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default StockDetailScreen;

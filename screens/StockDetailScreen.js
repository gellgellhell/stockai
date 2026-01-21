/**
 * 종목 상세 화면
 * 분석 결과 및 종목 정보 표시
 * 시간대별 점수 표시 기능 포함
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
import { getQuickScore, getScoreColor as getScoreColorFromService } from '../services/aiAnalysis';

// 점수에 따른 색상 반환
const getScoreColor = (score) => {
  if (score === undefined || score === null) return '#6B7280';
  if (score >= 70) return '#10B981';
  if (score >= 40) return '#F59E0B';
  return '#EF4444';
};

// 시간대 옵션
const TIMEFRAMES = [
  { id: '1h', label: '1시간', description: '단기' },
  { id: '4h', label: '4시간', description: '중단기' },
  { id: '1d', label: '1일', description: '중기' },
  { id: '1w', label: '1주', description: '장기' },
];

// 시간대 선택 탭
const TimeframeSelector = ({ selected, onSelect, loading }) => (
  <View style={styles.timeframeContainer}>
    <Text style={styles.timeframeTitle}>분석 시간대</Text>
    <View style={styles.timeframeTabs}>
      {TIMEFRAMES.map((tf) => (
        <TouchableOpacity
          key={tf.id}
          style={[
            styles.timeframeTab,
            selected === tf.id && styles.timeframeTabActive,
          ]}
          onPress={() => onSelect(tf.id)}
          disabled={loading}
        >
          <Text
            style={[
              styles.timeframeTabText,
              selected === tf.id && styles.timeframeTabTextActive,
            ]}
          >
            {tf.label}
          </Text>
          <Text
            style={[
              styles.timeframeTabDesc,
              selected === tf.id && styles.timeframeTabDescActive,
            ]}
          >
            {tf.description}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

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
  const { symbol = 'AAPL', name = 'Apple Inc.', analysisLevel = 1, type = 'stock' } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [analysisData, setAnalysisData] = useState(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState('1d');
  const [timeframeScores, setTimeframeScores] = useState({});
  const [timeframeLoading, setTimeframeLoading] = useState(false);

  // 시간대별 점수 가져오기
  const fetchTimeframeScore = async (timeframe) => {
    try {
      setTimeframeLoading(true);
      const result = await getQuickScore(symbol, type, timeframe);
      setTimeframeScores((prev) => ({
        ...prev,
        [timeframe]: result,
      }));

      // 현재 선택된 시간대면 분석 데이터 업데이트
      if (timeframe === selectedTimeframe) {
        updateAnalysisWithScore(result);
      }
    } catch (error) {
      console.error('Timeframe score error:', error);
    } finally {
      setTimeframeLoading(false);
    }
  };

  // 점수 데이터로 분석 데이터 업데이트
  const updateAnalysisWithScore = (scoreData) => {
    if (!scoreData) return;

    setAnalysisData((prev) => ({
      ...prev,
      confidence: scoreData.score || prev?.confidence || 50,
      signal: getSignalFromScore(scoreData.score),
      price: scoreData.price || prev?.price || 0,
      change: scoreData.change24h || prev?.change || 0,
      changePercent: scoreData.changePercent || prev?.changePercent || 0,
    }));
  };

  // 점수로 시그널 결정
  const getSignalFromScore = (score) => {
    if (score >= 60) return 'buy';
    if (score <= 40) return 'sell';
    return 'hold';
  };

  // 시간대 변경 핸들러
  const handleTimeframeChange = (timeframe) => {
    setSelectedTimeframe(timeframe);

    // 캐시된 데이터가 있으면 사용, 없으면 새로 fetch
    if (timeframeScores[timeframe]) {
      updateAnalysisWithScore(timeframeScores[timeframe]);
    } else {
      fetchTimeframeScore(timeframe);
    }
  };

  // 초기 분석 데이터 로드
  useEffect(() => {
    const loadAnalysis = async () => {
      setLoading(true);

      // 기본 분석 데이터 설정
      setAnalysisData({
        price: 0,
        change: 0,
        changePercent: 0,
        signal: 'hold',
        confidence: 50,
        summary: `${symbol}의 ${TIMEFRAMES.find(t => t.id === selectedTimeframe)?.label || '1일'} 기준 AI 분석 결과입니다.`,
        technicals: {
          rsi: { value: 50, signal: '중립' },
          macd: { value: 0, signal: '중립' },
          ma20: { value: 0, signal: '중립' },
          ma50: { value: 0, signal: '중립' },
        },
        supportResistance: {
          support1: 0,
          support2: 0,
          resistance1: 0,
          resistance2: 0,
        },
        patterns: [],
      });

      // 모든 시간대의 점수를 병렬로 가져오기
      try {
        const promises = TIMEFRAMES.map((tf) =>
          getQuickScore(symbol, type, tf.id).then((result) => ({
            timeframe: tf.id,
            data: result,
          }))
        );

        const results = await Promise.all(promises);
        const scoresMap = {};
        results.forEach(({ timeframe, data }) => {
          scoresMap[timeframe] = data;
        });
        setTimeframeScores(scoresMap);

        // 선택된 시간대 점수로 업데이트
        if (scoresMap[selectedTimeframe]) {
          updateAnalysisWithScore(scoresMap[selectedTimeframe]);
        }
      } catch (error) {
        console.error('Load analysis error:', error);
      }

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

        {/* 시간대 선택 */}
        <TimeframeSelector
          selected={selectedTimeframe}
          onSelect={handleTimeframeChange}
          loading={timeframeLoading}
        />

        {/* 시간대별 점수 미리보기 */}
        <View style={styles.timeframeScoresPreview}>
          {TIMEFRAMES.map((tf) => {
            const score = timeframeScores[tf.id]?.score;
            const isSelected = selectedTimeframe === tf.id;
            return (
              <View
                key={tf.id}
                style={[
                  styles.scorePreviewItem,
                  isSelected && styles.scorePreviewItemActive,
                ]}
              >
                <Text style={styles.scorePreviewLabel}>{tf.label}</Text>
                <Text
                  style={[
                    styles.scorePreviewValue,
                    { color: getScoreColor(score) },
                  ]}
                >
                  {score !== undefined ? score : '-'}
                </Text>
              </View>
            );
          })}
        </View>

        {/* 분석 시그널 */}
        <View style={styles.signalSection}>
          <View style={styles.signalLabelRow}>
            <Text style={styles.signalLabel}>AI 분석 결과</Text>
            <View style={styles.timeframeBadge}>
              <Ionicons name="time-outline" size={12} color="#3B82F6" />
              <Text style={styles.timeframeBadgeText}>
                {TIMEFRAMES.find((t) => t.id === selectedTimeframe)?.label || '1일'} 기준
              </Text>
            </View>
          </View>
          <View style={styles.signalRow}>
            <SignalBadge signal={analysisData.signal} />
            <View style={styles.confidenceContainer}>
              <Text style={styles.confidenceLabel}>점수</Text>
              <Text style={[styles.confidenceValue, { color: getScoreColor(analysisData.confidence) }]}>
                {analysisData.confidence}
              </Text>
            </View>
          </View>
          {timeframeLoading && (
            <View style={styles.timeframeLoadingOverlay}>
              <ActivityIndicator size="small" color="#3B82F6" />
            </View>
          )}
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
  // 시간대 선택 스타일
  timeframeContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  timeframeTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 12,
  },
  timeframeTabs: {
    flexDirection: 'row',
    gap: 8,
  },
  timeframeTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  timeframeTabActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  timeframeTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  timeframeTabTextActive: {
    color: '#3B82F6',
  },
  timeframeTabDesc: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
  },
  timeframeTabDescActive: {
    color: '#60A5FA',
  },
  // 시간대별 점수 미리보기
  timeframeScoresPreview: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  scorePreviewItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  scorePreviewItemActive: {
    backgroundColor: '#EFF6FF',
  },
  scorePreviewLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 4,
  },
  scorePreviewValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  // 분석 시그널 섹션
  signalSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    position: 'relative',
  },
  signalLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  signalLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  timeframeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  timeframeBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#3B82F6',
  },
  timeframeLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
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

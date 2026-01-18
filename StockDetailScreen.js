import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

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

export default function StockDetailScreen({ route }) {
  const { stock } = route.params;
  const [selectedPeriod, setSelectedPeriod] = useState('1D');
  const [isFavorite, setIsFavorite] = useState(true);

  const periods = ['1D', '1W', '1M', '3M', '1Y'];

  const analysisData = {
    technicalScore: 75,
    trendScore: 68,
    volumeScore: 82,
    momentumScore: 71,
    signals: [
      { type: 'positive', text: 'MACD 골든크로스 형성' },
      { type: 'positive', text: '20일 이동평균선 상향 돌파' },
      { type: 'neutral', text: 'RSI 65 - 과매수 구간 근접' },
      { type: 'negative', text: '상단 저항선 근접' },
    ],
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* 상단 가격 정보 */}
      <View style={styles.priceCard}>
        <View style={styles.priceHeader}>
          <View style={styles.stockInfo}>
            <View style={[styles.stockIcon, { 
              backgroundColor: stock.type === 'crypto' ? '#3B82F6' : '#10B981' 
            }]}>
              <Text style={styles.stockIconText}>{stock.symbol.charAt(0)}</Text>
            </View>
            <View>
              <Text style={styles.stockSymbol}>{stock.symbol}</Text>
              <Text style={styles.stockName}>{stock.name}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => setIsFavorite(!isFavorite)}>
            <Ionicons 
              name={isFavorite ? 'star' : 'star-outline'} 
              size={24} 
              color={isFavorite ? '#F59E0B' : '#9CA3AF'} 
            />
          </TouchableOpacity>
        </View>

        <Text style={styles.currentPrice}>{stock.price.toLocaleString()} USD</Text>
        <View style={styles.changeRow}>
          <Text style={[styles.changeText, { color: stock.change >= 0 ? '#10B981' : '#EF4444' }]}>
            {stock.change >= 0 ? '+' : ''}{stock.change}%
          </Text>
          <Text style={styles.changeLabel}>최고 연 0.00%</Text>
        </View>
      </View>

      {/* 차트 영역 */}
      <View style={styles.chartCard}>
        <View style={styles.periodSelector}>
          {periods.map((period) => (
            <TouchableOpacity
              key={period}
              style={[styles.periodButton, selectedPeriod === period && styles.periodButtonActive]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text style={[styles.periodText, selectedPeriod === period && styles.periodTextActive]}>
                {period}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 차트 플레이스홀더 */}
        <View style={styles.chartPlaceholder}>
          <View style={styles.chartLine} />
          <View style={styles.chartArea} />
        </View>

        <View style={styles.chartLabels}>
          <Text style={styles.chartLabel}>Aug</Text>
          <Text style={styles.chartLabel}>Oct</Text>
          <Text style={styles.chartLabel}>Dec</Text>
          <Text style={styles.chartLabel}>Feb</Text>
          <Text style={styles.chartLabel}>Apr</Text>
          <Text style={styles.chartLabel}>Jun</Text>
        </View>
      </View>

      {/* AI 분석 점수 */}
      <View style={styles.scoreCard}>
        <View style={styles.scoreHeader}>
          <Text style={styles.scoreTitle}>AI 분석 점수</Text>
          <View style={[styles.mainScoreBadge, { backgroundColor: getScoreColor(stock.score) }]}>
            <Text style={styles.mainScoreText}>{stock.score}</Text>
          </View>
        </View>
        
        <View style={[styles.scoreGradeBadge, { backgroundColor: getScoreColor(stock.score) + '15' }]}>
          <Text style={[styles.scoreGradeText, { color: getScoreColor(stock.score) }]}>
            {getScoreLabel(stock.score)}
          </Text>
        </View>

        {/* 세부 점수 */}
        <View style={styles.subScores}>
          {[
            { label: '기술적 분석', score: analysisData.technicalScore },
            { label: '추세', score: analysisData.trendScore },
            { label: '거래량', score: analysisData.volumeScore },
            { label: '모멘텀', score: analysisData.momentumScore },
          ].map((item, index) => (
            <View key={index} style={styles.subScoreItem}>
              <View style={styles.subScoreHeader}>
                <Text style={styles.subScoreLabel}>{item.label}</Text>
                <Text style={[styles.subScoreValue, { color: getScoreColor(item.score) }]}>
                  {item.score}
                </Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { 
                  width: `${item.score}%`, 
                  backgroundColor: getScoreColor(item.score) 
                }]} />
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* 주요 시그널 */}
      <View style={styles.signalsCard}>
        <Text style={styles.signalsTitle}>주요 시그널</Text>
        {analysisData.signals.map((signal, index) => (
          <View key={index} style={styles.signalItem}>
            <View style={[styles.signalDot, {
              backgroundColor: signal.type === 'positive' ? '#10B981' : 
                              signal.type === 'negative' ? '#EF4444' : '#F59E0B'
            }]} />
            <Text style={styles.signalText}>{signal.text}</Text>
          </View>
        ))}
      </View>

      {/* 면책 조항 */}
      <View style={styles.disclaimer}>
        <Ionicons name="information-circle-outline" size={16} color="#9CA3AF" />
        <Text style={styles.disclaimerText}>
          이 정보는 투자 조언이 아니며, 투자 결정은 본인의 판단과 책임 하에 이루어져야 합니다.
        </Text>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  priceCard: {
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
  priceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  stockInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stockIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stockIconText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  stockSymbol: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  stockName: {
    fontSize: 14,
    color: '#6B7280',
  },
  currentPrice: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  changeText: {
    fontSize: 16,
    fontWeight: '600',
  },
  changeLabel: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 4,
    marginBottom: 20,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  periodButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  periodText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  periodTextActive: {
    color: '#3B82F6',
  },
  chartPlaceholder: {
    height: 180,
    position: 'relative',
    justifyContent: 'flex-end',
  },
  chartLine: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#3B82F6',
    borderRadius: 1,
  },
  chartArea: {
    height: 100,
    backgroundColor: '#EFF6FF',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  chartLabel: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  scoreCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
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
  scoreTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  mainScoreBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainScoreText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  scoreGradeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 20,
  },
  scoreGradeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  subScores: {
    gap: 16,
  },
  subScoreItem: {},
  subScoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  subScoreLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  subScoreValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  signalsCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  signalsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  signalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  signalDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  signalText: {
    fontSize: 14,
    color: '#374151',
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: 16,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    gap: 8,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    color: '#9CA3AF',
    lineHeight: 18,
  },
});

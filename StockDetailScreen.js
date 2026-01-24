import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from './ThemeContext';
import { useAuth } from './AuthContext';
import { getTimeframeComparison } from './services/aiAnalysis';
import { checkWatchlist, addToWatchlist, removeFromWatchlist } from './services/watchlistService';

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
  const { theme } = useTheme();
  const colors = theme.colors;
  const { user } = useAuth();
  const { stock } = route.params;
  const [selectedPeriod, setSelectedPeriod] = useState('1D');
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(true);
  const [timeframeScores, setTimeframeScores] = useState(null);
  const [loadingScores, setLoadingScores] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState('mediumTerm'); // shortTerm, mediumTerm, longTerm

  const periods = ['1D', '1W', '1M', '3M', '1Y'];
  const timeframeTabs = [
    { key: 'shortTerm', label: '1H', fullLabel: '1시간' },
    { key: 'mediumTerm', label: '1D', fullLabel: '1일' },
    { key: 'longTerm', label: '1W', fullLabel: '1주' },
  ];

  // 관심종목 여부 확인
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      if (!user?.uid) {
        setFavoriteLoading(false);
        return;
      }
      try {
        const result = await checkWatchlist(user.uid, stock.symbol);
        if (result.success) {
          setIsFavorite(result.data.inWatchlist);
        }
      } catch (error) {
        console.error('Failed to check watchlist:', error);
      } finally {
        setFavoriteLoading(false);
      }
    };
    checkFavoriteStatus();
  }, [user?.uid, stock.symbol]);

  // 타임프레임별 점수 가져오기
  useEffect(() => {
    const fetchTimeframeScores = async () => {
      setLoadingScores(true);
      try {
        const data = await getTimeframeComparison(
          stock.symbol,
          stock.type || 'crypto',
          1
        );
        setTimeframeScores(data);
      } catch (error) {
        console.error('Failed to fetch timeframe scores:', error);
      } finally {
        setLoadingScores(false);
      }
    };
    fetchTimeframeScores();
  }, [stock.symbol, stock.type]);

  // 관심종목 토글 핸들러
  const handleToggleFavorite = async () => {
    if (!user?.uid) {
      Alert.alert('로그인 필요', '관심종목 기능을 사용하려면 로그인이 필요합니다.');
      return;
    }

    setFavoriteLoading(true);
    try {
      if (isFavorite) {
        // 관심종목에서 삭제
        const result = await removeFromWatchlist(user.uid, stock.symbol);
        if (result.success) {
          setIsFavorite(false);
          Alert.alert('삭제 완료', '관심종목에서 삭제되었습니다.');
        } else {
          Alert.alert('오류', result.error || '삭제에 실패했습니다.');
        }
      } else {
        // 관심종목에 추가
        const result = await addToWatchlist(user.uid, {
          symbol: stock.symbol,
          name: stock.name,
          nameKr: stock.nameKr || stock.name,
          type: stock.type || 'crypto',
        });
        if (result.success) {
          setIsFavorite(true);
          Alert.alert('추가 완료', '관심종목에 추가되었습니다.');
        } else {
          Alert.alert('오류', result.error || '추가에 실패했습니다.');
        }
      }
    } catch (error) {
      console.error('Toggle favorite error:', error);
      Alert.alert('오류', '처리 중 오류가 발생했습니다.');
    } finally {
      setFavoriteLoading(false);
    }
  };

  // 현재 선택된 타임프레임의 점수
  const currentTimeframeScore = timeframeScores?.comparison?.[selectedTimeframe]?.score || stock.score || 50;
  const currentTimeframeLabel = timeframeTabs.find(t => t.key === selectedTimeframe)?.fullLabel || '1일';

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
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      {/* 상단 가격 정보 */}
      <View style={[styles.priceCard, { backgroundColor: colors.card }]}>
        <View style={styles.priceHeader}>
          <View style={styles.stockInfo}>
            <View style={[styles.stockIcon, {
              backgroundColor: stock.type === 'crypto' ? colors.primary : colors.success
            }]}>
              <Text style={styles.stockIconText}>{stock.symbol.charAt(0)}</Text>
            </View>
            <View>
              <Text style={[styles.stockSymbol, { color: colors.text }]}>{stock.symbol}</Text>
              <Text style={[styles.stockName, { color: colors.textSecondary }]}>{stock.name}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleToggleFavorite} disabled={favoriteLoading}>
            {favoriteLoading ? (
              <ActivityIndicator size="small" color={colors.warning} />
            ) : (
              <Ionicons
                name={isFavorite ? 'star' : 'star-outline'}
                size={24}
                color={isFavorite ? colors.warning : colors.textTertiary}
              />
            )}
          </TouchableOpacity>
        </View>

        <Text style={[styles.currentPrice, { color: colors.text }]}>{stock.price.toLocaleString()} USD</Text>
        <View style={styles.changeRow}>
          <Text style={[styles.changeText, { color: stock.change >= 0 ? colors.success : colors.error }]}>
            {stock.change >= 0 ? '+' : ''}{stock.change}%
          </Text>
          <Text style={[styles.changeLabel, { color: colors.textTertiary }]}>최고 연 0.00%</Text>
        </View>
      </View>

      {/* 차트 영역 */}
      <View style={[styles.chartCard, { backgroundColor: colors.card }]}>
        <View style={[styles.periodSelector, { backgroundColor: colors.surfaceSecondary }]}>
          {periods.map((period) => (
            <TouchableOpacity
              key={period}
              style={[styles.periodButton, selectedPeriod === period && [styles.periodButtonActive, { backgroundColor: colors.card }]]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text style={[styles.periodText, { color: colors.textSecondary }, selectedPeriod === period && { color: colors.primary }]}>
                {period}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 차트 플레이스홀더 */}
        <View style={styles.chartPlaceholder}>
          <View style={[styles.chartLine, { backgroundColor: colors.primary }]} />
          <View style={[styles.chartArea, { backgroundColor: colors.primaryBg }]} />
        </View>

        <View style={styles.chartLabels}>
          <Text style={[styles.chartLabel, { color: colors.textTertiary }]}>Aug</Text>
          <Text style={[styles.chartLabel, { color: colors.textTertiary }]}>Oct</Text>
          <Text style={[styles.chartLabel, { color: colors.textTertiary }]}>Dec</Text>
          <Text style={[styles.chartLabel, { color: colors.textTertiary }]}>Feb</Text>
          <Text style={[styles.chartLabel, { color: colors.textTertiary }]}>Apr</Text>
          <Text style={[styles.chartLabel, { color: colors.textTertiary }]}>Jun</Text>
        </View>
      </View>

      {/* AI 분석 점수 */}
      <View style={[styles.scoreCard, { backgroundColor: colors.card }]}>
        <View style={styles.scoreHeader}>
          <Text style={[styles.scoreTitle, { color: colors.text }]}>AI 분석 점수</Text>
          {loadingScores ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <View style={[styles.mainScoreBadge, { backgroundColor: getScoreColor(currentTimeframeScore) }]}>
              <Text style={styles.mainScoreText}>{currentTimeframeScore}</Text>
            </View>
          )}
        </View>

        {/* 타임프레임 선택 탭 */}
        <View style={[styles.timeframeSelector, { backgroundColor: colors.surfaceSecondary }]}>
          {timeframeTabs.map((tf) => {
            const tfScore = timeframeScores?.comparison?.[tf.key]?.score;
            const isSelected = selectedTimeframe === tf.key;
            return (
              <TouchableOpacity
                key={tf.key}
                style={[
                  styles.timeframeTab,
                  isSelected && [styles.timeframeTabActive, { backgroundColor: colors.card }]
                ]}
                onPress={() => setSelectedTimeframe(tf.key)}
              >
                <Text style={[
                  styles.timeframeLabel,
                  { color: colors.textSecondary },
                  isSelected && { color: colors.primary, fontWeight: '700' }
                ]}>
                  {tf.label}
                </Text>
                {tfScore !== undefined && (
                  <Text style={[
                    styles.timeframeScore,
                    { color: getScoreColor(tfScore) },
                    isSelected && { fontWeight: '700' }
                  ]}>
                    {tfScore}점
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 선택된 타임프레임 정보 */}
        <View style={styles.timeframeInfo}>
          <Text style={[styles.timeframeInfoText, { color: colors.textSecondary }]}>
            기준: {currentTimeframeLabel} 데이터
          </Text>
          {timeframeScores?.trend && (
            <View style={[styles.trendBadge, {
              backgroundColor: timeframeScores.trend === '상승세' ? colors.success + '20' :
                             timeframeScores.trend === '하락세' ? colors.error + '20' :
                             colors.warning + '20'
            }]}>
              <Ionicons
                name={timeframeScores.trend === '상승세' ? 'trending-up' :
                      timeframeScores.trend === '하락세' ? 'trending-down' : 'remove'}
                size={14}
                color={timeframeScores.trend === '상승세' ? colors.success :
                       timeframeScores.trend === '하락세' ? colors.error : colors.warning}
              />
              <Text style={[styles.trendText, {
                color: timeframeScores.trend === '상승세' ? colors.success :
                       timeframeScores.trend === '하락세' ? colors.error : colors.warning
              }]}>
                {timeframeScores.trend}
              </Text>
            </View>
          )}
        </View>

        <View style={[styles.scoreGradeBadge, { backgroundColor: getScoreColor(currentTimeframeScore) + '15' }]}>
          <Text style={[styles.scoreGradeText, { color: getScoreColor(currentTimeframeScore) }]}>
            {getScoreLabel(currentTimeframeScore)}
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
                <Text style={[styles.subScoreLabel, { color: colors.textSecondary }]}>{item.label}</Text>
                <Text style={[styles.subScoreValue, { color: getScoreColor(item.score) }]}>
                  {item.score}
                </Text>
              </View>
              <View style={[styles.progressBar, { backgroundColor: colors.surfaceSecondary }]}>
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
      <View style={[styles.signalsCard, { backgroundColor: colors.card }]}>
        <Text style={[styles.signalsTitle, { color: colors.text }]}>주요 시그널</Text>
        {analysisData.signals.map((signal, index) => (
          <View key={index} style={[styles.signalItem, { borderBottomColor: colors.border }]}>
            <View style={[styles.signalDot, {
              backgroundColor: signal.type === 'positive' ? colors.success :
                              signal.type === 'negative' ? colors.error : colors.warning
            }]} />
            <Text style={[styles.signalText, { color: colors.text }]}>{signal.text}</Text>
          </View>
        ))}
      </View>

      {/* 면책 조항 */}
      <View style={[styles.disclaimer, { backgroundColor: colors.surfaceSecondary }]}>
        <Ionicons name="information-circle-outline" size={16} color={colors.textTertiary} />
        <Text style={[styles.disclaimerText, { color: colors.textTertiary }]}>
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
  timeframeSelector: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 4,
    marginBottom: 12,
  },
  timeframeTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    gap: 2,
  },
  timeframeTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  timeframeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  timeframeScore: {
    fontSize: 12,
    fontWeight: '500',
  },
  timeframeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  timeframeInfoText: {
    fontSize: 13,
    color: '#6B7280',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  trendText: {
    fontSize: 12,
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

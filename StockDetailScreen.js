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
import { getQuickScore } from './services/aiAnalysis';
import { checkWatchlist, addToWatchlist, removeFromWatchlist } from './services/watchlistService';
import { getRefreshStatus, useRefresh } from './services/refreshLimitService';

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

// 경과 시간 표시 함수
const getTimeAgo = (timestamp) => {
  if (!timestamp) return null;

  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  return `${days}일 전`;
};

export default function StockDetailScreen({ route }) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const { user } = useAuth();
  const { stock } = route.params;
  const [selectedPeriod, setSelectedPeriod] = useState('1D');
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState('mediumTerm'); // shortTerm, mediumTerm, longTerm

  // 각 타임프레임별 개별 상태 관리
  const [timeframeData, setTimeframeData] = useState({
    shortTerm: { score: null, loaded: false, loading: false, lastRefreshed: null },
    mediumTerm: { score: null, loaded: false, loading: false, lastRefreshed: null },
    longTerm: { score: null, loaded: false, loading: false, lastRefreshed: null },
  });

  // 새로고침 제한 상태
  const [refreshStatus, setRefreshStatus] = useState({
    used: 0,
    limit: 5,
    remaining: 5,
    canRefresh: true,
  });

  // 경과 시간 업데이트를 위한 리렌더링
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      forceUpdate(n => n + 1);
    }, 60000); // 1분마다 업데이트
    return () => clearInterval(interval);
  }, []);

  // 새로고침 상태 초기화
  useEffect(() => {
    const loadRefreshStatus = async () => {
      const status = await getRefreshStatus(false); // TODO: 프리미엄 여부 확인
      setRefreshStatus(status);
    };
    loadRefreshStatus();
  }, []);

  const periods = ['1D', '1W', '1M', '3M', '1Y'];
  const timeframeTabs = [
    { key: 'shortTerm', label: '1H', fullLabel: '1시간', apiTimeframe: '1h' },
    { key: 'mediumTerm', label: '1D', fullLabel: '1일', apiTimeframe: '1d' },
    { key: 'longTerm', label: '1W', fullLabel: '1주', apiTimeframe: '1w' },
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

  // 개별 타임프레임 새로고침 함수
  const refreshTimeframe = async (timeframeKey) => {
    const tab = timeframeTabs.find(t => t.key === timeframeKey);
    if (!tab) return;

    // 새로고침 제한 확인 및 차감
    const refreshResult = await useRefresh(false); // TODO: 프리미엄 여부 확인
    if (!refreshResult.success) {
      Alert.alert(
        '새로고침 제한',
        `오늘의 무료 새로고침 횟수(${refreshResult.limit}회)를 모두 사용했습니다.\n\n광고를 시청하거나 프리미엄으로 업그레이드하세요.`,
        [
          { text: '광고 보기', onPress: () => Alert.alert('준비 중', '광고 기능은 준비 중입니다.') },
          { text: '확인', style: 'cancel' },
        ]
      );
      return;
    }

    // 새로고침 상태 업데이트
    setRefreshStatus({
      used: refreshResult.used,
      limit: refreshResult.limit,
      remaining: refreshResult.remaining,
      canRefresh: refreshResult.canRefresh,
    });

    // 로딩 상태 설정
    setTimeframeData(prev => ({
      ...prev,
      [timeframeKey]: { ...prev[timeframeKey], loading: true }
    }));

    try {
      const data = await getQuickScore(
        stock.symbol,
        stock.type || 'crypto',
        tab.apiTimeframe
      );

      setTimeframeData(prev => ({
        ...prev,
        [timeframeKey]: {
          score: data.score,
          signal: data.signal,
          loaded: true,
          loading: false,
          lastRefreshed: Date.now(),
        }
      }));
    } catch (error) {
      console.error(`Failed to fetch ${timeframeKey} score:`, error);
      setTimeframeData(prev => ({
        ...prev,
        [timeframeKey]: { ...prev[timeframeKey], loading: false }
      }));
      Alert.alert('오류', '점수를 불러오는데 실패했습니다.');
    }
  };

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

  // 현재 선택된 타임프레임의 데이터
  const currentData = timeframeData[selectedTimeframe];
  const currentTimeframeScore = currentData.loaded ? currentData.score : null;
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

        <Text style={[styles.currentPrice, { color: colors.text }]}>{stock.price ? stock.price.toLocaleString() : '-'} USD</Text>
        <View style={styles.changeRow}>
          <Text style={[styles.changeText, { color: (stock.change || 0) >= 0 ? colors.success : colors.error }]}>
            {(stock.change || 0) >= 0 ? '+' : ''}{(stock.change || 0).toFixed(2)}%
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
          <View style={styles.scoreTitleRow}>
            <Text style={[styles.scoreTitle, { color: colors.text }]}>AI 분석 점수</Text>
            <View style={[styles.refreshCountBadge, {
              backgroundColor: refreshStatus.remaining > 2 ? colors.success + '20' :
                             refreshStatus.remaining > 0 ? colors.warning + '20' :
                             colors.error + '20'
            }]}>
              <Ionicons
                name="refresh"
                size={12}
                color={refreshStatus.remaining > 2 ? colors.success :
                       refreshStatus.remaining > 0 ? colors.warning :
                       colors.error}
              />
              <Text style={[styles.refreshCountText, {
                color: refreshStatus.remaining > 2 ? colors.success :
                       refreshStatus.remaining > 0 ? colors.warning :
                       colors.error
              }]}>
                {refreshStatus.remaining}/{refreshStatus.limit}
              </Text>
            </View>
          </View>
          {currentData.loading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : currentTimeframeScore !== null ? (
            <View style={[styles.mainScoreBadge, { backgroundColor: getScoreColor(currentTimeframeScore) }]}>
              <Text style={styles.mainScoreText}>{currentTimeframeScore}</Text>
            </View>
          ) : (
            <View style={[styles.mainScoreBadge, { backgroundColor: colors.textTertiary }]}>
              <Text style={styles.mainScoreText}>?</Text>
            </View>
          )}
        </View>

        {/* 타임프레임 선택 탭 */}
        <View style={[styles.timeframeSelector, { backgroundColor: colors.surfaceSecondary }]}>
          {timeframeTabs.map((tf) => {
            const tfData = timeframeData[tf.key];
            const isSelected = selectedTimeframe === tf.key;
            const timeAgo = getTimeAgo(tfData.lastRefreshed);
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
                {tfData.loading ? (
                  <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 2 }} />
                ) : tfData.loaded ? (
                  <>
                    <Text style={[
                      styles.timeframeScore,
                      { color: getScoreColor(tfData.score) },
                      isSelected && { fontWeight: '700' }
                    ]}>
                      {tfData.score}점
                    </Text>
                    <Text style={[styles.timeAgoText, { color: colors.textTertiary }]}>
                      {timeAgo}
                    </Text>
                  </>
                ) : (
                  <Text style={[styles.timeframeNotLoaded, { color: colors.textTertiary }]}>
                    미확인
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 새로고침 필요 메시지 또는 점수 정보 */}
        {!currentData.loaded && !currentData.loading ? (
          <View style={[styles.refreshNeeded, { backgroundColor: colors.primaryBg }]}>
            <View style={styles.refreshIconContainer}>
              <Ionicons name="analytics-outline" size={32} color={colors.primary} />
            </View>
            <Text style={[styles.refreshNeededTitle, { color: colors.text }]}>
              {currentTimeframeLabel} 분석 데이터 없음
            </Text>
            <Text style={[styles.refreshNeededSubtitle, { color: colors.textSecondary }]}>
              새로고침하여 AI 분석 점수를 확인하세요
            </Text>
            <TouchableOpacity
              style={[styles.refreshButton, { backgroundColor: colors.primary }]}
              onPress={() => refreshTimeframe(selectedTimeframe)}
            >
              <Ionicons name="refresh" size={16} color="#FFFFFF" />
              <Text style={styles.refreshButtonText}>분석하기</Text>
            </TouchableOpacity>
          </View>
        ) : currentData.loading ? (
          <View style={[styles.refreshNeeded, { backgroundColor: colors.primaryBg }]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.refreshNeededTitle, { color: colors.text }]}>
              AI 분석 중...
            </Text>
            <Text style={[styles.refreshNeededSubtitle, { color: colors.textSecondary }]}>
              {currentTimeframeLabel} 데이터를 분석하고 있습니다
            </Text>
          </View>
        ) : (
          <>
            {/* 선택된 타임프레임 정보 */}
            <View style={styles.timeframeInfo}>
              <View style={styles.timeframeInfoLeft}>
                <Text style={[styles.timeframeInfoText, { color: colors.textSecondary }]}>
                  {currentTimeframeLabel} 기준
                </Text>
                {currentData.lastRefreshed && (
                  <Text style={[styles.lastUpdatedText, { color: colors.textTertiary }]}>
                    업데이트: {getTimeAgo(currentData.lastRefreshed)}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                style={[styles.miniRefreshButton, { borderColor: colors.primary }]}
                onPress={() => refreshTimeframe(selectedTimeframe)}
              >
                <Ionicons name="refresh" size={14} color={colors.primary} />
                <Text style={[styles.miniRefreshText, { color: colors.primary }]}>새로고침</Text>
              </TouchableOpacity>
            </View>

            {currentData.signal && (
              <View style={[styles.signalBadgeRow]}>
                <View style={[styles.trendBadge, {
                  backgroundColor: currentData.signal === '매수' || currentData.signal === '강력매수' ? colors.success + '20' :
                                 currentData.signal === '매도' || currentData.signal === '강력매도' ? colors.error + '20' :
                                 colors.warning + '20'
                }]}>
                  <Ionicons
                    name={currentData.signal === '매수' || currentData.signal === '강력매수' ? 'trending-up' :
                          currentData.signal === '매도' || currentData.signal === '강력매도' ? 'trending-down' : 'remove'}
                    size={14}
                    color={currentData.signal === '매수' || currentData.signal === '강력매수' ? colors.success :
                           currentData.signal === '매도' || currentData.signal === '강력매도' ? colors.error : colors.warning}
                  />
                  <Text style={[styles.trendText, {
                    color: currentData.signal === '매수' || currentData.signal === '강력매수' ? colors.success :
                           currentData.signal === '매도' || currentData.signal === '강력매도' ? colors.error : colors.warning
                  }]}>
                    {currentData.signal}
                  </Text>
                </View>
                <View style={[styles.scoreGradeBadge, { backgroundColor: getScoreColor(currentTimeframeScore) + '15' }]}>
                  <Text style={[styles.scoreGradeText, { color: getScoreColor(currentTimeframeScore) }]}>
                    {getScoreLabel(currentTimeframeScore)}
                  </Text>
                </View>
              </View>
            )}
          </>
        )}

        {/* 세부 점수 - 점수가 로드된 경우에만 표시 */}
        {currentData.loaded && (
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
        )}
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
  scoreTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refreshCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  refreshCountText: {
    fontSize: 12,
    fontWeight: '600',
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
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
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
  timeframeNotLoaded: {
    fontSize: 11,
    fontWeight: '500',
  },
  timeAgoText: {
    fontSize: 10,
    marginTop: 2,
  },
  refreshNeeded: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  refreshIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  refreshNeededTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  refreshNeededSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 8,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 8,
    gap: 6,
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  timeframeInfoLeft: {
    flex: 1,
  },
  lastUpdatedText: {
    fontSize: 11,
    marginTop: 2,
  },
  miniRefreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  miniRefreshText: {
    fontSize: 12,
    fontWeight: '600',
  },
  signalBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  timeframeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
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

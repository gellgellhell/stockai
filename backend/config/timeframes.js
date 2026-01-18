/**
 * 시간대(Timeframe) 설정
 * 각 시간대별 API 파라미터 및 설정 정의
 */

// 지원하는 시간대 목록
const TIMEFRAMES = {
  // 초단기
  '1m': {
    key: '1m',
    label: '1분',
    labelEn: '1 Minute',
    // Yahoo Finance 설정
    yahoo: { interval: '1m', range: '1d' },
    // CoinGecko는 분 단위 미지원, 가장 짧은 간격 사용
    coingecko: { days: 1 },
    minDataPoints: 30,
    category: 'short'
  },
  '5m': {
    key: '5m',
    label: '5분',
    labelEn: '5 Minutes',
    yahoo: { interval: '5m', range: '5d' },
    coingecko: { days: 1 },
    minDataPoints: 30,
    category: 'short'
  },
  '15m': {
    key: '15m',
    label: '15분',
    labelEn: '15 Minutes',
    yahoo: { interval: '15m', range: '5d' },
    coingecko: { days: 1 },
    minDataPoints: 30,
    category: 'short'
  },
  // 단기
  '1h': {
    key: '1h',
    label: '1시간',
    labelEn: '1 Hour',
    yahoo: { interval: '60m', range: '1mo' },
    coingecko: { days: 7 },
    minDataPoints: 30,
    category: 'short'
  },
  '4h': {
    key: '4h',
    label: '4시간',
    labelEn: '4 Hours',
    yahoo: { interval: '60m', range: '3mo' }, // 4시간 미지원, 1시간으로 대체
    coingecko: { days: 14 },
    minDataPoints: 30,
    category: 'medium'
  },
  // 중기
  '12h': {
    key: '12h',
    label: '12시간',
    labelEn: '12 Hours',
    yahoo: { interval: '1d', range: '3mo' },
    coingecko: { days: 30 },
    minDataPoints: 30,
    category: 'medium'
  },
  '1d': {
    key: '1d',
    label: '1일',
    labelEn: '1 Day',
    yahoo: { interval: '1d', range: '3mo' },
    coingecko: { days: 90 },
    minDataPoints: 30,
    category: 'medium'
  },
  '3d': {
    key: '3d',
    label: '3일',
    labelEn: '3 Days',
    yahoo: { interval: '1d', range: '6mo' },
    coingecko: { days: 90 },
    minDataPoints: 30,
    category: 'medium'
  },
  // 장기
  '1w': {
    key: '1w',
    label: '1주',
    labelEn: '1 Week',
    yahoo: { interval: '1wk', range: '2y' },
    coingecko: { days: 365 },
    minDataPoints: 20,
    category: 'long'
  },
  '1M': {
    key: '1M',
    label: '1개월',
    labelEn: '1 Month',
    yahoo: { interval: '1mo', range: '5y' },
    coingecko: { days: 'max' },
    minDataPoints: 12,
    category: 'long'
  },
  '1y': {
    key: '1y',
    label: '1년',
    labelEn: '1 Year',
    yahoo: { interval: '1mo', range: 'max' },
    coingecko: { days: 'max' },
    minDataPoints: 12,
    category: 'long'
  }
};

// 카테고리별 시간대
const TIMEFRAME_CATEGORIES = {
  short: ['1m', '5m', '15m', '1h'],
  medium: ['4h', '12h', '1d', '3d'],
  long: ['1w', '1M', '1y']
};

// 기본 시간대
const DEFAULT_TIMEFRAME = '1d';

// 시간대 유효성 검사
const isValidTimeframe = (tf) => {
  return TIMEFRAMES.hasOwnProperty(tf);
};

// 시간대 설정 가져오기
const getTimeframeConfig = (tf) => {
  return TIMEFRAMES[tf] || TIMEFRAMES[DEFAULT_TIMEFRAME];
};

// 모든 시간대 키 목록
const getAllTimeframeKeys = () => {
  return Object.keys(TIMEFRAMES);
};

// 시간대 라벨 목록 (UI용)
const getTimeframeLabels = () => {
  return Object.entries(TIMEFRAMES).map(([key, config]) => ({
    key,
    label: config.label,
    labelEn: config.labelEn,
    category: config.category
  }));
};

module.exports = {
  TIMEFRAMES,
  TIMEFRAME_CATEGORIES,
  DEFAULT_TIMEFRAME,
  isValidTimeframe,
  getTimeframeConfig,
  getAllTimeframeKeys,
  getTimeframeLabels
};

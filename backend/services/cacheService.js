/**
 * 캐싱 서비스
 * API 비용 절감을 위한 데이터 캐싱
 */

const NodeCache = require('node-cache');

// 캐시 TTL 설정 (초)
const CACHE_TTL = {
  // 시장 데이터 - 시간대별 다른 TTL
  MARKET_1M: 30,        // 1분봉: 30초
  MARKET_5M: 60,        // 5분봉: 1분
  MARKET_15M: 120,      // 15분봉: 2분
  MARKET_1H: 300,       // 1시간봉: 5분
  MARKET_4H: 600,       // 4시간봉: 10분
  MARKET_1D: 900,       // 일봉: 15분
  MARKET_1W: 1800,      // 주봉: 30분

  // 분석 결과 - 레벨별 다른 TTL
  ANALYSIS_L1: 300,     // Level 1 (무료): 5분
  ANALYSIS_L2: 600,     // Level 2 (AI): 10분
  ANALYSIS_L3: 900,     // Level 3 (Vision): 15분

  // 기타
  COIN_INFO: 3600,      // 코인 정보: 1시간
  INDICATORS: 300,      // 지표 계산: 5분
};

// 캐시 인스턴스 생성
const marketCache = new NodeCache({
  stdTTL: 300,
  checkperiod: 60,
  useClones: false
});

const analysisCache = new NodeCache({
  stdTTL: 600,
  checkperiod: 120,
  useClones: false
});

// 통계 추적
const stats = {
  marketHits: 0,
  marketMisses: 0,
  analysisHits: 0,
  analysisMisses: 0,
  savedApiCalls: 0,
  estimatedSavings: 0  // USD
};

/**
 * 시간대별 TTL 가져오기
 */
const getMarketTTL = (timeframe) => {
  const ttlMap = {
    '1m': CACHE_TTL.MARKET_1M,
    '5m': CACHE_TTL.MARKET_5M,
    '15m': CACHE_TTL.MARKET_15M,
    '1h': CACHE_TTL.MARKET_1H,
    '4h': CACHE_TTL.MARKET_4H,
    '12h': CACHE_TTL.MARKET_4H,
    '1d': CACHE_TTL.MARKET_1D,
    '3d': CACHE_TTL.MARKET_1D,
    '1w': CACHE_TTL.MARKET_1W,
    '1M': CACHE_TTL.MARKET_1W,
    '1y': CACHE_TTL.MARKET_1W
  };
  return ttlMap[timeframe] || CACHE_TTL.MARKET_1D;
};

/**
 * 분석 레벨별 TTL 가져오기
 */
const getAnalysisTTL = (level) => {
  const ttlMap = {
    1: CACHE_TTL.ANALYSIS_L1,
    2: CACHE_TTL.ANALYSIS_L2,
    3: CACHE_TTL.ANALYSIS_L3
  };
  return ttlMap[level] || CACHE_TTL.ANALYSIS_L1;
};

/**
 * 캐시 키 생성
 */
const generateKey = (prefix, ...parts) => {
  return `${prefix}:${parts.join(':')}`;
};

// ==================== 시장 데이터 캐싱 ====================

/**
 * 시장 데이터 캐시 조회
 */
const getMarketData = (symbol, type, timeframe) => {
  const key = generateKey('market', type, symbol.toUpperCase(), timeframe);
  const cached = marketCache.get(key);

  if (cached) {
    stats.marketHits++;
    console.log(`📦 Cache HIT: ${key}`);
    return { hit: true, data: cached };
  }

  stats.marketMisses++;
  console.log(`❌ Cache MISS: ${key}`);
  return { hit: false, data: null };
};

/**
 * 시장 데이터 캐시 저장
 */
const setMarketData = (symbol, type, timeframe, data) => {
  const key = generateKey('market', type, symbol.toUpperCase(), timeframe);
  const ttl = getMarketTTL(timeframe);

  marketCache.set(key, data, ttl);
  console.log(`💾 Cache SET: ${key} (TTL: ${ttl}s)`);
};

// ==================== 분석 결과 캐싱 ====================

/**
 * 분석 결과 캐시 조회
 */
const getAnalysis = (symbol, type, timeframe, level) => {
  const key = generateKey('analysis', type, symbol.toUpperCase(), timeframe, `L${level}`);
  const cached = analysisCache.get(key);

  if (cached) {
    stats.analysisHits++;
    stats.savedApiCalls++;

    // 비용 절감 추정 (Level별)
    const costPerCall = { 1: 0, 2: 0.001, 3: 0.009 };
    stats.estimatedSavings += costPerCall[level] || 0;

    console.log(`📦 Analysis Cache HIT: ${key}`);
    return { hit: true, data: cached };
  }

  stats.analysisMisses++;
  console.log(`❌ Analysis Cache MISS: ${key}`);
  return { hit: false, data: null };
};

/**
 * 분석 결과 캐시 저장
 */
const setAnalysis = (symbol, type, timeframe, level, data) => {
  const key = generateKey('analysis', type, symbol.toUpperCase(), timeframe, `L${level}`);
  const ttl = getAnalysisTTL(level);

  // 캐시된 데이터임을 표시
  const cachedData = {
    ...data,
    cached: true,
    cachedAt: new Date().toISOString()
  };

  analysisCache.set(key, cachedData, ttl);
  console.log(`💾 Analysis Cache SET: ${key} (TTL: ${ttl}s)`);
};

// ==================== 지표 캐싱 ====================

/**
 * 지표 캐시 조회
 */
const getIndicators = (symbol, type, timeframe) => {
  const key = generateKey('indicators', type, symbol.toUpperCase(), timeframe);
  const cached = marketCache.get(key);

  if (cached) {
    console.log(`📦 Indicators Cache HIT: ${key}`);
    return { hit: true, data: cached };
  }
  return { hit: false, data: null };
};

/**
 * 지표 캐시 저장
 */
const setIndicators = (symbol, type, timeframe, data) => {
  const key = generateKey('indicators', type, symbol.toUpperCase(), timeframe);
  marketCache.set(key, data, CACHE_TTL.INDICATORS);
};

// ==================== 캐시 관리 ====================

/**
 * 특정 심볼의 모든 캐시 삭제
 */
const invalidateSymbol = (symbol) => {
  const upperSymbol = symbol.toUpperCase();

  // 모든 키 조회 후 해당 심볼 키 삭제
  const marketKeys = marketCache.keys().filter(k => k.includes(upperSymbol));
  const analysisKeys = analysisCache.keys().filter(k => k.includes(upperSymbol));

  marketKeys.forEach(k => marketCache.del(k));
  analysisKeys.forEach(k => analysisCache.del(k));

  console.log(`🗑️ Invalidated ${marketKeys.length + analysisKeys.length} cache entries for ${symbol}`);
};

/**
 * 전체 캐시 삭제
 */
const clearAll = () => {
  marketCache.flushAll();
  analysisCache.flushAll();
  console.log('🗑️ All caches cleared');
};

/**
 * 캐시 통계 조회
 */
const getStats = () => {
  const marketStats = marketCache.getStats();
  const analysisStats = analysisCache.getStats();

  return {
    market: {
      hits: stats.marketHits,
      misses: stats.marketMisses,
      hitRate: stats.marketHits + stats.marketMisses > 0
        ? ((stats.marketHits / (stats.marketHits + stats.marketMisses)) * 100).toFixed(1) + '%'
        : '0%',
      keys: marketCache.keys().length,
      ...marketStats
    },
    analysis: {
      hits: stats.analysisHits,
      misses: stats.analysisMisses,
      hitRate: stats.analysisHits + stats.analysisMisses > 0
        ? ((stats.analysisHits / (stats.analysisHits + stats.analysisMisses)) * 100).toFixed(1) + '%'
        : '0%',
      keys: analysisCache.keys().length,
      ...analysisStats
    },
    savings: {
      savedApiCalls: stats.savedApiCalls,
      estimatedSavingsUSD: stats.estimatedSavings.toFixed(4)
    },
    ttlConfig: CACHE_TTL
  };
};

/**
 * 캐시 키 목록 조회
 */
const listKeys = () => {
  return {
    market: marketCache.keys(),
    analysis: analysisCache.keys()
  };
};

module.exports = {
  // 시장 데이터
  getMarketData,
  setMarketData,

  // 분석 결과
  getAnalysis,
  setAnalysis,

  // 지표
  getIndicators,
  setIndicators,

  // 관리
  invalidateSymbol,
  clearAll,
  getStats,
  listKeys,

  // TTL 설정
  CACHE_TTL,
  getMarketTTL,
  getAnalysisTTL
};

const express = require('express');
const router = express.Router();
const { calculateAllIndicators } = require('../services/indicators');
const {
  analyzeStock,
  getQuickScore,
  calculateRuleBasedScore,
  getScoreWithFallback,
  performLevel3Analysis
} = require('../services/gptAnalysis');
const {
  getCryptoDataByTimeframe,
  getStockDataByTimeframe,
} = require('../services/marketData');
const { generateCandlestickChart } = require('../services/chartGenerator');
const {
  isValidTimeframe,
  getTimeframeConfig,
  DEFAULT_TIMEFRAME,
  getTimeframeLabels,
  getAllTimeframeKeys
} = require('../config/timeframes');
const {
  ANALYSIS_LEVELS,
  PLANS,
  formatScoreResponse,
  determineAnalysisLevel
} = require('../config/plans');
const {
  checkAnalysisUsage,
  recordUsage
} = require('../middleware/usageMiddleware');
const cache = require('../services/cacheService');

/**
 * GET /api/analysis/timeframes
 * 지원하는 시간대 목록 조회
 */
router.get('/timeframes', (req, res) => {
  res.json({
    success: true,
    data: {
      timeframes: getTimeframeLabels(),
      default: DEFAULT_TIMEFRAME
    }
  });
});

/**
 * GET /api/analysis/plans
 * 구독 플랜 정보 조회
 */
router.get('/plans', (req, res) => {
  res.json({
    success: true,
    data: {
      plans: Object.values(PLANS),
      analysisLevels: Object.values(ANALYSIS_LEVELS)
    }
  });
});

/**
 * GET /api/analysis/quick/:symbol
 * 빠른 점수 조회 - 레벨에 따라 다른 형식 반환
 * 미들웨어: 사용량 체크 → 요청 처리 → 사용량 기록
 */
router.get('/quick/:symbol', checkAnalysisUsage, recordUsage, async (req, res) => {
  try {
    const { symbol } = req.params;
    const {
      type = 'crypto',
      timeframe = DEFAULT_TIMEFRAME,
      level = '1',  // 분석 레벨 (1, 2, 3)
      plan = 'free' // 사용자 플랜
    } = req.query;

    const analysisLevel = parseInt(level);

    if (!isValidTimeframe(timeframe)) {
      return res.status(400).json({ error: `Invalid timeframe: ${timeframe}` });
    }

    const tfConfig = getTimeframeConfig(timeframe);

    // 캐시 확인 (모든 레벨 캐싱 - 5분 이내 동일 요청 시 캐시 사용)
    const cached = cache.getAnalysis(symbol, type, timeframe, analysisLevel);
    if (cached.hit) {
      console.log(`📦 Analysis Cache HIT: ${symbol} L${analysisLevel}`);
      return res.json({
        success: true,
        data: {
          ...cached.data,
          fromCache: true
        }
      });
    }

    console.log(`⚡ Level ${analysisLevel} analysis for ${symbol} on ${tfConfig.label}...`);

    // 1. 시간대별 시장 데이터 가져오기
    let marketData;
    if (type === 'crypto') {
      marketData = await getCryptoDataByTimeframe(symbol, timeframe);
    } else {
      marketData = await getStockDataByTimeframe(symbol, timeframe);
    }

    // 2. 기술적 지표 계산
    const indicators = calculateAllIndicators(marketData.prepared);

    // 3. 레벨별 분석 수행
    let rawScore;
    let analysisMethod;
    let reasons = [];
    let patterns = [];

    // 추가 분석 결과 저장
    let visionData = null;

    if (analysisLevel === 1) {
      // Level 1: 규칙 기반 (무료)
      const ruleResult = calculateRuleBasedScore(indicators);
      rawScore = ruleResult.score;
      analysisMethod = 'rule-based';
      reasons = ruleResult.reasons;
      patterns = ruleResult.patterns;
    } else if (analysisLevel === 2) {
      // Level 2: GPT 텍스트 분석
      const gptResult = await getScoreWithFallback(symbol, indicators);
      rawScore = gptResult.score;
      analysisMethod = gptResult.method;
      reasons = gptResult.reasons || [];
      patterns = gptResult.patterns || [];
    } else {
      // Level 3: GPT Vision 차트 분석
      console.log(`🔍 Vision 분석 시작: ${symbol}`);

      // 차트 이미지 생성
      const chartImage = generateCandlestickChart({
        ohlcv: marketData.ohlcv,
        indicators,
        symbol: marketData.symbol,
        timeframeLabel: tfConfig.label
      });

      // Vision API로 분석
      const visionResult = await performLevel3Analysis(
        chartImage,
        symbol,
        indicators,
        { timeframeLabel: tfConfig.label }
      );

      rawScore = visionResult.score || 50;
      analysisMethod = visionResult.method;
      reasons = visionResult.reasons || [];
      patterns = visionResult.patterns || [];

      // Vision 전용 데이터
      visionData = {
        confidence: visionResult.confidence,
        support: visionResult.support,
        resistance: visionResult.resistance,
        trend: visionResult.trend,
        shortTermOutlook: visionResult.shortTermOutlook,
        usage: visionResult.usage
      };

      console.log(`✅ Vision 분석 완료: ${symbol} - ${rawScore}점 (${analysisMethod})`);
    }

    // 4. 레벨에 따른 점수 포맷팅
    const scoreDisplay = formatScoreResponse(rawScore, analysisLevel);

    // 응답 데이터 구성
    const responseData = {
      symbol: marketData.symbol,
      name: marketData.name,
      timeframe,
      timeframeLabel: tfConfig.label,
      analysisLevel,
      analysisLevelName: ANALYSIS_LEVELS[`LEVEL_${analysisLevel}`]?.nameKr,
      method: analysisMethod,
      // 점수 표시 (레벨에 따라 다름)
      ...scoreDisplay,
      // 분석 근거
      reasons: analysisLevel >= 2 ? reasons : [], // Level 1은 근거 미제공
      patterns: analysisLevel >= 2 ? patterns : [],
      // Vision 전용 데이터 (Level 3)
      ...(visionData && {
        vision: {
          confidence: visionData.confidence,
          support: visionData.support,
          resistance: visionData.resistance,
          trend: visionData.trend,
          shortTermOutlook: visionData.shortTermOutlook
        },
        apiUsage: visionData.usage
      }),
      // 가격 정보
      price: indicators.price.current,
      change24h: indicators.price.change24h,
      // 기본 지표 (Level 1도 제공)
      indicators: {
        rsi: indicators.rsi.value,
        rsiInterpretation: indicators.rsi.interpretation,
        macd: indicators.macd.interpretation,
        volume: indicators.volume.interpretation,
      },
      dataPoints: marketData.dataPoints,
      timestamp: new Date().toISOString(),
      // 업그레이드 유도 (Level 1, 2인 경우)
      upgradeHint: analysisLevel < 3 ? {
        message: '프리미엄 분석으로 1-100 상세 점수를 확인하세요',
        requiredPlan: 'basic'
      } : null
    };

    // 캐시에 저장 (모든 레벨 - 5분 TTL)
    cache.setAnalysis(symbol, type, timeframe, analysisLevel, responseData);

    res.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.error('Quick score error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/analysis/compare/:symbol
 * 단기/중기/장기 점수 비교
 */
router.get('/compare/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { type = 'crypto', level = '1', plan = 'free' } = req.query;
    const analysisLevel = parseInt(level);

    console.log(`📊 Level ${analysisLevel} comparison for ${symbol}...`);

    const representativeTimeframes = ['1h', '1d', '1w'];
    const results = {};

    for (const tf of representativeTimeframes) {
      try {
        const tfConfig = getTimeframeConfig(tf);

        let marketData;
        if (type === 'crypto') {
          marketData = await getCryptoDataByTimeframe(symbol, tf);
        } else {
          marketData = await getStockDataByTimeframe(symbol, tf);
        }

        const indicators = calculateAllIndicators(marketData.prepared);
        const scoreResult = calculateRuleBasedScore(indicators);
        const scoreDisplay = formatScoreResponse(scoreResult.score, analysisLevel);

        results[tf] = {
          timeframe: tf,
          timeframeLabel: tfConfig.label,
          category: tfConfig.category,
          ...scoreDisplay,
          reasons: analysisLevel >= 2 ? scoreResult.reasons : [],
          price: indicators.price.current
        };
      } catch (err) {
        results[tf] = {
          timeframe: tf,
          error: err.message
        };
      }
    }

    // 종합 점수 계산
    const scores = Object.values(results)
      .filter(r => r._internalScore || r.score)
      .map(r => r._internalScore || r.score);

    const avgScore = scores.length
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : null;

    const overallDisplay = avgScore ? formatScoreResponse(avgScore, analysisLevel) : null;

    // 추세 판단
    let trend = '횡보';
    const shortScore = results['1h']?._internalScore || results['1h']?.score;
    const longScore = results['1w']?._internalScore || results['1w']?.score;
    if (shortScore && longScore) {
      const diff = shortScore - longScore;
      if (diff > 10) trend = '상승세';
      else if (diff < -10) trend = '하락세';
    }

    res.json({
      success: true,
      data: {
        symbol,
        type,
        analysisLevel,
        analysisLevelName: ANALYSIS_LEVELS[`LEVEL_${analysisLevel}`]?.nameKr,
        overall: overallDisplay,
        trend,
        trendKr: trend,
        comparison: {
          shortTerm: results['1h'],
          mediumTerm: results['1d'],
          longTerm: results['1w']
        },
        timestamp: new Date().toISOString(),
        upgradeHint: analysisLevel < 3 ? {
          message: '프리미엄 분석으로 상세 점수를 확인하세요',
          requiredPlan: 'basic'
        } : null
      }
    });
  } catch (error) {
    console.error('Compare error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/analysis/all-timeframes/:symbol
 * 모든 시간대에 대한 점수 일괄 조회
 */
router.get('/all-timeframes/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { type = 'crypto', level = '1' } = req.query;
    const analysisLevel = parseInt(level);

    console.log(`📊 Level ${analysisLevel} analysis for ${symbol} across all timeframes...`);

    const allTimeframes = getAllTimeframeKeys();
    const results = {};

    for (const tf of allTimeframes) {
      try {
        const tfConfig = getTimeframeConfig(tf);

        let marketData;
        if (type === 'crypto') {
          marketData = await getCryptoDataByTimeframe(symbol, tf);
        } else {
          marketData = await getStockDataByTimeframe(symbol, tf);
        }

        const indicators = calculateAllIndicators(marketData.prepared);
        const scoreResult = calculateRuleBasedScore(indicators);
        const scoreDisplay = formatScoreResponse(scoreResult.score, analysisLevel);

        results[tf] = {
          timeframe: tf,
          timeframeLabel: tfConfig.label,
          category: tfConfig.category,
          ...scoreDisplay,
          reasons: analysisLevel >= 2 ? scoreResult.reasons : [],
          patterns: analysisLevel >= 2 ? scoreResult.patterns : [],
          dataPoints: marketData.dataPoints
        };
      } catch (err) {
        console.error(`Failed ${tf}:`, err.message);
        results[tf] = {
          timeframe: tf,
          error: err.message
        };
      }
    }

    // 카테고리별 평균 점수 계산
    const categories = { short: [], medium: [], long: [] };
    Object.values(results).forEach(r => {
      const score = r._internalScore || r.score;
      if (score && r.category) {
        categories[r.category].push(score);
      }
    });

    const categoryScores = {};
    for (const [cat, scores] of Object.entries(categories)) {
      if (scores.length) {
        const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
        categoryScores[cat] = formatScoreResponse(avg, analysisLevel);
      }
    }

    // 전체 평균 점수
    const allScores = Object.values(results)
      .filter(r => r._internalScore || r.score)
      .map(r => r._internalScore || r.score);

    const overallAvg = allScores.length
      ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
      : null;

    res.json({
      success: true,
      data: {
        symbol,
        type,
        analysisLevel,
        analysisLevelName: ANALYSIS_LEVELS[`LEVEL_${analysisLevel}`]?.nameKr,
        overall: overallAvg ? formatScoreResponse(overallAvg, analysisLevel) : null,
        categoryScores,
        timeframes: results,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('All timeframes error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/analysis/indicators/:symbol
 * 기술적 지표만 조회 (무료)
 */
router.get('/indicators/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { type = 'crypto', timeframe = DEFAULT_TIMEFRAME } = req.query;

    if (!isValidTimeframe(timeframe)) {
      return res.status(400).json({ error: `Invalid timeframe: ${timeframe}` });
    }

    const tfConfig = getTimeframeConfig(timeframe);
    console.log(`📈 Getting indicators for ${symbol} on ${tfConfig.label}...`);

    let marketData;
    if (type === 'crypto') {
      marketData = await getCryptoDataByTimeframe(symbol, timeframe);
    } else {
      marketData = await getStockDataByTimeframe(symbol, timeframe);
    }

    const indicators = calculateAllIndicators(marketData.prepared);

    res.json({
      success: true,
      data: {
        symbol: marketData.symbol,
        name: marketData.name,
        type: marketData.type,
        timeframe,
        timeframeLabel: tfConfig.label,
        indicators,
        dataPoints: marketData.dataPoints,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Indicators error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/analysis/batch
 * 여러 종목 일괄 점수 조회
 */
router.post('/batch', async (req, res) => {
  try {
    const {
      symbols,
      type = 'crypto',
      timeframe = DEFAULT_TIMEFRAME,
      level = 1
    } = req.body;

    if (!symbols || !Array.isArray(symbols)) {
      return res.status(400).json({ error: 'symbols array is required' });
    }

    if (!isValidTimeframe(timeframe)) {
      return res.status(400).json({ error: `Invalid timeframe: ${timeframe}` });
    }

    const analysisLevel = parseInt(level);
    const tfConfig = getTimeframeConfig(timeframe);
    console.log(`📊 Level ${analysisLevel} batch analysis for ${symbols.length} symbols...`);

    const results = [];

    for (const symbol of symbols.slice(0, 10)) {
      try {
        let marketData;
        if (type === 'crypto') {
          marketData = await getCryptoDataByTimeframe(symbol, timeframe);
        } else {
          marketData = await getStockDataByTimeframe(symbol, timeframe);
        }

        const indicators = calculateAllIndicators(marketData.prepared);
        const scoreResult = calculateRuleBasedScore(indicators);
        const scoreDisplay = formatScoreResponse(scoreResult.score, analysisLevel);

        results.push({
          symbol: marketData.symbol,
          name: marketData.name,
          timeframe,
          timeframeLabel: tfConfig.label,
          ...scoreDisplay,
          price: indicators.price.current,
          change24h: indicators.price.change24h
        });
      } catch (err) {
        console.error(`Failed to analyze ${symbol}:`, err.message);
        results.push({
          symbol,
          timeframe,
          error: err.message
        });
      }
    }

    res.json({
      success: true,
      count: results.length,
      analysisLevel,
      timeframe,
      timeframeLabel: tfConfig.label,
      data: results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Batch analysis error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/analysis/chart/:symbol
 * 차트 이미지 미리보기 (테스트용)
 */
router.get('/chart/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { type = 'crypto', timeframe = DEFAULT_TIMEFRAME } = req.query;

    const tfConfig = getTimeframeConfig(timeframe);
    console.log(`📊 Generating chart for ${symbol} on ${tfConfig.label}...`);

    let marketData;
    if (type === 'crypto') {
      marketData = await getCryptoDataByTimeframe(symbol, timeframe);
    } else {
      marketData = await getStockDataByTimeframe(symbol, timeframe);
    }

    const indicators = calculateAllIndicators(marketData.prepared);

    // 차트 이미지 생성
    const chartImage = generateCandlestickChart({
      ohlcv: marketData.ohlcv,
      indicators,
      symbol: marketData.symbol,
      timeframeLabel: tfConfig.label
    });

    // HTML로 이미지 표시
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${symbol} Chart - ${tfConfig.label}</title>
          <style>
            body { background: #1a1a2e; padding: 20px; font-family: Arial; }
            h1 { color: white; }
            img { border: 1px solid #333; border-radius: 8px; }
            .info { color: #a0a0b0; margin-top: 10px; }
          </style>
        </head>
        <body>
          <h1>${symbol} - ${tfConfig.label}</h1>
          <img src="data:image/png;base64,${chartImage}" />
          <div class="info">
            <p>Price: $${indicators.price.current.toFixed(2)}</p>
            <p>RSI: ${indicators.rsi.value}</p>
            <p>MACD: ${indicators.macd.interpretation}</p>
            <p>Data Points: ${marketData.dataPoints}</p>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Chart generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/analysis/chart-json/:symbol
 * 차트 이미지 Base64 JSON 반환
 */
router.get('/chart-json/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { type = 'crypto', timeframe = DEFAULT_TIMEFRAME } = req.query;

    const tfConfig = getTimeframeConfig(timeframe);

    let marketData;
    if (type === 'crypto') {
      marketData = await getCryptoDataByTimeframe(symbol, timeframe);
    } else {
      marketData = await getStockDataByTimeframe(symbol, timeframe);
    }

    const indicators = calculateAllIndicators(marketData.prepared);

    const chartImage = generateCandlestickChart({
      ohlcv: marketData.ohlcv,
      indicators,
      symbol: marketData.symbol,
      timeframeLabel: tfConfig.label
    });

    res.json({
      success: true,
      data: {
        symbol: marketData.symbol,
        timeframe,
        timeframeLabel: tfConfig.label,
        chartBase64: chartImage,
        price: indicators.price.current,
        dataPoints: marketData.dataPoints
      }
    });
  } catch (error) {
    console.error('Chart JSON error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/analysis/cache/stats
 * 캐시 통계 조회
 */
router.get('/cache/stats', (req, res) => {
  const stats = cache.getStats();
  res.json({
    success: true,
    data: stats
  });
});

/**
 * GET /api/analysis/cache/keys
 * 캐시 키 목록 조회
 */
router.get('/cache/keys', (req, res) => {
  const keys = cache.listKeys();
  res.json({
    success: true,
    data: keys
  });
});

/**
 * POST /api/analysis/cache/clear
 * 캐시 전체 삭제
 */
router.post('/cache/clear', (req, res) => {
  cache.clearAll();
  res.json({
    success: true,
    message: '모든 캐시가 삭제되었습니다'
  });
});

/**
 * POST /api/analysis/cache/invalidate/:symbol
 * 특정 심볼 캐시 삭제
 */
router.post('/cache/invalidate/:symbol', (req, res) => {
  const { symbol } = req.params;
  cache.invalidateSymbol(symbol);
  res.json({
    success: true,
    message: `${symbol} 캐시가 삭제되었습니다`
  });
});

module.exports = router;

const fetch = require('node-fetch');
const { getTimeframeConfig, DEFAULT_TIMEFRAME } = require('../config/timeframes');
const cache = require('./cacheService');

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';
const YAHOO_FINANCE_BASE = 'https://query1.finance.yahoo.com/v8/finance';

// 코인 ID 매핑
const COIN_IDS = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  XRP: 'ripple',
  SOL: 'solana',
  DOGE: 'dogecoin',
  ADA: 'cardano',
  AVAX: 'avalanche-2',
  DOT: 'polkadot',
  MATIC: 'matic-network',
  LINK: 'chainlink',
  BNB: 'binancecoin',
  USDT: 'tether',
  USDC: 'usd-coin',
};

/**
 * 코인 OHLCV 데이터 가져오기 (CoinGecko)
 */
const getCryptoOHLCV = async (coinId, days = 90) => {
  try {
    // CoinGecko OHLC 엔드포인트
    const response = await fetch(
      `${COINGECKO_BASE}/coins/${coinId}/ohlc?vs_currency=usd&days=${days}`
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();

    // [timestamp, open, high, low, close] 형식
    const ohlcv = data.map(([timestamp, open, high, low, close]) => ({
      timestamp,
      open,
      high,
      low,
      close,
      volume: 0 // OHLC 엔드포인트는 거래량 미포함
    }));

    return ohlcv;
  } catch (error) {
    console.error(`Failed to fetch crypto OHLCV for ${coinId}:`, error);
    return [];
  }
};

/**
 * 코인 시장 데이터 + 거래량 가져오기
 */
const getCryptoMarketData = async (coinId) => {
  try {
    const response = await fetch(
      `${COINGECKO_BASE}/coins/${coinId}/market_chart?vs_currency=usd&days=90&interval=daily`
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();

    // prices, market_caps, total_volumes
    const prices = data.prices || [];
    const volumes = data.total_volumes || [];

    return {
      prices: prices.map(([ts, price]) => ({ timestamp: ts, price })),
      volumes: volumes.map(([ts, vol]) => ({ timestamp: ts, volume: vol }))
    };
  } catch (error) {
    console.error(`Failed to fetch crypto market data for ${coinId}:`, error);
    return { prices: [], volumes: [] };
  }
};

/**
 * 코인 상세 정보 가져오기
 */
const getCryptoInfo = async (coinId) => {
  try {
    const response = await fetch(
      `${COINGECKO_BASE}/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false`
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();

    return {
      id: data.id,
      symbol: data.symbol.toUpperCase(),
      name: data.name,
      currentPrice: data.market_data.current_price.usd,
      marketCap: data.market_data.market_cap.usd,
      volume24h: data.market_data.total_volume.usd,
      priceChange24h: data.market_data.price_change_percentage_24h,
      priceChange7d: data.market_data.price_change_percentage_7d,
      priceChange30d: data.market_data.price_change_percentage_30d,
      high24h: data.market_data.high_24h.usd,
      low24h: data.market_data.low_24h.usd,
      ath: data.market_data.ath.usd,
      athDate: data.market_data.ath_date.usd,
      atl: data.market_data.atl.usd,
      atlDate: data.market_data.atl_date.usd,
      circulatingSupply: data.market_data.circulating_supply,
      totalSupply: data.market_data.total_supply,
      image: data.image?.large
    };
  } catch (error) {
    console.error(`Failed to fetch crypto info for ${coinId}:`, error);
    return null;
  }
};

/**
 * 주식 OHLCV 데이터 가져오기 (Yahoo Finance)
 */
const getStockOHLCV = async (symbol, range = '3mo', interval = '1d') => {
  try {
    const response = await fetch(
      `${YAHOO_FINANCE_BASE}/chart/${symbol}?interval=${interval}&range=${range}`
    );

    if (!response.ok) {
      throw new Error(`Yahoo Finance API error: ${response.status}`);
    }

    const data = await response.json();
    const result = data.chart?.result?.[0];

    if (!result) {
      throw new Error('No data returned');
    }

    const timestamps = result.timestamp || [];
    const quote = result.indicators?.quote?.[0] || {};

    const ohlcv = timestamps.map((ts, i) => ({
      timestamp: ts * 1000,
      open: quote.open?.[i],
      high: quote.high?.[i],
      low: quote.low?.[i],
      close: quote.close?.[i],
      volume: quote.volume?.[i]
    })).filter(d => d.close !== null);

    return {
      ohlcv,
      meta: {
        symbol: result.meta.symbol,
        currency: result.meta.currency,
        exchangeName: result.meta.exchangeName,
        regularMarketPrice: result.meta.regularMarketPrice,
        previousClose: result.meta.previousClose
      }
    };
  } catch (error) {
    console.error(`Failed to fetch stock OHLCV for ${symbol}:`, error);
    return { ohlcv: [], meta: null };
  }
};

/**
 * 분석을 위한 OHLCV 데이터 정리
 * indicators.js에서 사용할 수 있는 형식으로 변환
 */
const prepareDataForAnalysis = (ohlcvData) => {
  return {
    closes: ohlcvData.map(d => d.close).filter(Boolean),
    highs: ohlcvData.map(d => d.high).filter(Boolean),
    lows: ohlcvData.map(d => d.low).filter(Boolean),
    volumes: ohlcvData.map(d => d.volume).filter(Boolean),
    timestamps: ohlcvData.map(d => d.timestamp)
  };
};

/**
 * 코인 분석용 데이터 가져오기
 */
const getCryptoDataForAnalysis = async (symbol) => {
  const coinId = COIN_IDS[symbol.toUpperCase()];

  if (!coinId) {
    console.log(`Using ${symbol.toLowerCase()} as coin ID`);
  }

  const targetId = coinId || symbol.toLowerCase();

  // market_chart 데이터와 상세 정보 가져오기
  const [marketData, info] = await Promise.all([
    getCryptoMarketData(targetId),
    getCryptoInfo(targetId)
  ]);

  // market_chart의 prices 데이터로 OHLCV 생성
  // (시가=종가로 단순화, 일봉 기준)
  const prices = marketData.prices;
  const volumes = marketData.volumes;

  if (!prices.length || prices.length < 30) {
    throw new Error(`Insufficient data for ${symbol}: ${prices.length} points`);
  }

  const ohlcvData = prices.map((priceData, index) => {
    const price = priceData.price;
    const prevPrice = index > 0 ? prices[index - 1].price : price;

    return {
      timestamp: priceData.timestamp,
      open: prevPrice,
      high: Math.max(price, prevPrice) * 1.001, // 약간의 변동 추가
      low: Math.min(price, prevPrice) * 0.999,
      close: price,
      volume: volumes[index]?.volume || 0
    };
  });

  return {
    symbol: symbol.toUpperCase(),
    name: info?.name || symbol,
    type: 'crypto',
    info,
    ohlcv: ohlcvData,
    prepared: prepareDataForAnalysis(ohlcvData)
  };
};

/**
 * 주식 분석용 데이터 가져오기
 */
const getStockDataForAnalysis = async (symbol) => {
  const { ohlcv, meta } = await getStockOHLCV(symbol, '3mo', '1d');

  if (!ohlcv.length) {
    throw new Error(`No data found for ${symbol}`);
  }

  return {
    symbol: meta?.symbol || symbol,
    name: meta?.symbol || symbol,
    type: 'stock',
    info: meta,
    ohlcv,
    prepared: prepareDataForAnalysis(ohlcv)
  };
};

/**
 * 시간대별 코인 데이터 가져오기 (캐싱 적용)
 * @param {string} symbol - 코인 심볼 (BTC, ETH 등)
 * @param {string} timeframe - 시간대 키 (1m, 1h, 1d 등)
 */
const getCryptoDataByTimeframe = async (symbol, timeframe = DEFAULT_TIMEFRAME) => {
  // 캐시 확인
  const cached = cache.getMarketData(symbol, 'crypto', timeframe);
  if (cached.hit) {
    return { ...cached.data, fromCache: true };
  }

  const coinId = COIN_IDS[symbol.toUpperCase()] || symbol.toLowerCase();
  const config = getTimeframeConfig(timeframe);
  const days = config.coingecko.days;

  try {
    // market_chart 데이터 가져오기
    const response = await fetch(
      `${COINGECKO_BASE}/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    const prices = data.prices || [];
    const volumes = data.total_volumes || [];

    if (prices.length < config.minDataPoints) {
      throw new Error(`Insufficient data for ${symbol} on ${timeframe}: ${prices.length} points`);
    }

    // 시간대에 따라 데이터 리샘플링
    const resampledData = resampleData(prices, volumes, timeframe);

    // 코인 정보도 가져오기
    const info = await getCryptoInfo(coinId);

    const result = {
      symbol: symbol.toUpperCase(),
      name: info?.name || symbol,
      type: 'crypto',
      timeframe,
      timeframeLabel: config.label,
      info,
      ohlcv: resampledData,
      prepared: prepareDataForAnalysis(resampledData),
      dataPoints: resampledData.length,
      fromCache: false
    };

    // 캐시에 저장
    cache.setMarketData(symbol, 'crypto', timeframe, result);

    return result;
  } catch (error) {
    console.error(`Failed to fetch crypto data for ${symbol} (${timeframe}):`, error);
    throw error;
  }
};

/**
 * 시간대별 주식 데이터 가져오기 (캐싱 적용)
 * @param {string} symbol - 주식 심볼 (AAPL, TSLA 등)
 * @param {string} timeframe - 시간대 키
 */
const getStockDataByTimeframe = async (symbol, timeframe = DEFAULT_TIMEFRAME) => {
  // 캐시 확인
  const cached = cache.getMarketData(symbol, 'stock', timeframe);
  if (cached.hit) {
    return { ...cached.data, fromCache: true };
  }

  const config = getTimeframeConfig(timeframe);
  const { interval, range } = config.yahoo;

  try {
    const response = await fetch(
      `${YAHOO_FINANCE_BASE}/chart/${symbol}?interval=${interval}&range=${range}`
    );

    if (!response.ok) {
      throw new Error(`Yahoo Finance API error: ${response.status}`);
    }

    const data = await response.json();
    const apiResult = data.chart?.result?.[0];

    if (!apiResult) {
      throw new Error(`No data found for ${symbol}`);
    }

    const timestamps = apiResult.timestamp || [];
    const quote = apiResult.indicators?.quote?.[0] || {};

    const ohlcv = timestamps.map((ts, i) => ({
      timestamp: ts * 1000,
      open: quote.open?.[i],
      high: quote.high?.[i],
      low: quote.low?.[i],
      close: quote.close?.[i],
      volume: quote.volume?.[i]
    })).filter(d => d.close !== null);

    if (ohlcv.length < config.minDataPoints) {
      throw new Error(`Insufficient data for ${symbol} on ${timeframe}: ${ohlcv.length} points`);
    }

    const result = {
      symbol: apiResult.meta?.symbol || symbol,
      name: apiResult.meta?.symbol || symbol,
      type: 'stock',
      timeframe,
      timeframeLabel: config.label,
      info: apiResult.meta,
      ohlcv,
      prepared: prepareDataForAnalysis(ohlcv),
      dataPoints: ohlcv.length,
      fromCache: false
    };

    // 캐시에 저장
    cache.setMarketData(symbol, 'stock', timeframe, result);

    return result;
  } catch (error) {
    console.error(`Failed to fetch stock data for ${symbol} (${timeframe}):`, error);
    throw error;
  }
};

/**
 * 데이터 리샘플링 (시간대에 맞게 데이터 그룹화)
 */
const resampleData = (prices, volumes, timeframe) => {
  // 시간대별 그룹화 간격 (밀리초)
  const intervals = {
    '1m': 60 * 1000,
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '4h': 4 * 60 * 60 * 1000,
    '12h': 12 * 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000,
    '3d': 3 * 24 * 60 * 60 * 1000,
    '1w': 7 * 24 * 60 * 60 * 1000,
    '1M': 30 * 24 * 60 * 60 * 1000,
    '1y': 365 * 24 * 60 * 60 * 1000
  };

  const interval = intervals[timeframe] || intervals['1d'];

  // 데이터를 interval로 그룹화
  const grouped = {};

  prices.forEach((priceData, index) => {
    const ts = priceData.timestamp || priceData[0];
    const price = priceData.price || priceData[1];
    const bucketTs = Math.floor(ts / interval) * interval;

    if (!grouped[bucketTs]) {
      grouped[bucketTs] = {
        timestamp: bucketTs,
        prices: [],
        volumes: []
      };
    }

    grouped[bucketTs].prices.push(price);
    if (volumes[index]) {
      grouped[bucketTs].volumes.push(volumes[index].volume || volumes[index][1] || 0);
    }
  });

  // OHLCV 형식으로 변환
  return Object.values(grouped)
    .sort((a, b) => a.timestamp - b.timestamp)
    .map(bucket => {
      const p = bucket.prices;
      return {
        timestamp: bucket.timestamp,
        open: p[0],
        high: Math.max(...p),
        low: Math.min(...p),
        close: p[p.length - 1],
        volume: bucket.volumes.reduce((a, b) => a + b, 0)
      };
    });
};

/**
 * 모든 시간대에 대한 데이터 가져오기 (배치)
 */
const getDataForAllTimeframes = async (symbol, type = 'crypto', timeframes = null) => {
  const { getAllTimeframeKeys } = require('../config/timeframes');
  const targetTimeframes = timeframes || getAllTimeframeKeys();

  const results = {};

  for (const tf of targetTimeframes) {
    try {
      if (type === 'crypto') {
        results[tf] = await getCryptoDataByTimeframe(symbol, tf);
      } else {
        results[tf] = await getStockDataByTimeframe(symbol, tf);
      }
    } catch (error) {
      console.error(`Failed to get ${symbol} data for ${tf}:`, error.message);
      results[tf] = { error: error.message, timeframe: tf };
    }
  }

  return results;
};

module.exports = {
  getCryptoOHLCV,
  getCryptoMarketData,
  getCryptoInfo,
  getStockOHLCV,
  prepareDataForAnalysis,
  getCryptoDataForAnalysis,
  getStockDataForAnalysis,
  getCryptoDataByTimeframe,
  getStockDataByTimeframe,
  getDataForAllTimeframes,
  COIN_IDS
};

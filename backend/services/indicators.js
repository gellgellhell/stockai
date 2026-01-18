const ti = require('technicalindicators');

/**
 * 기술적 지표 계산 서비스
 * OHLCV 데이터를 받아서 각종 기술적 지표를 계산
 */

// RSI (Relative Strength Index) 계산
const calculateRSI = (closes, period = 14) => {
  const rsi = ti.RSI.calculate({
    values: closes,
    period: period
  });
  return rsi.length > 0 ? rsi[rsi.length - 1] : null;
};

// MACD 계산
const calculateMACD = (closes) => {
  const macd = ti.MACD.calculate({
    values: closes,
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    SimpleMAOscillator: false,
    SimpleMASignal: false
  });
  return macd.length > 0 ? macd[macd.length - 1] : null;
};

// 이동평균 계산
const calculateSMA = (closes, period) => {
  const sma = ti.SMA.calculate({
    values: closes,
    period: period
  });
  return sma.length > 0 ? sma[sma.length - 1] : null;
};

// EMA 계산
const calculateEMA = (closes, period) => {
  const ema = ti.EMA.calculate({
    values: closes,
    period: period
  });
  return ema.length > 0 ? ema[ema.length - 1] : null;
};

// 볼린저 밴드 계산
const calculateBollingerBands = (closes, period = 20, stdDev = 2) => {
  const bb = ti.BollingerBands.calculate({
    values: closes,
    period: period,
    stdDev: stdDev
  });
  return bb.length > 0 ? bb[bb.length - 1] : null;
};

// Stochastic 계산
const calculateStochastic = (highs, lows, closes, period = 14) => {
  const stoch = ti.Stochastic.calculate({
    high: highs,
    low: lows,
    close: closes,
    period: period,
    signalPeriod: 3
  });
  return stoch.length > 0 ? stoch[stoch.length - 1] : null;
};

// ATR (Average True Range) 계산
const calculateATR = (highs, lows, closes, period = 14) => {
  const atr = ti.ATR.calculate({
    high: highs,
    low: lows,
    close: closes,
    period: period
  });
  return atr.length > 0 ? atr[atr.length - 1] : null;
};

// ADX (Average Directional Index) 계산
const calculateADX = (highs, lows, closes, period = 14) => {
  const adx = ti.ADX.calculate({
    high: highs,
    low: lows,
    close: closes,
    period: period
  });
  return adx.length > 0 ? adx[adx.length - 1] : null;
};

// OBV (On Balance Volume) 계산
const calculateOBV = (closes, volumes) => {
  const obv = ti.OBV.calculate({
    close: closes,
    volume: volumes
  });
  return obv.length > 0 ? obv[obv.length - 1] : null;
};

/**
 * 모든 지표를 한번에 계산
 * @param {Object} data - { closes, highs, lows, volumes }
 * @returns {Object} 계산된 모든 지표
 */
const calculateAllIndicators = (data) => {
  const { closes, highs, lows, volumes } = data;

  if (!closes || closes.length < 30) {
    throw new Error('최소 30개의 데이터 포인트가 필요합니다');
  }

  const currentPrice = closes[closes.length - 1];
  const macd = calculateMACD(closes);
  const bb = calculateBollingerBands(closes);
  const stoch = calculateStochastic(highs, lows, closes);
  const adx = calculateADX(highs, lows, closes);

  // 거래량 분석
  const avgVolume = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
  const currentVolume = volumes[volumes.length - 1];
  const volumeRatio = ((currentVolume / avgVolume) * 100).toFixed(1);

  // 가격 변화
  const priceChange24h = ((currentPrice - closes[closes.length - 2]) / closes[closes.length - 2] * 100).toFixed(2);
  const priceChange7d = closes.length >= 7
    ? ((currentPrice - closes[closes.length - 7]) / closes[closes.length - 7] * 100).toFixed(2)
    : null;

  return {
    price: {
      current: currentPrice,
      change24h: parseFloat(priceChange24h),
      change7d: priceChange7d ? parseFloat(priceChange7d) : null,
      high24h: Math.max(...closes.slice(-1)),
      low24h: Math.min(...closes.slice(-1)),
    },
    rsi: {
      value: calculateRSI(closes, 14)?.toFixed(2),
      interpretation: interpretRSI(calculateRSI(closes, 14))
    },
    macd: {
      macd: macd?.MACD?.toFixed(4),
      signal: macd?.signal?.toFixed(4),
      histogram: macd?.histogram?.toFixed(4),
      interpretation: interpretMACD(macd)
    },
    movingAverages: {
      sma20: calculateSMA(closes, 20)?.toFixed(2),
      sma50: calculateSMA(closes, 50)?.toFixed(2),
      sma200: calculateSMA(closes, 200)?.toFixed(2),
      ema12: calculateEMA(closes, 12)?.toFixed(2),
      ema26: calculateEMA(closes, 26)?.toFixed(2),
    },
    bollingerBands: {
      upper: bb?.upper?.toFixed(2),
      middle: bb?.middle?.toFixed(2),
      lower: bb?.lower?.toFixed(2),
      interpretation: interpretBB(currentPrice, bb)
    },
    stochastic: {
      k: stoch?.k?.toFixed(2),
      d: stoch?.d?.toFixed(2),
      interpretation: interpretStochastic(stoch)
    },
    adx: {
      value: adx?.adx?.toFixed(2),
      ppiDI: adx?.pdi?.toFixed(2),
      mdi: adx?.mdi?.toFixed(2),
      interpretation: interpretADX(adx)
    },
    volume: {
      current: currentVolume,
      average20d: avgVolume,
      ratio: volumeRatio + '%',
      interpretation: interpretVolume(volumeRatio)
    },
    atr: {
      value: calculateATR(highs, lows, closes)?.toFixed(2)
    }
  };
};

// 해석 함수들
const interpretRSI = (rsi) => {
  if (!rsi) return '데이터 부족';
  if (rsi >= 70) return '과매수 구간 (하락 가능성)';
  if (rsi <= 30) return '과매도 구간 (상승 가능성)';
  if (rsi >= 60) return '강세';
  if (rsi <= 40) return '약세';
  return '중립';
};

const interpretMACD = (macd) => {
  if (!macd) return '데이터 부족';
  if (macd.histogram > 0 && macd.MACD > macd.signal) return '상승 모멘텀 (매수 신호)';
  if (macd.histogram < 0 && macd.MACD < macd.signal) return '하락 모멘텀 (매도 신호)';
  return '중립';
};

const interpretBB = (price, bb) => {
  if (!bb) return '데이터 부족';
  if (price > bb.upper) return '상단 밴드 돌파 (과매수)';
  if (price < bb.lower) return '하단 밴드 돌파 (과매도)';
  return '밴드 내 정상';
};

const interpretStochastic = (stoch) => {
  if (!stoch) return '데이터 부족';
  if (stoch.k > 80) return '과매수 구간';
  if (stoch.k < 20) return '과매도 구간';
  return '중립';
};

const interpretADX = (adx) => {
  if (!adx) return '데이터 부족';
  if (adx.adx > 25) return '강한 추세';
  return '약한 추세/횡보';
};

const interpretVolume = (ratio) => {
  const r = parseFloat(ratio);
  if (r > 150) return '거래량 급증 (관심 증가)';
  if (r > 120) return '거래량 증가';
  if (r < 50) return '거래량 감소 (관심 저조)';
  return '평균 거래량';
};

module.exports = {
  calculateRSI,
  calculateMACD,
  calculateSMA,
  calculateEMA,
  calculateBollingerBands,
  calculateStochastic,
  calculateATR,
  calculateADX,
  calculateOBV,
  calculateAllIndicators
};

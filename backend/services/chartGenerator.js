/**
 * 차트 이미지 생성 서비스
 * GPT Vision 분석을 위한 캔들스틱 차트 생성
 */

const { createCanvas } = require('canvas');

// 차트 설정
const CHART_CONFIG = {
  width: 800,
  height: 600,
  padding: { top: 40, right: 60, bottom: 60, left: 70 },
  colors: {
    background: '#1a1a2e',
    grid: '#2d2d44',
    text: '#a0a0b0',
    bullish: '#00d4aa',  // 상승 (녹색)
    bearish: '#ff6b6b',  // 하락 (빨간색)
    ma20: '#ffd93d',     // 20일 이동평균선 (노란색)
    ma50: '#6bcb77',     // 50일 이동평균선 (초록색)
    volume: '#4d4d6d',   // 거래량
    rsiLine: '#ff9f43',  // RSI 라인
    rsiBg: '#2d2d44',    // RSI 배경
  }
};

/**
 * 캔들스틱 차트 이미지 생성
 * @param {Object} data - OHLCV 데이터 및 지표
 * @returns {string} Base64 인코딩된 PNG 이미지
 */
const generateCandlestickChart = (data) => {
  const { ohlcv, indicators, symbol, timeframeLabel } = data;
  const config = CHART_CONFIG;

  // 최근 60개 데이터만 사용 (너무 많으면 가독성 저하)
  const displayData = ohlcv.slice(-60);

  const canvas = createCanvas(config.width, config.height);
  const ctx = canvas.getContext('2d');

  // 배경
  ctx.fillStyle = config.colors.background;
  ctx.fillRect(0, 0, config.width, config.height);

  // 차트 영역 계산
  const chartArea = {
    x: config.padding.left,
    y: config.padding.top,
    width: config.width - config.padding.left - config.padding.right,
    height: (config.height - config.padding.top - config.padding.bottom) * 0.65, // 가격 차트 65%
  };

  const volumeArea = {
    x: config.padding.left,
    y: chartArea.y + chartArea.height + 10,
    width: chartArea.width,
    height: (config.height - config.padding.top - config.padding.bottom) * 0.2, // 거래량 20%
  };

  const rsiArea = {
    x: config.padding.left,
    y: volumeArea.y + volumeArea.height + 10,
    width: chartArea.width,
    height: (config.height - config.padding.top - config.padding.bottom) * 0.12, // RSI 12%
  };

  // 가격 범위 계산
  const prices = displayData.flatMap(d => [d.high, d.low]).filter(Boolean);
  const minPrice = Math.min(...prices) * 0.995;
  const maxPrice = Math.max(...prices) * 1.005;
  const priceRange = maxPrice - minPrice;

  // 거래량 범위
  const volumes = displayData.map(d => d.volume || 0);
  const maxVolume = Math.max(...volumes) * 1.1 || 1;

  // 그리드 그리기
  drawGrid(ctx, chartArea, config.colors.grid);
  drawGrid(ctx, volumeArea, config.colors.grid);
  drawGrid(ctx, rsiArea, config.colors.grid);

  // 가격 축 레이블
  drawPriceAxis(ctx, chartArea, minPrice, maxPrice, config.colors.text);

  // 캔들 너비 계산
  const candleWidth = Math.max(2, (chartArea.width / displayData.length) * 0.7);
  const candleGap = chartArea.width / displayData.length;

  // 이동평균선 데이터 준비
  const closes = displayData.map(d => d.close);
  const ma20 = calculateSMA(closes, 20);
  const ma50 = calculateSMA(closes, 50);

  // 이동평균선 그리기
  drawLine(ctx, chartArea, ma20, minPrice, priceRange, candleGap, config.colors.ma20, displayData.length);
  drawLine(ctx, chartArea, ma50, minPrice, priceRange, candleGap, config.colors.ma50, displayData.length);

  // 캔들스틱 그리기
  displayData.forEach((candle, i) => {
    const x = chartArea.x + (i + 0.5) * candleGap;
    const isBullish = candle.close >= candle.open;
    const color = isBullish ? config.colors.bullish : config.colors.bearish;

    // 심지 (wick)
    const highY = chartArea.y + chartArea.height - ((candle.high - minPrice) / priceRange) * chartArea.height;
    const lowY = chartArea.y + chartArea.height - ((candle.low - minPrice) / priceRange) * chartArea.height;

    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, highY);
    ctx.lineTo(x, lowY);
    ctx.stroke();

    // 몸통 (body)
    const openY = chartArea.y + chartArea.height - ((candle.open - minPrice) / priceRange) * chartArea.height;
    const closeY = chartArea.y + chartArea.height - ((candle.close - minPrice) / priceRange) * chartArea.height;
    const bodyTop = Math.min(openY, closeY);
    const bodyHeight = Math.max(1, Math.abs(closeY - openY));

    ctx.fillStyle = color;
    ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
  });

  // 거래량 바 그리기
  displayData.forEach((candle, i) => {
    const x = chartArea.x + (i + 0.5) * candleGap;
    const volume = candle.volume || 0;
    const barHeight = (volume / maxVolume) * volumeArea.height;
    const isBullish = candle.close >= candle.open;

    ctx.fillStyle = isBullish ? config.colors.bullish + '60' : config.colors.bearish + '60';
    ctx.fillRect(
      x - candleWidth / 2,
      volumeArea.y + volumeArea.height - barHeight,
      candleWidth,
      barHeight
    );
  });

  // RSI 그리기
  if (indicators?.rsi) {
    drawRSI(ctx, rsiArea, displayData, indicators, config.colors);
  }

  // 제목 및 정보
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px Arial';
  ctx.fillText(`${symbol} - ${timeframeLabel}`, config.padding.left, 25);

  // 현재 가격
  const lastPrice = displayData[displayData.length - 1]?.close;
  if (lastPrice) {
    ctx.fillStyle = config.colors.text;
    ctx.font = '12px Arial';
    ctx.fillText(`Price: $${lastPrice.toFixed(2)}`, config.padding.left + 200, 25);
  }

  // RSI 값
  if (indicators?.rsi?.value) {
    ctx.fillText(`RSI: ${indicators.rsi.value}`, config.padding.left + 350, 25);
  }

  // 범례
  drawLegend(ctx, config);

  // Base64 반환
  return canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');
};

/**
 * 그리드 그리기
 */
const drawGrid = (ctx, area, color) => {
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.5;

  // 수평선 (5개)
  for (let i = 0; i <= 4; i++) {
    const y = area.y + (i / 4) * area.height;
    ctx.beginPath();
    ctx.moveTo(area.x, y);
    ctx.lineTo(area.x + area.width, y);
    ctx.stroke();
  }

  // 수직선 (6개)
  for (let i = 0; i <= 5; i++) {
    const x = area.x + (i / 5) * area.width;
    ctx.beginPath();
    ctx.moveTo(x, area.y);
    ctx.lineTo(x, area.y + area.height);
    ctx.stroke();
  }
};

/**
 * 가격 축 그리기
 */
const drawPriceAxis = (ctx, area, minPrice, maxPrice, color) => {
  ctx.fillStyle = color;
  ctx.font = '10px Arial';
  ctx.textAlign = 'right';

  for (let i = 0; i <= 4; i++) {
    const price = minPrice + ((4 - i) / 4) * (maxPrice - minPrice);
    const y = area.y + (i / 4) * area.height;
    ctx.fillText(formatPrice(price), area.x - 5, y + 3);
  }
};

/**
 * 가격 포맷팅
 */
const formatPrice = (price) => {
  if (price >= 1000) return price.toFixed(0);
  if (price >= 1) return price.toFixed(2);
  return price.toFixed(4);
};

/**
 * 라인 그리기 (이동평균선 등)
 */
const drawLine = (ctx, area, values, minPrice, priceRange, candleGap, color, dataLength) => {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();

  let started = false;
  values.forEach((value, i) => {
    if (value === null || value === undefined) return;

    const x = area.x + (i + 0.5) * candleGap;
    const y = area.y + area.height - ((value - minPrice) / priceRange) * area.height;

    if (!started) {
      ctx.moveTo(x, y);
      started = true;
    } else {
      ctx.lineTo(x, y);
    }
  });

  ctx.stroke();
};

/**
 * SMA 계산
 */
const calculateSMA = (data, period) => {
  const result = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      result.push(sum / period);
    }
  }
  return result;
};

/**
 * RSI 영역 그리기
 */
const drawRSI = (ctx, area, displayData, indicators, colors) => {
  // RSI 배경
  ctx.fillStyle = colors.rsiBg;
  ctx.fillRect(area.x, area.y, area.width, area.height);

  // 70/30 라인
  ctx.strokeStyle = colors.text + '40';
  ctx.setLineDash([5, 5]);

  const y70 = area.y + (1 - 70/100) * area.height;
  const y30 = area.y + (1 - 30/100) * area.height;
  const y50 = area.y + (1 - 50/100) * area.height;

  ctx.beginPath();
  ctx.moveTo(area.x, y70);
  ctx.lineTo(area.x + area.width, y70);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(area.x, y30);
  ctx.lineTo(area.x + area.width, y30);
  ctx.stroke();

  ctx.setLineDash([]);

  // RSI 레이블
  ctx.fillStyle = colors.text;
  ctx.font = '9px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('70', area.x + 2, y70 + 3);
  ctx.fillText('30', area.x + 2, y30 + 3);
  ctx.fillText('RSI', area.x + 2, area.y + 10);

  // RSI 라인 (단순화: 마지막 RSI 값으로 수평선)
  const rsiValue = parseFloat(indicators.rsi.value);
  if (!isNaN(rsiValue)) {
    const rsiY = area.y + (1 - rsiValue/100) * area.height;
    ctx.strokeStyle = colors.rsiLine;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(area.x, rsiY);
    ctx.lineTo(area.x + area.width, rsiY);
    ctx.stroke();

    // RSI 값 표시
    ctx.fillStyle = colors.rsiLine;
    ctx.fillText(rsiValue.toFixed(1), area.x + area.width - 30, rsiY - 3);
  }
};

/**
 * 범례 그리기
 */
const drawLegend = (ctx, config) => {
  const legendX = config.width - config.padding.right - 120;
  const legendY = config.padding.top + 5;

  ctx.font = '10px Arial';

  // MA20
  ctx.fillStyle = config.colors.ma20;
  ctx.fillRect(legendX, legendY, 15, 3);
  ctx.fillStyle = config.colors.text;
  ctx.fillText('MA20', legendX + 20, legendY + 5);

  // MA50
  ctx.fillStyle = config.colors.ma50;
  ctx.fillRect(legendX + 60, legendY, 15, 3);
  ctx.fillStyle = config.colors.text;
  ctx.fillText('MA50', legendX + 80, legendY + 5);
};

/**
 * 미니 차트 생성 (썸네일용)
 */
const generateMiniChart = (ohlcv, width = 200, height = 100) => {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // 배경
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, width, height);

  const displayData = ohlcv.slice(-30);
  const closes = displayData.map(d => d.close).filter(Boolean);

  if (closes.length < 2) {
    return canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');
  }

  const minPrice = Math.min(...closes);
  const maxPrice = Math.max(...closes);
  const range = maxPrice - minPrice || 1;

  const padding = 10;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  // 라인 그리기
  const isUp = closes[closes.length - 1] >= closes[0];
  ctx.strokeStyle = isUp ? '#00d4aa' : '#ff6b6b';
  ctx.lineWidth = 2;
  ctx.beginPath();

  closes.forEach((price, i) => {
    const x = padding + (i / (closes.length - 1)) * chartWidth;
    const y = padding + (1 - (price - minPrice) / range) * chartHeight;

    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.stroke();

  // 그라데이션 채우기
  const gradient = ctx.createLinearGradient(0, padding, 0, height - padding);
  gradient.addColorStop(0, isUp ? '#00d4aa30' : '#ff6b6b30');
  gradient.addColorStop(1, '#1a1a2e00');

  ctx.lineTo(padding + chartWidth, height - padding);
  ctx.lineTo(padding, height - padding);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  return canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');
};

module.exports = {
  generateCandlestickChart,
  generateMiniChart,
  CHART_CONFIG
};

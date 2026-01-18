// 주식/코인 데이터 API 서비스

// CoinGecko API (무료, 키 불필요)
const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';

// Yahoo Finance API (비공식, 무료)
const YAHOO_FINANCE_BASE = 'https://query1.finance.yahoo.com/v8/finance';

// 인기 코인 ID 매핑
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
};

// 한국 주식 심볼 매핑 (Yahoo Finance용)
const KR_STOCKS = {
  '삼성전자': { symbol: '005930.KS', name: '삼성전자' },
  '카카오': { symbol: '035720.KS', name: '카카오' },
  '네이버': { symbol: '035420.KS', name: '네이버' },
  'SK하이닉스': { symbol: '000660.KS', name: 'SK하이닉스' },
  'LG에너지솔루션': { symbol: '373220.KS', name: 'LG에너지솔루션' },
  '현대차': { symbol: '005380.KS', name: '현대차' },
  '기아': { symbol: '000270.KS', name: '기아' },
  'POSCO홀딩스': { symbol: '005490.KS', name: 'POSCO홀딩스' },
  '삼성바이오로직스': { symbol: '207940.KS', name: '삼성바이오로직스' },
  '셀트리온': { symbol: '068270.KS', name: '셀트리온' },
};

// 미국 주식 심볼
const US_STOCKS = {
  'AAPL': { symbol: 'AAPL', name: '애플' },
  'MSFT': { symbol: 'MSFT', name: '마이크로소프트' },
  'GOOGL': { symbol: 'GOOGL', name: '구글' },
  'AMZN': { symbol: 'AMZN', name: '아마존' },
  'TSLA': { symbol: 'TSLA', name: '테슬라' },
  'NVDA': { symbol: 'NVDA', name: '엔비디아' },
  'META': { symbol: 'META', name: '메타' },
  'NFLX': { symbol: 'NFLX', name: '넷플릭스' },
  'AMD': { symbol: 'AMD', name: 'AMD' },
  'COIN': { symbol: 'COIN', name: '코인베이스' },
};

/**
 * 코인 가격 데이터 가져오기 (CoinGecko)
 */
export const getCryptoData = async (symbols = ['BTC', 'ETH']) => {
  try {
    const ids = symbols
      .map(s => COIN_IDS[s.toUpperCase()])
      .filter(Boolean)
      .join(',');

    if (!ids) return [];

    const response = await fetch(
      `${COINGECKO_BASE}/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&sparkline=false&price_change_percentage=24h`
    );

    if (!response.ok) throw new Error('CoinGecko API error');

    const data = await response.json();

    return data.map(coin => ({
      id: coin.id,
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      nameKr: getKoreanCoinName(coin.symbol.toUpperCase()),
      price: coin.current_price,
      change: parseFloat(coin.price_change_percentage_24h?.toFixed(2) || 0),
      marketCap: coin.market_cap,
      volume: coin.total_volume,
      high24h: coin.high_24h,
      low24h: coin.low_24h,
      image: coin.image,
      type: 'crypto',
    }));
  } catch (error) {
    console.error('Failed to fetch crypto data:', error);
    return [];
  }
};

/**
 * 인기 코인 목록 가져오기
 */
export const getTopCryptos = async (limit = 20) => {
  try {
    const response = await fetch(
      `${COINGECKO_BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${limit}&page=1&sparkline=false&price_change_percentage=24h`
    );

    if (!response.ok) throw new Error('CoinGecko API error');

    const data = await response.json();

    return data.map(coin => ({
      id: coin.id,
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      nameKr: getKoreanCoinName(coin.symbol.toUpperCase()),
      price: coin.current_price,
      change: parseFloat(coin.price_change_percentage_24h?.toFixed(2) || 0),
      marketCap: coin.market_cap,
      volume: coin.total_volume,
      image: coin.image,
      type: 'crypto',
    }));
  } catch (error) {
    console.error('Failed to fetch top cryptos:', error);
    return [];
  }
};

/**
 * 주식 가격 데이터 가져오기 (Yahoo Finance)
 */
export const getStockData = async (symbols = ['AAPL', 'TSLA']) => {
  try {
    const results = await Promise.all(
      symbols.map(async (symbol) => {
        try {
          // Yahoo Finance quote endpoint
          const response = await fetch(
            `${YAHOO_FINANCE_BASE}/chart/${symbol}?interval=1d&range=1d`
          );

          if (!response.ok) return null;

          const data = await response.json();
          const result = data.chart?.result?.[0];

          if (!result) return null;

          const meta = result.meta;
          const quote = result.indicators?.quote?.[0];
          const prevClose = meta.previousClose || meta.chartPreviousClose;
          const currentPrice = meta.regularMarketPrice;
          const change = prevClose ? ((currentPrice - prevClose) / prevClose * 100) : 0;

          return {
            symbol: meta.symbol,
            name: getStockName(meta.symbol),
            price: currentPrice,
            change: parseFloat(change.toFixed(2)),
            prevClose: prevClose,
            open: quote?.open?.[0],
            high: quote?.high?.[0],
            low: quote?.low?.[0],
            volume: quote?.volume?.[0],
            currency: meta.currency,
            market: meta.exchangeName,
            type: 'stock',
            region: meta.symbol.includes('.KS') || meta.symbol.includes('.KQ') ? 'KR' : 'US',
          };
        } catch (err) {
          console.error(`Failed to fetch ${symbol}:`, err);
          return null;
        }
      })
    );

    return results.filter(Boolean);
  } catch (error) {
    console.error('Failed to fetch stock data:', error);
    return [];
  }
};

/**
 * 인기 한국 주식 가져오기
 */
export const getTopKoreanStocks = async () => {
  const symbols = Object.values(KR_STOCKS).map(s => s.symbol);
  return getStockData(symbols);
};

/**
 * 인기 미국 주식 가져오기
 */
export const getTopUSStocks = async () => {
  const symbols = Object.values(US_STOCKS).map(s => s.symbol);
  return getStockData(symbols);
};

/**
 * 주식 검색 (Yahoo Finance)
 */
export const searchStocks = async (query) => {
  try {
    const response = await fetch(
      `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0`
    );

    if (!response.ok) throw new Error('Search API error');

    const data = await response.json();

    return (data.quotes || [])
      .filter(q => q.quoteType === 'EQUITY' || q.quoteType === 'CRYPTOCURRENCY')
      .map(q => ({
        symbol: q.symbol,
        name: q.shortname || q.longname,
        exchange: q.exchange,
        type: q.quoteType === 'CRYPTOCURRENCY' ? 'crypto' : 'stock',
      }));
  } catch (error) {
    console.error('Search failed:', error);
    return [];
  }
};

/**
 * 코인 검색 (CoinGecko)
 */
export const searchCryptos = async (query) => {
  try {
    const response = await fetch(
      `${COINGECKO_BASE}/search?query=${encodeURIComponent(query)}`
    );

    if (!response.ok) throw new Error('CoinGecko search error');

    const data = await response.json();

    return (data.coins || []).slice(0, 10).map(coin => ({
      id: coin.id,
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      image: coin.thumb,
      type: 'crypto',
    }));
  } catch (error) {
    console.error('Crypto search failed:', error);
    return [];
  }
};

/**
 * 통합 검색
 */
export const searchAll = async (query) => {
  const [stocks, cryptos] = await Promise.all([
    searchStocks(query),
    searchCryptos(query),
  ]);

  return [...cryptos, ...stocks];
};

/**
 * 차트 데이터 가져오기 (Yahoo Finance)
 */
export const getChartData = async (symbol, range = '1mo', interval = '1d') => {
  try {
    const response = await fetch(
      `${YAHOO_FINANCE_BASE}/chart/${symbol}?interval=${interval}&range=${range}`
    );

    if (!response.ok) throw new Error('Chart API error');

    const data = await response.json();
    const result = data.chart?.result?.[0];

    if (!result) return [];

    const timestamps = result.timestamp || [];
    const quotes = result.indicators?.quote?.[0] || {};

    return timestamps.map((timestamp, index) => ({
      timestamp: timestamp * 1000,
      date: new Date(timestamp * 1000).toLocaleDateString(),
      open: quotes.open?.[index],
      high: quotes.high?.[index],
      low: quotes.low?.[index],
      close: quotes.close?.[index],
      volume: quotes.volume?.[index],
    })).filter(d => d.close !== null);
  } catch (error) {
    console.error('Failed to fetch chart data:', error);
    return [];
  }
};

/**
 * 코인 차트 데이터 가져오기 (CoinGecko)
 */
export const getCryptoChartData = async (coinId, days = 30) => {
  try {
    const response = await fetch(
      `${COINGECKO_BASE}/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`
    );

    if (!response.ok) throw new Error('CoinGecko chart error');

    const data = await response.json();

    return (data.prices || []).map(([timestamp, price]) => ({
      timestamp,
      date: new Date(timestamp).toLocaleDateString(),
      price,
    }));
  } catch (error) {
    console.error('Failed to fetch crypto chart:', error);
    return [];
  }
};

// 헬퍼 함수들
const getKoreanCoinName = (symbol) => {
  const names = {
    BTC: '비트코인',
    ETH: '이더리움',
    XRP: '리플',
    SOL: '솔라나',
    DOGE: '도지코인',
    ADA: '에이다',
    AVAX: '아발란체',
    DOT: '폴카닷',
    MATIC: '폴리곤',
    LINK: '체인링크',
    BNB: '바이낸스코인',
    USDT: '테더',
    USDC: 'USD코인',
    SHIB: '시바이누',
    LTC: '라이트코인',
  };
  return names[symbol] || symbol;
};

const getStockName = (symbol) => {
  // 한국 주식
  for (const [name, info] of Object.entries(KR_STOCKS)) {
    if (info.symbol === symbol) return name;
  }
  // 미국 주식
  for (const [sym, info] of Object.entries(US_STOCKS)) {
    if (info.symbol === symbol) return info.name;
  }
  return symbol;
};

// 모든 사전 정의된 심볼 내보내기
export const PREDEFINED_SYMBOLS = {
  KR_STOCKS,
  US_STOCKS,
  COIN_IDS,
};

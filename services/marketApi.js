// 주식/코인 데이터 API 서비스

// CoinGecko API (무료, 키 불필요)
const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';

// 백엔드 API (Yahoo Finance 프록시)
const BACKEND_API = __DEV__
  ? 'http://localhost:3001/api'
  : 'https://stockai-backend-production.up.railway.app/api';

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
 * 주식 가격 데이터 가져오기 (백엔드 프록시 사용)
 */
export const getStockData = async (symbols = ['AAPL', 'TSLA']) => {
  try {
    const results = await Promise.all(
      symbols.map(async (symbol) => {
        try {
          // 백엔드 API를 통해 Yahoo Finance 데이터 가져오기
          const response = await fetch(`${BACKEND_API}/market/stock/${symbol}`);

          if (!response.ok) return null;

          const result = await response.json();

          if (!result.success || !result.data) return null;

          const data = result.data;

          return {
            symbol: data.symbol,
            name: getStockName(data.symbol),
            nameKr: getStockName(data.symbol),
            price: data.price,
            change: data.change || 0,
            prevClose: data.prevClose,
            currency: data.currency,
            market: data.exchange,
            type: 'stock',
            region: data.symbol.includes('.KS') || data.symbol.includes('.KQ') ? 'KR' : 'US',
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
 * 주식 검색 (백엔드 프록시 사용)
 */
export const searchStocks = async (query) => {
  try {
    const response = await fetch(
      `${BACKEND_API}/market/search?q=${encodeURIComponent(query)}`
    );

    if (!response.ok) throw new Error('Search API error');

    const result = await response.json();

    if (!result.success) return [];

    return result.data.stocks || [];
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
 * 한국어 검색어로 로컬 매핑에서 검색
 */
const searchLocalKorean = (query) => {
  const results = [];
  const lowerQuery = query.toLowerCase();

  // 코인 검색
  for (const [korean, data] of Object.entries(KOREAN_COIN_SEARCH)) {
    if (korean.includes(query) || data.symbol.toLowerCase().includes(lowerQuery) || data.name.toLowerCase().includes(lowerQuery)) {
      results.push({
        id: data.id,
        symbol: data.symbol,
        name: data.name,
        nameKr: korean,
        type: 'crypto',
      });
    }
  }

  // 주식 검색
  for (const [korean, data] of Object.entries(KOREAN_STOCK_SEARCH)) {
    if (korean.includes(query) || data.symbol.toLowerCase().includes(lowerQuery) || data.name.toLowerCase().includes(lowerQuery)) {
      results.push({
        symbol: data.symbol,
        name: data.name,
        nameKr: korean,
        type: data.type,
        exchange: data.exchange,
      });
    }
  }

  // 중복 제거 (심볼 기준)
  const seen = new Set();
  return results.filter(item => {
    if (seen.has(item.symbol)) return false;
    seen.add(item.symbol);
    return true;
  });
};

/**
 * 통합 검색
 */
export const searchAll = async (query) => {
  // 1. 먼저 로컬 한국어 매핑에서 검색
  const localResults = searchLocalKorean(query);

  // 2. 한국어가 포함되어 있으면 로컬 결과만 반환 (API는 한글 검색 미지원)
  const hasKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(query);

  if (hasKorean) {
    // 한국어 검색인 경우 로컬 결과 반환
    if (localResults.length > 0) {
      return localResults;
    }
    // 로컬에서 찾지 못하면 빈 결과 (API가 한글을 지원하지 않으므로)
    return [];
  }

  // 3. 영어 검색인 경우 API 검색도 수행
  const [stocks, cryptos] = await Promise.all([
    searchStocks(query),
    searchCryptos(query),
  ]);

  // 4. 로컬 결과와 API 결과 병합 (로컬 우선, 중복 제거)
  const apiResults = [...cryptos, ...stocks];
  const seen = new Set(localResults.map(r => r.symbol));

  const uniqueApiResults = apiResults.filter(item => {
    if (seen.has(item.symbol)) return false;
    seen.add(item.symbol);
    return true;
  });

  return [...localResults, ...uniqueApiResults];
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

// 한국어 코인명 -> 영어/심볼 매핑 (검색용)
const KOREAN_COIN_SEARCH = {
  '비트코인': { symbol: 'BTC', id: 'bitcoin', name: 'Bitcoin' },
  '비코': { symbol: 'BTC', id: 'bitcoin', name: 'Bitcoin' },
  '이더리움': { symbol: 'ETH', id: 'ethereum', name: 'Ethereum' },
  '이더': { symbol: 'ETH', id: 'ethereum', name: 'Ethereum' },
  '리플': { symbol: 'XRP', id: 'ripple', name: 'XRP' },
  '솔라나': { symbol: 'SOL', id: 'solana', name: 'Solana' },
  '도지코인': { symbol: 'DOGE', id: 'dogecoin', name: 'Dogecoin' },
  '도지': { symbol: 'DOGE', id: 'dogecoin', name: 'Dogecoin' },
  '에이다': { symbol: 'ADA', id: 'cardano', name: 'Cardano' },
  '카르다노': { symbol: 'ADA', id: 'cardano', name: 'Cardano' },
  '아발란체': { symbol: 'AVAX', id: 'avalanche-2', name: 'Avalanche' },
  '폴카닷': { symbol: 'DOT', id: 'polkadot', name: 'Polkadot' },
  '폴리곤': { symbol: 'MATIC', id: 'matic-network', name: 'Polygon' },
  '매틱': { symbol: 'MATIC', id: 'matic-network', name: 'Polygon' },
  '체인링크': { symbol: 'LINK', id: 'chainlink', name: 'Chainlink' },
  '링크': { symbol: 'LINK', id: 'chainlink', name: 'Chainlink' },
  '바이낸스코인': { symbol: 'BNB', id: 'binancecoin', name: 'BNB' },
  '바낸': { symbol: 'BNB', id: 'binancecoin', name: 'BNB' },
  '테더': { symbol: 'USDT', id: 'tether', name: 'Tether' },
  '시바이누': { symbol: 'SHIB', id: 'shiba-inu', name: 'Shiba Inu' },
  '시바': { symbol: 'SHIB', id: 'shiba-inu', name: 'Shiba Inu' },
  '라이트코인': { symbol: 'LTC', id: 'litecoin', name: 'Litecoin' },
  '트론': { symbol: 'TRX', id: 'tron', name: 'TRON' },
  '스텔라루멘': { symbol: 'XLM', id: 'stellar', name: 'Stellar' },
  '스텔라': { symbol: 'XLM', id: 'stellar', name: 'Stellar' },
  '유니스왑': { symbol: 'UNI', id: 'uniswap', name: 'Uniswap' },
  '아톰': { symbol: 'ATOM', id: 'cosmos', name: 'Cosmos' },
  '코스모스': { symbol: 'ATOM', id: 'cosmos', name: 'Cosmos' },
  '이오스': { symbol: 'EOS', id: 'eos', name: 'EOS' },
  '모네로': { symbol: 'XMR', id: 'monero', name: 'Monero' },
  '알고랜드': { symbol: 'ALGO', id: 'algorand', name: 'Algorand' },
  '비트코인캐시': { symbol: 'BCH', id: 'bitcoin-cash', name: 'Bitcoin Cash' },
  '앱토스': { symbol: 'APT', id: 'aptos', name: 'Aptos' },
  '아비트럼': { symbol: 'ARB', id: 'arbitrum', name: 'Arbitrum' },
  '옵티미즘': { symbol: 'OP', id: 'optimism', name: 'Optimism' },
  '수이': { symbol: 'SUI', id: 'sui', name: 'Sui' },
  '샌드박스': { symbol: 'SAND', id: 'the-sandbox', name: 'The Sandbox' },
  '엑시인피니티': { symbol: 'AXS', id: 'axie-infinity', name: 'Axie Infinity' },
  '디센트럴랜드': { symbol: 'MANA', id: 'decentraland', name: 'Decentraland' },
  '에이프코인': { symbol: 'APE', id: 'apecoin', name: 'ApeCoin' },
  '니어프로토콜': { symbol: 'NEAR', id: 'near', name: 'NEAR Protocol' },
  '니어': { symbol: 'NEAR', id: 'near', name: 'NEAR Protocol' },
  '파일코인': { symbol: 'FIL', id: 'filecoin', name: 'Filecoin' },
  '헤데라': { symbol: 'HBAR', id: 'hedera-hashgraph', name: 'Hedera' },
  '베이직어텐션토큰': { symbol: 'BAT', id: 'basic-attention-token', name: 'Basic Attention Token' },
  '그래프': { symbol: 'GRT', id: 'the-graph', name: 'The Graph' },
  '인터넷컴퓨터': { symbol: 'ICP', id: 'internet-computer', name: 'Internet Computer' },
  '클레이튼': { symbol: 'KLAY', id: 'klay-token', name: 'Klaytn' },
  '클레이': { symbol: 'KLAY', id: 'klay-token', name: 'Klaytn' },
};

// 한국어 주식명 -> 심볼 매핑 (검색용)
const KOREAN_STOCK_SEARCH = {
  // 미국 주식
  '애플': { symbol: 'AAPL', name: 'Apple Inc.', type: 'stock', exchange: 'NASDAQ' },
  '마이크로소프트': { symbol: 'MSFT', name: 'Microsoft Corporation', type: 'stock', exchange: 'NASDAQ' },
  'MS': { symbol: 'MSFT', name: 'Microsoft Corporation', type: 'stock', exchange: 'NASDAQ' },
  '구글': { symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'stock', exchange: 'NASDAQ' },
  '알파벳': { symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'stock', exchange: 'NASDAQ' },
  '아마존': { symbol: 'AMZN', name: 'Amazon.com Inc.', type: 'stock', exchange: 'NASDAQ' },
  '테슬라': { symbol: 'TSLA', name: 'Tesla Inc.', type: 'stock', exchange: 'NASDAQ' },
  '엔비디아': { symbol: 'NVDA', name: 'NVIDIA Corporation', type: 'stock', exchange: 'NASDAQ' },
  '엔디비아': { symbol: 'NVDA', name: 'NVIDIA Corporation', type: 'stock', exchange: 'NASDAQ' },
  '메타': { symbol: 'META', name: 'Meta Platforms Inc.', type: 'stock', exchange: 'NASDAQ' },
  '페이스북': { symbol: 'META', name: 'Meta Platforms Inc.', type: 'stock', exchange: 'NASDAQ' },
  '넷플릭스': { symbol: 'NFLX', name: 'Netflix Inc.', type: 'stock', exchange: 'NASDAQ' },
  '코인베이스': { symbol: 'COIN', name: 'Coinbase Global Inc.', type: 'stock', exchange: 'NASDAQ' },
  '버크셔해서웨이': { symbol: 'BRK-B', name: 'Berkshire Hathaway', type: 'stock', exchange: 'NYSE' },
  '월마트': { symbol: 'WMT', name: 'Walmart Inc.', type: 'stock', exchange: 'NYSE' },
  '디즈니': { symbol: 'DIS', name: 'Walt Disney Co.', type: 'stock', exchange: 'NYSE' },
  '나이키': { symbol: 'NKE', name: 'Nike Inc.', type: 'stock', exchange: 'NYSE' },
  '맥도날드': { symbol: 'MCD', name: "McDonald's Corp.", type: 'stock', exchange: 'NYSE' },
  '스타벅스': { symbol: 'SBUX', name: 'Starbucks Corp.', type: 'stock', exchange: 'NASDAQ' },
  '코카콜라': { symbol: 'KO', name: 'Coca-Cola Co.', type: 'stock', exchange: 'NYSE' },
  '펩시': { symbol: 'PEP', name: 'PepsiCo Inc.', type: 'stock', exchange: 'NASDAQ' },
  '인텔': { symbol: 'INTC', name: 'Intel Corporation', type: 'stock', exchange: 'NASDAQ' },
  '오라클': { symbol: 'ORCL', name: 'Oracle Corporation', type: 'stock', exchange: 'NYSE' },
  '세일즈포스': { symbol: 'CRM', name: 'Salesforce Inc.', type: 'stock', exchange: 'NYSE' },
  '어도비': { symbol: 'ADBE', name: 'Adobe Inc.', type: 'stock', exchange: 'NASDAQ' },
  '페이팔': { symbol: 'PYPL', name: 'PayPal Holdings Inc.', type: 'stock', exchange: 'NASDAQ' },
  '비자': { symbol: 'V', name: 'Visa Inc.', type: 'stock', exchange: 'NYSE' },
  '마스터카드': { symbol: 'MA', name: 'Mastercard Inc.', type: 'stock', exchange: 'NYSE' },
  // 한국 주식
  '삼성전자': { symbol: '005930.KS', name: '삼성전자', type: 'stock', exchange: 'KRX' },
  '삼성': { symbol: '005930.KS', name: '삼성전자', type: 'stock', exchange: 'KRX' },
  '카카오': { symbol: '035720.KS', name: '카카오', type: 'stock', exchange: 'KRX' },
  '네이버': { symbol: '035420.KS', name: '네이버', type: 'stock', exchange: 'KRX' },
  'SK하이닉스': { symbol: '000660.KS', name: 'SK하이닉스', type: 'stock', exchange: 'KRX' },
  '하이닉스': { symbol: '000660.KS', name: 'SK하이닉스', type: 'stock', exchange: 'KRX' },
  '현대차': { symbol: '005380.KS', name: '현대차', type: 'stock', exchange: 'KRX' },
  '현대자동차': { symbol: '005380.KS', name: '현대차', type: 'stock', exchange: 'KRX' },
  '기아': { symbol: '000270.KS', name: '기아', type: 'stock', exchange: 'KRX' },
  '셀트리온': { symbol: '068270.KS', name: '셀트리온', type: 'stock', exchange: 'KRX' },
  '삼성SDI': { symbol: '006400.KS', name: '삼성SDI', type: 'stock', exchange: 'KRX' },
  'LG화학': { symbol: '051910.KS', name: 'LG화학', type: 'stock', exchange: 'KRX' },
  'LG전자': { symbol: '066570.KS', name: 'LG전자', type: 'stock', exchange: 'KRX' },
  '포스코': { symbol: '005490.KS', name: 'POSCO홀딩스', type: 'stock', exchange: 'KRX' },
  '크래프톤': { symbol: '259960.KS', name: '크래프톤', type: 'stock', exchange: 'KRX' },
  '카카오뱅크': { symbol: '323410.KS', name: '카카오뱅크', type: 'stock', exchange: 'KRX' },
  '카카오페이': { symbol: '377300.KS', name: '카카오페이', type: 'stock', exchange: 'KRX' },
  '두산에너빌리티': { symbol: '034020.KS', name: '두산에너빌리티', type: 'stock', exchange: 'KRX' },
  '한화에어로스페이스': { symbol: '012450.KS', name: '한화에어로스페이스', type: 'stock', exchange: 'KRX' },
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

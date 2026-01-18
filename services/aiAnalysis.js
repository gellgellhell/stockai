/**
 * AI 분석 백엔드 연동 서비스
 * Node.js 백엔드와 통신하여 GPT 기반 점수 가져오기
 */

// 개발 환경에서는 localhost, 프로덕션에서는 실제 서버 URL 사용
const API_BASE = __DEV__
  ? 'http://localhost:3001/api'
  : 'https://your-production-server.com/api'; // 나중에 배포 URL로 변경

/**
 * 단일 종목 상세 분석 (GPT 사용)
 * @param {string} symbol - 종목 심볼 (예: 'BTC', 'AAPL')
 * @param {string} type - 'crypto' 또는 'stock'
 * @returns {Object} 분석 결과 (점수, 신호, 근거 등)
 */
export const getDetailedAnalysis = async (symbol, type = 'crypto') => {
  try {
    const response = await fetch(`${API_BASE}/analysis/score`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ symbol, type }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Detailed analysis error:', error);
    throw error;
  }
};

/**
 * 빠른 점수 조회 (비용 절감)
 * @param {string} symbol - 종목 심볼
 * @param {string} type - 'crypto' 또는 'stock'
 * @returns {Object} { score, signal, price, change24h }
 */
export const getQuickScore = async (symbol, type = 'crypto') => {
  try {
    const response = await fetch(
      `${API_BASE}/analysis/quick/${symbol}?type=${type}`
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Quick score error:', error);
    // 에러 시 기본값 반환
    return {
      symbol,
      score: 50,
      signal: '중립',
      error: error.message
    };
  }
};

/**
 * 여러 종목 일괄 점수 조회
 * @param {string[]} symbols - 종목 심볼 배열
 * @param {string} type - 'crypto' 또는 'stock'
 * @returns {Object[]} 각 종목의 점수 배열
 */
export const getBatchScores = async (symbols, type = 'crypto') => {
  try {
    const response = await fetch(`${API_BASE}/analysis/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ symbols, type }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Batch scores error:', error);
    // 에러 시 기본 점수 반환
    return symbols.map(symbol => ({
      symbol,
      score: 50,
      signal: '중립',
      error: error.message
    }));
  }
};

/**
 * 기술적 지표만 조회 (GPT 미사용, 무료)
 * @param {string} symbol - 종목 심볼
 * @param {string} type - 'crypto' 또는 'stock'
 * @returns {Object} 기술적 지표 데이터
 */
export const getIndicators = async (symbol, type = 'crypto') => {
  try {
    const response = await fetch(
      `${API_BASE}/analysis/indicators/${symbol}?type=${type}`
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Indicators error:', error);
    throw error;
  }
};

/**
 * 백엔드 헬스 체크
 * @returns {boolean} 서버 상태
 */
export const checkBackendHealth = async () => {
  try {
    const response = await fetch(`${API_BASE.replace('/api', '')}/health`);
    const data = await response.json();
    return data.status === 'ok';
  } catch (error) {
    console.error('Backend health check failed:', error);
    return false;
  }
};

/**
 * 점수에 따른 색상 반환
 */
export const getScoreColor = (score) => {
  if (score >= 70) return '#10B981'; // 초록
  if (score >= 40) return '#F59E0B'; // 노랑
  return '#EF4444'; // 빨강
};

/**
 * 점수에 따른 라벨 반환
 */
export const getScoreLabel = (score) => {
  if (score >= 80) return '강력매수';
  if (score >= 60) return '매수';
  if (score >= 40) return '중립';
  if (score >= 20) return '매도';
  return '강력매도';
};

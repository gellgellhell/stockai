/**
 * 구독 플랜 설정
 * 분석 등급 및 사용량 제한 정의
 */

// 분석 레벨 정의
const ANALYSIS_LEVELS = {
  LEVEL_1: {
    id: 1,
    name: 'Basic',
    nameKr: '기본 분석',
    description: '규칙 기반 분석',
    costPerRequest: 0, // 무료
    scoreFormat: 'grade', // Low, Middle, High
    features: ['RSI', 'MACD', '이동평균선'],
  },
  LEVEL_2: {
    id: 2,
    name: 'Standard',
    nameKr: 'AI 분석',
    description: 'GPT 텍스트 분석',
    costPerRequest: 0.001, // $0.001/회
    scoreFormat: 'grade', // Low, Middle, High (더 정확)
    features: ['기본 분석 포함', 'AI 패턴 해석', '매매 신호'],
  },
  LEVEL_3: {
    id: 3,
    name: 'Premium',
    nameKr: '프리미엄 분석',
    description: 'GPT Vision 차트 분석',
    costPerRequest: 0.02, // $0.02/회
    scoreFormat: 'numeric', // 1-100 점수
    features: ['AI 분석 포함', '차트 패턴 인식', '상세 점수', '지지/저항선'],
  },
};

// 구독 플랜 정의
const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    nameKr: '무료',
    price: 0,
    priceDisplay: '무료',
    period: null,
    limits: {
      watchlist: 1,           // 관심 종목 수
      dailyRefresh: 5,        // 일일 새로고침 횟수
      level1Analysis: -1,     // -1 = 무제한
      level2Analysis: 5,      // 일 5회
      level3Analysis: 0,      // 사용 불가
    },
    features: [
      { text: '종목 1개 등록', included: true },
      { text: '하루 5회 새로고침', included: true },
      { text: '기본 분석 (Low/Mid/High)', included: true },
      { text: 'AI 분석 5회/일', included: true },
      { text: '프리미엄 분석 (1-100점)', included: false },
      { text: '차트 패턴 인식', included: false },
    ],
  },
  basic: {
    id: 'basic',
    name: 'Basic',
    nameKr: '베이직',
    price: 4.99,
    priceDisplay: '$4.99',
    period: 'month',
    limits: {
      watchlist: 10,
      dailyRefresh: 50,
      level1Analysis: -1,
      level2Analysis: 50,
      level3Analysis: 5,
    },
    features: [
      { text: '종목 10개 등록', included: true },
      { text: '하루 50회 새로고침', included: true },
      { text: '기본 분석 무제한', included: true },
      { text: 'AI 분석 50회/일', included: true },
      { text: '프리미엄 분석 5회/일', included: true },
      { text: '차트 패턴 인식', included: true },
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    nameKr: '프로',
    price: 14.99,
    priceDisplay: '$14.99',
    period: 'month',
    popular: true,
    limits: {
      watchlist: 50,
      dailyRefresh: 200,
      level1Analysis: -1,
      level2Analysis: 200,
      level3Analysis: 30,
    },
    features: [
      { text: '종목 50개 등록', included: true },
      { text: '하루 200회 새로고침', included: true },
      { text: '기본 분석 무제한', included: true },
      { text: 'AI 분석 200회/일', included: true },
      { text: '프리미엄 분석 30회/일', included: true },
      { text: '우선 고객 지원', included: true },
    ],
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    nameKr: '프리미엄',
    price: 29.99,
    priceDisplay: '$29.99',
    period: 'month',
    limits: {
      watchlist: -1,          // 무제한
      dailyRefresh: 1000,     // 실질적 무제한 (악용 방지)
      level1Analysis: -1,
      level2Analysis: 1000,
      level3Analysis: 100,
    },
    features: [
      { text: '종목 무제한 등록', included: true },
      { text: '새로고침 1000회/일', included: true },
      { text: '기본 분석 무제한', included: true },
      { text: 'AI 분석 1000회/일', included: true },
      { text: '프리미엄 분석 100회/일', included: true },
      { text: '베타 기능 조기 접근', included: true },
    ],
  },
};

// 점수 등급 변환 (Level 1, 2용)
const scoreToGrade = (score) => {
  if (score >= 70) return { grade: 'High', gradeKr: '높음', color: '#10B981' };
  if (score >= 40) return { grade: 'Middle', gradeKr: '보통', color: '#F59E0B' };
  return { grade: 'Low', gradeKr: '낮음', color: '#EF4444' };
};

// 등급을 신호로 변환
const gradeToSignal = (grade) => {
  const signals = {
    'High': { signal: '매수 고려', signalKr: '매수 고려' },
    'Middle': { signal: '관망', signalKr: '관망' },
    'Low': { signal: '주의', signalKr: '주의' },
  };
  return signals[grade] || signals['Middle'];
};

// 플랜별 사용량 확인
const checkUsageLimit = (plan, usageType, currentUsage) => {
  const planConfig = PLANS[plan];
  if (!planConfig) return { allowed: false, message: '유효하지 않은 플랜' };

  const limit = planConfig.limits[usageType];
  if (limit === -1) return { allowed: true, remaining: -1 }; // 무제한

  if (currentUsage >= limit) {
    return {
      allowed: false,
      message: `일일 ${usageType} 한도 초과 (${limit}회)`,
      remaining: 0,
    };
  }

  return {
    allowed: true,
    remaining: limit - currentUsage,
  };
};

// 분석 레벨 결정 (사용자 플랜 기반)
const determineAnalysisLevel = (plan, requestedLevel = 3) => {
  const planConfig = PLANS[plan];
  if (!planConfig) return ANALYSIS_LEVELS.LEVEL_1;

  // 요청한 레벨이 플랜에서 허용되는지 확인
  if (requestedLevel === 3 && planConfig.limits.level3Analysis > 0) {
    return ANALYSIS_LEVELS.LEVEL_3;
  }
  if (requestedLevel >= 2 && planConfig.limits.level2Analysis > 0) {
    return ANALYSIS_LEVELS.LEVEL_2;
  }
  return ANALYSIS_LEVELS.LEVEL_1;
};

// 응답 포맷 (레벨에 따라 다른 형식)
const formatScoreResponse = (score, level) => {
  const levelConfig = ANALYSIS_LEVELS[`LEVEL_${level}`];

  if (levelConfig.scoreFormat === 'numeric') {
    // Level 3: 1-100 점수
    return {
      displayType: 'numeric',
      score: score,
      scoreDisplay: `${score}점`,
    };
  } else {
    // Level 1, 2: 등급 표시
    const gradeInfo = scoreToGrade(score);
    const signalInfo = gradeToSignal(gradeInfo.grade);
    return {
      displayType: 'grade',
      grade: gradeInfo.grade,
      gradeKr: gradeInfo.gradeKr,
      gradeColor: gradeInfo.color,
      signal: signalInfo.signal,
      signalKr: signalInfo.signalKr,
      // 내부적으로는 점수 유지 (업그레이드 유도용)
      _internalScore: score,
    };
  }
};

module.exports = {
  ANALYSIS_LEVELS,
  PLANS,
  scoreToGrade,
  gradeToSignal,
  checkUsageLimit,
  determineAnalysisLevel,
  formatScoreResponse,
};

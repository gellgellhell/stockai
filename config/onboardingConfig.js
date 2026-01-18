/**
 * 온보딩 화면 설정
 */

export const ONBOARDING_SCREENS = [
  {
    id: 'welcome',
    title: 'Stock AI에 오신 것을\n환영합니다',
    description: 'AI 기반 주식 분석으로\n더 스마트한 투자 결정을 내리세요',
    icon: 'rocket-outline',
    color: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  {
    id: 'analysis',
    title: 'AI 차트 분석',
    description: 'GPT-4 Vision이 차트를 분석하고\n매수/매도 시점을 알려드립니다',
    icon: 'analytics-outline',
    color: '#8B5CF6',
    backgroundColor: '#F5F3FF',
    features: [
      'Level 1: 기본 기술적 분석',
      'Level 2: 심층 패턴 분석',
      'Level 3: AI 비전 분석',
    ],
  },
  {
    id: 'watchlist',
    title: '관심종목 관리',
    description: '관심 종목을 그룹별로 정리하고\n실시간 가격 알림을 받으세요',
    icon: 'star-outline',
    color: '#F59E0B',
    backgroundColor: '#FFFBEB',
    features: [
      '그룹별 종목 관리',
      '메모 및 목표가 설정',
      '실시간 가격 알림',
    ],
  },
  {
    id: 'alerts',
    title: '스마트 알림',
    description: '목표가 도달, 분석 완료 시\n푸시 알림으로 바로 확인하세요',
    icon: 'notifications-outline',
    color: '#10B981',
    backgroundColor: '#ECFDF5',
    features: [
      '가격 도달 알림',
      '분석 완료 알림',
      '일일 시장 요약',
    ],
  },
  {
    id: 'subscription',
    title: '플랜 선택',
    description: '무료로 시작하고\n필요에 따라 업그레이드하세요',
    icon: 'diamond-outline',
    color: '#EC4899',
    backgroundColor: '#FDF2F8',
    plans: [
      { name: 'Free', description: '기본 분석 5회/일' },
      { name: 'Basic', description: 'Level 2 분석 무제한' },
      { name: 'Pro', description: '모든 기능 무제한' },
    ],
  },
];

export const ONBOARDING_STORAGE_KEY = '@stockai_onboarding_completed';

export default ONBOARDING_SCREENS;

/**
 * 인앱결제 설정
 * iOS App Store & Google Play Store 상품 ID
 */

import { Platform } from 'react-native';

// 구독 상품 ID (스토어에 등록된 ID와 일치해야 함)
export const SUBSCRIPTION_SKUS = {
  ios: {
    basic_monthly: 'com.stockai.analyzer.basic.monthly',
    basic_yearly: 'com.stockai.analyzer.basic.yearly',
    pro_monthly: 'com.stockai.analyzer.pro.monthly',
    pro_yearly: 'com.stockai.analyzer.pro.yearly',
    premium_monthly: 'com.stockai.analyzer.premium.monthly',
    premium_yearly: 'com.stockai.analyzer.premium.yearly',
  },
  android: {
    basic_monthly: 'basic_monthly',
    basic_yearly: 'basic_yearly',
    pro_monthly: 'pro_monthly',
    pro_yearly: 'pro_yearly',
    premium_monthly: 'premium_monthly',
    premium_yearly: 'premium_yearly',
  },
};

// 현재 플랫폼의 SKU
export const getSkus = () => {
  const platform = Platform.OS;
  return SUBSCRIPTION_SKUS[platform] || SUBSCRIPTION_SKUS.android;
};

// 구독 상품 정보
export const SUBSCRIPTION_PRODUCTS = [
  {
    id: 'basic',
    name: 'Basic',
    nameKr: '베이직',
    description: '기본적인 AI 분석 기능',
    features: [
      'Level 1 분석 무제한',
      'Level 2 분석 15회/일',
      '새로고침 30회/일',
      '광고 감소',
    ],
    monthlyPrice: 4900,
    yearlyPrice: 49000,
    yearlyDiscount: '17%',
    color: '#4CAF50',
    skuMonthly: 'basic_monthly',
    skuYearly: 'basic_yearly',
  },
  {
    id: 'pro',
    name: 'Pro',
    nameKr: '프로',
    description: '전문가를 위한 고급 분석',
    features: [
      'Level 1, 2 분석 무제한',
      'Level 3 분석 10회/일',
      '새로고침 무제한',
      '광고 완전 제거',
      '우선 지원',
    ],
    monthlyPrice: 9900,
    yearlyPrice: 99000,
    yearlyDiscount: '17%',
    color: '#2196F3',
    recommended: true,
    skuMonthly: 'pro_monthly',
    skuYearly: 'pro_yearly',
  },
  {
    id: 'premium',
    name: 'Premium',
    nameKr: '프리미엄',
    description: '모든 기능 무제한 이용',
    features: [
      '모든 분석 무제한',
      'GPT-4 Vision 분석',
      '실시간 알림',
      '전용 고객 지원',
      'API 액세스',
    ],
    monthlyPrice: 19900,
    yearlyPrice: 199000,
    yearlyDiscount: '17%',
    color: '#9C27B0',
    skuMonthly: 'premium_monthly',
    skuYearly: 'premium_yearly',
  },
];

// 가격 포맷
export const formatPrice = (price, currency = 'KRW') => {
  if (currency === 'KRW') {
    return `₩${price.toLocaleString()}`;
  }
  return `$${(price / 1000).toFixed(2)}`;
};

// SKU로 상품 정보 찾기
export const getProductBySku = (sku) => {
  for (const product of SUBSCRIPTION_PRODUCTS) {
    if (product.skuMonthly === sku || product.skuYearly === sku) {
      return {
        ...product,
        isYearly: sku.includes('yearly'),
      };
    }
  }
  return null;
};

// 플랜 ID로 상품 정보 찾기
export const getProductByPlanId = (planId) => {
  return SUBSCRIPTION_PRODUCTS.find((p) => p.id === planId);
};

export default {
  SUBSCRIPTION_SKUS,
  SUBSCRIPTION_PRODUCTS,
  getSkus,
  formatPrice,
  getProductBySku,
  getProductByPlanId,
};

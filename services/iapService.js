/**
 * 인앱결제 서비스
 * react-native-iap 연동 및 백엔드 통신
 */

import { Platform } from 'react-native';
import { getSkus, getProductBySku } from '../config/iapConfig';

const API_BASE_URL = __DEV__
  ? 'http://localhost:3001/api'
  : 'https://stockai-backend-production.up.railway.app/api';

// react-native-iap가 설치된 경우에만 import
let RNIap = null;
try {
  RNIap = require('react-native-iap');
} catch (e) {
  console.log('react-native-iap not installed, using simulation mode');
}

/**
 * IAP 초기화
 */
export const initIAP = async () => {
  if (!RNIap) {
    console.log('IAP not available');
    return false;
  }

  try {
    const result = await RNIap.initConnection();
    console.log('IAP connection initialized:', result);

    // Android의 경우 소비되지 않은 구매 확인
    if (Platform.OS === 'android') {
      await RNIap.flushFailedPurchasesCachedAsPendingAndroid();
    }

    return true;
  } catch (error) {
    console.error('IAP init error:', error);
    return false;
  }
};

/**
 * IAP 연결 종료
 */
export const endIAP = async () => {
  if (!RNIap) return;

  try {
    await RNIap.endConnection();
  } catch (error) {
    console.error('IAP end error:', error);
  }
};

/**
 * 상품 정보 조회
 */
export const getProducts = async () => {
  if (!RNIap) {
    // 시뮬레이션 모드
    return getSimulatedProducts();
  }

  try {
    const skus = getSkus();
    const skuList = Object.values(skus);

    const subscriptions = await RNIap.getSubscriptions({ skus: skuList });

    return subscriptions.map((sub) => ({
      productId: sub.productId,
      title: sub.title,
      description: sub.description,
      price: sub.localizedPrice,
      priceValue: parseFloat(sub.price),
      currency: sub.currency,
      ...getProductBySku(sub.productId),
    }));
  } catch (error) {
    console.error('Get products error:', error);
    return getSimulatedProducts();
  }
};

/**
 * 시뮬레이션 상품 데이터
 */
const getSimulatedProducts = () => {
  const skus = getSkus();

  return [
    {
      productId: skus.basic_monthly,
      title: 'Basic (Monthly)',
      price: '₩4,900',
      priceValue: 4900,
      currency: 'KRW',
      id: 'basic',
      isYearly: false,
    },
    {
      productId: skus.basic_yearly,
      title: 'Basic (Yearly)',
      price: '₩49,000',
      priceValue: 49000,
      currency: 'KRW',
      id: 'basic',
      isYearly: true,
    },
    {
      productId: skus.pro_monthly,
      title: 'Pro (Monthly)',
      price: '₩9,900',
      priceValue: 9900,
      currency: 'KRW',
      id: 'pro',
      isYearly: false,
    },
    {
      productId: skus.pro_yearly,
      title: 'Pro (Yearly)',
      price: '₩99,000',
      priceValue: 99000,
      currency: 'KRW',
      id: 'pro',
      isYearly: true,
    },
    {
      productId: skus.premium_monthly,
      title: 'Premium (Monthly)',
      price: '₩19,900',
      priceValue: 19900,
      currency: 'KRW',
      id: 'premium',
      isYearly: false,
    },
    {
      productId: skus.premium_yearly,
      title: 'Premium (Yearly)',
      price: '₩199,000',
      priceValue: 199000,
      currency: 'KRW',
      id: 'premium',
      isYearly: true,
    },
  ];
};

/**
 * 구독 구매
 */
export const purchaseSubscription = async (productId) => {
  if (!RNIap) {
    // 시뮬레이션 모드
    return simulatePurchase(productId);
  }

  try {
    // 구매 요청
    const purchase = await RNIap.requestSubscription({
      sku: productId,
      andDangerouslyFinishTransactionAutomaticallyIOS: false, // 수동 완료
    });

    return {
      success: true,
      purchase: {
        productId: purchase.productId,
        transactionId: purchase.transactionId,
        transactionReceipt: purchase.transactionReceipt,
        purchaseToken: purchase.purchaseToken, // Android
      },
    };
  } catch (error) {
    if (error.code === 'E_USER_CANCELLED') {
      return { success: false, cancelled: true };
    }
    console.error('Purchase error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 구매 시뮬레이션 (개발용)
 */
const simulatePurchase = async (productId) => {
  // 2초 대기 (결제 프로세스 시뮬레이션)
  await new Promise((resolve) => setTimeout(resolve, 2000));

  return {
    success: true,
    purchase: {
      productId,
      transactionId: `SIM_${Date.now()}`,
      transactionReceipt: 'simulated_receipt_data',
      purchaseToken: `token_${Date.now()}`,
    },
    simulated: true,
  };
};

/**
 * 구매 완료 처리 (트랜잭션 종료)
 */
export const finishTransaction = async (purchase) => {
  if (!RNIap) return;

  try {
    if (Platform.OS === 'ios') {
      await RNIap.finishTransaction({ purchase, isConsumable: false });
    } else {
      await RNIap.acknowledgePurchaseAndroid({ token: purchase.purchaseToken });
    }
  } catch (error) {
    console.error('Finish transaction error:', error);
  }
};

/**
 * 이전 구매 복원
 */
export const restorePurchases = async () => {
  if (!RNIap) {
    return { success: false, error: 'IAP not available' };
  }

  try {
    const purchases = await RNIap.getAvailablePurchases();

    return {
      success: true,
      purchases: purchases.map((p) => ({
        productId: p.productId,
        transactionId: p.transactionId,
        transactionReceipt: p.transactionReceipt,
        purchaseToken: p.purchaseToken,
      })),
    };
  } catch (error) {
    console.error('Restore error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 백엔드에 Apple 영수증 검증 요청
 */
export const verifyApplePurchase = async (userId, receiptData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/payment/verify/apple`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
      },
      body: JSON.stringify({ receiptData }),
    });

    return await response.json();
  } catch (error) {
    console.error('Verify Apple error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 백엔드에 Google 구매 검증 요청
 */
export const verifyGooglePurchase = async (userId, purchaseToken, productId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/payment/verify/google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
      },
      body: JSON.stringify({ purchaseToken, productId }),
    });

    return await response.json();
  } catch (error) {
    console.error('Verify Google error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 백엔드에 구매 복원 요청
 */
export const restoreWithBackend = async (userId, platform, data) => {
  try {
    const response = await fetch(`${API_BASE_URL}/payment/restore`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
      },
      body: JSON.stringify({
        platform,
        ...data,
      }),
    });

    return await response.json();
  } catch (error) {
    console.error('Restore with backend error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 현재 구독 상태 조회
 */
export const getSubscriptionStatus = async (userId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/payment/subscription`, {
      headers: {
        'x-user-id': userId,
      },
    });

    return await response.json();
  } catch (error) {
    console.error('Get subscription status error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 구독 취소 요청
 */
export const cancelSubscription = async (userId, reason) => {
  try {
    const response = await fetch(`${API_BASE_URL}/payment/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
      },
      body: JSON.stringify({ reason }),
    });

    return await response.json();
  } catch (error) {
    console.error('Cancel subscription error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 결제 시뮬레이션 (개발용)
 */
export const simulatePayment = async (userId, productId, platform = 'ios') => {
  try {
    const response = await fetch(`${API_BASE_URL}/payment/simulate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
      },
      body: JSON.stringify({ productId, platform }),
    });

    return await response.json();
  } catch (error) {
    console.error('Simulate payment error:', error);
    return { success: false, error: error.message };
  }
};

export default {
  initIAP,
  endIAP,
  getProducts,
  purchaseSubscription,
  finishTransaction,
  restorePurchases,
  verifyApplePurchase,
  verifyGooglePurchase,
  restoreWithBackend,
  getSubscriptionStatus,
  cancelSubscription,
  simulatePayment,
};

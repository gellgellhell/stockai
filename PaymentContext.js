/**
 * 결제 Context
 * 앱 전체에서 결제/구독 상태 관리
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Platform, Alert } from 'react-native';
import * as iapService from './services/iapService';
import { SUBSCRIPTION_PRODUCTS, getProductBySku } from './config/iapConfig';

const PaymentContext = createContext(null);

export const PaymentProvider = ({ children, userId }) => {
  // 상품 정보
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 구독 상태
  const [subscription, setSubscription] = useState({
    hasActiveSubscription: false,
    plan: 'free',
    expiresAt: null,
  });

  // 구매 진행 중
  const [purchasing, setPurchasing] = useState(false);

  // IAP 초기화
  useEffect(() => {
    const init = async () => {
      await iapService.initIAP();
      await loadProducts();
      if (userId) {
        await refreshSubscription();
      }
    };

    init();

    return () => {
      iapService.endIAP();
    };
  }, [userId]);

  // 상품 목록 로드
  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const fetchedProducts = await iapService.getProducts();

      // 설정된 상품 정보와 병합
      const mergedProducts = SUBSCRIPTION_PRODUCTS.map((configProduct) => {
        const monthlyProduct = fetchedProducts.find(
          (p) => p.productId?.includes(configProduct.id) && !p.productId?.includes('yearly')
        );
        const yearlyProduct = fetchedProducts.find(
          (p) => p.productId?.includes(configProduct.id) && p.productId?.includes('yearly')
        );

        return {
          ...configProduct,
          monthly: monthlyProduct || {
            productId: configProduct.skuMonthly,
            price: `₩${configProduct.monthlyPrice.toLocaleString()}`,
            priceValue: configProduct.monthlyPrice,
          },
          yearly: yearlyProduct || {
            productId: configProduct.skuYearly,
            price: `₩${configProduct.yearlyPrice.toLocaleString()}`,
            priceValue: configProduct.yearlyPrice,
          },
        };
      });

      setProducts(mergedProducts);
    } catch (err) {
      console.error('Load products error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // 구독 상태 새로고침
  const refreshSubscription = useCallback(async () => {
    if (!userId) return;

    try {
      const result = await iapService.getSubscriptionStatus(userId);
      if (result.success) {
        setSubscription(result.data);
      }
    } catch (err) {
      console.error('Refresh subscription error:', err);
    }
  }, [userId]);

  // 구독 구매
  const purchase = useCallback(
    async (productId, isYearly = false) => {
      if (!userId) {
        Alert.alert('로그인 필요', '구독하려면 먼저 로그인해주세요.');
        return { success: false, error: 'Not logged in' };
      }

      setPurchasing(true);
      setError(null);

      try {
        // 1. 스토어에서 구매
        const purchaseResult = await iapService.purchaseSubscription(productId);

        if (!purchaseResult.success) {
          if (purchaseResult.cancelled) {
            return { success: false, cancelled: true };
          }
          throw new Error(purchaseResult.error || 'Purchase failed');
        }

        const { purchase } = purchaseResult;

        // 2. 백엔드에서 검증
        let verifyResult;
        if (Platform.OS === 'ios') {
          verifyResult = await iapService.verifyApplePurchase(
            userId,
            purchase.transactionReceipt
          );
        } else {
          verifyResult = await iapService.verifyGooglePurchase(
            userId,
            purchase.purchaseToken,
            purchase.productId
          );
        }

        if (!verifyResult.success) {
          throw new Error(verifyResult.error || 'Verification failed');
        }

        // 3. 트랜잭션 완료
        await iapService.finishTransaction(purchase);

        // 4. 구독 상태 새로고침
        await refreshSubscription();

        return {
          success: true,
          subscription: verifyResult.data?.subscription,
        };
      } catch (err) {
        console.error('Purchase error:', err);
        setError(err.message);
        return { success: false, error: err.message };
      } finally {
        setPurchasing(false);
      }
    },
    [userId, refreshSubscription]
  );

  // 구매 복원
  const restore = useCallback(async () => {
    if (!userId) {
      Alert.alert('로그인 필요', '복원하려면 먼저 로그인해주세요.');
      return { success: false, error: 'Not logged in' };
    }

    setLoading(true);
    setError(null);

    try {
      // 1. 스토어에서 이전 구매 조회
      const restoreResult = await iapService.restorePurchases();

      if (!restoreResult.success) {
        throw new Error(restoreResult.error || 'Restore failed');
      }

      if (!restoreResult.purchases?.length) {
        return {
          success: false,
          error: '복원할 수 있는 구매 내역이 없습니다',
        };
      }

      // 2. 백엔드에서 복원 처리
      let backendResult;
      if (Platform.OS === 'ios') {
        // iOS는 영수증으로 복원
        const receipt = restoreResult.purchases[0]?.transactionReceipt;
        backendResult = await iapService.restoreWithBackend(userId, 'ios', { receipt });
      } else {
        // Android는 구매 목록으로 복원
        backendResult = await iapService.restoreWithBackend(userId, 'android', {
          purchases: restoreResult.purchases,
        });
      }

      if (!backendResult.success) {
        throw new Error(backendResult.error || 'Backend restore failed');
      }

      // 3. 구독 상태 새로고침
      await refreshSubscription();

      return {
        success: true,
        message: backendResult.data?.message || '구독이 복원되었습니다',
      };
    } catch (err) {
      console.error('Restore error:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [userId, refreshSubscription]);

  // 구독 취소
  const cancel = useCallback(
    async (reason) => {
      if (!userId) return { success: false, error: 'Not logged in' };

      try {
        const result = await iapService.cancelSubscription(userId, reason);

        if (result.success) {
          await refreshSubscription();
        }

        return result;
      } catch (err) {
        console.error('Cancel error:', err);
        return { success: false, error: err.message };
      }
    },
    [userId, refreshSubscription]
  );

  // 시뮬레이션 구매 (개발용)
  const simulatePurchase = useCallback(
    async (productId) => {
      if (!userId) return { success: false, error: 'Not logged in' };

      setPurchasing(true);
      try {
        const result = await iapService.simulatePayment(userId, productId);

        if (result.success) {
          await refreshSubscription();
        }

        return result;
      } catch (err) {
        console.error('Simulate error:', err);
        return { success: false, error: err.message };
      } finally {
        setPurchasing(false);
      }
    },
    [userId, refreshSubscription]
  );

  const value = {
    // 상태
    products,
    subscription,
    loading,
    purchasing,
    error,

    // 계산된 값
    currentPlan: subscription.plan,
    hasSubscription: subscription.hasActiveSubscription,
    isFreePlan: subscription.plan === 'free',

    // 메서드
    loadProducts,
    refreshSubscription,
    purchase,
    restore,
    cancel,
    simulatePurchase,
  };

  return (
    <PaymentContext.Provider value={value}>
      {children}
    </PaymentContext.Provider>
  );
};

export const usePayment = () => {
  const context = useContext(PaymentContext);
  if (!context) {
    throw new Error('usePayment must be used within a PaymentProvider');
  }
  return context;
};

export default PaymentContext;

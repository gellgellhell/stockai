/**
 * 결제 라우트
 * 인앱결제 검증 및 구독 관리 API
 */

const express = require('express');
const router = express.Router();
const {
  verifyAppleReceipt,
  verifyGooglePurchase,
  processPurchase,
  checkSubscriptionStatus,
  cancelSubscription,
  restoreSubscription,
  getSubscriptionHistory,
  getPaymentStats,
} = require('../services/paymentService');
const { extractUserId } = require('../middleware/usageMiddleware');
const { getOrCreateUser } = require('../services/usageService');
const { PLANS } = require('../config/plans');

/**
 * GET /api/payment/products
 * 구독 상품 목록 조회
 */
router.get('/products', (req, res) => {
  const products = Object.entries(PLANS)
    .filter(([key]) => key !== 'free')
    .map(([key, plan]) => ({
      id: key,
      name: plan.name,
      nameKr: plan.nameKr,
      price: plan.price,
      priceMonthly: plan.priceMonthly,
      limits: plan.limits,
      features: plan.features || [],
    }));

  res.json({
    success: true,
    data: { products },
  });
});

/**
 * GET /api/payment/subscription
 * 현재 구독 상태 조회
 */
router.get('/subscription', (req, res) => {
  try {
    const userId = extractUserId(req);
    const status = checkSubscriptionStatus(userId);
    const user = getOrCreateUser(userId);

    res.json({
      success: true,
      data: {
        ...status,
        currentPlan: user.plan,
        planDetails: PLANS[user.plan] || PLANS.free,
      },
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/payment/verify/apple
 * Apple App Store 영수증 검증
 */
router.post('/verify/apple', async (req, res) => {
  try {
    const userId = extractUserId(req);
    const { receiptData } = req.body;

    if (!receiptData) {
      return res.status(400).json({
        success: false,
        error: 'Receipt data is required',
      });
    }

    // 영수증 검증
    const verification = await verifyAppleReceipt(receiptData);

    if (!verification.valid) {
      return res.status(400).json({
        success: false,
        error: verification.error || 'Invalid receipt',
      });
    }

    // 구독 처리
    const result = processPurchase(userId, {
      productId: verification.productId,
      transactionId: verification.transactionId,
      platform: 'ios',
      expiresDate: verification.expiresDate,
      purchaseDate: verification.purchaseDate,
      receipt: receiptData,
    });

    res.json({
      success: true,
      data: {
        message: '구독이 활성화되었습니다',
        subscription: result,
        verification: {
          productId: verification.productId,
          expiresDate: verification.expiresDate,
          environment: verification.environment,
        },
      },
    });
  } catch (error) {
    console.error('Apple verify error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/payment/verify/google
 * Google Play 구매 검증
 */
router.post('/verify/google', async (req, res) => {
  try {
    const userId = extractUserId(req);
    const { purchaseToken, productId, packageName } = req.body;

    if (!purchaseToken || !productId) {
      return res.status(400).json({
        success: false,
        error: 'Purchase token and product ID are required',
      });
    }

    // 구매 검증
    const verification = await verifyGooglePurchase(
      purchaseToken,
      productId,
      packageName || 'com.stockai.analyzer'
    );

    if (!verification.valid) {
      return res.status(400).json({
        success: false,
        error: verification.error || 'Invalid purchase',
      });
    }

    // 구독 처리
    const result = processPurchase(userId, {
      productId: verification.productId,
      transactionId: verification.orderId,
      platform: 'android',
      expiresDate: verification.expiryTime,
      purchaseDate: verification.purchaseTime,
      receipt: purchaseToken,
    });

    res.json({
      success: true,
      data: {
        message: '구독이 활성화되었습니다',
        subscription: result,
        verification: {
          productId: verification.productId,
          expiryTime: verification.expiryTime,
          autoRenewing: verification.autoRenewing,
        },
      },
    });
  } catch (error) {
    console.error('Google verify error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/payment/restore
 * 이전 구매 복원
 */
router.post('/restore', async (req, res) => {
  try {
    const userId = extractUserId(req);
    const { platform, receipt, purchases } = req.body;

    if (!platform) {
      return res.status(400).json({
        success: false,
        error: 'Platform is required',
      });
    }

    let result;

    if (platform === 'ios') {
      if (!receipt) {
        return res.status(400).json({
          success: false,
          error: 'Receipt is required for iOS restore',
        });
      }
      result = await restoreSubscription(userId, platform, receipt);
    } else if (platform === 'android') {
      // Android는 개별 구매 처리
      if (!purchases || !purchases.length) {
        return res.status(400).json({
          success: false,
          error: 'Purchases array is required for Android restore',
        });
      }

      // 가장 최근 유효 구매 찾기
      for (const purchase of purchases) {
        const verification = await verifyGooglePurchase(
          purchase.purchaseToken,
          purchase.productId,
          'com.stockai.analyzer'
        );

        if (verification.valid && verification.expiryTime > new Date()) {
          const subscriptionResult = processPurchase(userId, {
            productId: verification.productId,
            transactionId: verification.orderId,
            platform: 'android',
            expiresDate: verification.expiryTime,
            purchaseDate: verification.purchaseTime,
            receipt: purchase.purchaseToken,
          });

          result = {
            success: true,
            message: '구독이 복원되었습니다',
            subscription: subscriptionResult,
          };
          break;
        }
      }

      if (!result) {
        result = {
          success: false,
          error: '복원할 수 있는 활성 구독이 없습니다',
        };
      }
    }

    if (result.success) {
      res.json({ success: true, data: result });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('Restore error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/payment/cancel
 * 구독 취소
 */
router.post('/cancel', (req, res) => {
  try {
    const userId = extractUserId(req);
    const { reason } = req.body;

    const result = cancelSubscription(userId, reason);

    if (result.success) {
      res.json({ success: true, data: result });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('Cancel error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/payment/history
 * 구독 내역 조회
 */
router.get('/history', (req, res) => {
  try {
    const userId = extractUserId(req);
    const limit = parseInt(req.query.limit) || 10;

    const history = getSubscriptionHistory(userId, limit);

    res.json({
      success: true,
      data: { history },
    });
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/payment/webhook/apple
 * Apple Server-to-Server 알림 (App Store Server Notifications)
 */
router.post('/webhook/apple', async (req, res) => {
  try {
    const { signedPayload } = req.body;

    // TODO: JWT 검증 및 처리
    // Apple의 Server Notifications V2 형식
    console.log('Apple webhook received:', signedPayload ? 'signed payload' : 'no payload');

    // 실제 구현시:
    // 1. JWT 서명 검증
    // 2. notification_type에 따른 처리
    //    - DID_RENEW: 갱신
    //    - DID_FAIL_TO_RENEW: 갱신 실패
    //    - EXPIRED: 만료
    //    - REFUND: 환불

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Apple webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/payment/webhook/google
 * Google Play Real-time Developer Notifications
 */
router.post('/webhook/google', async (req, res) => {
  try {
    const { message } = req.body;

    if (message?.data) {
      const data = JSON.parse(Buffer.from(message.data, 'base64').toString());
      console.log('Google webhook received:', data);

      // TODO: 알림 처리
      // data.subscriptionNotification.notificationType:
      // 1 = SUBSCRIPTION_RECOVERED
      // 2 = SUBSCRIPTION_RENEWED
      // 3 = SUBSCRIPTION_CANCELED
      // 4 = SUBSCRIPTION_PURCHASED
      // 5 = SUBSCRIPTION_ON_HOLD
      // 6 = SUBSCRIPTION_IN_GRACE_PERIOD
      // 7 = SUBSCRIPTION_RESTARTED
      // 12 = SUBSCRIPTION_EXPIRED
      // 13 = SUBSCRIPTION_REVOKED
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Google webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/payment/stats (관리자용)
 * 결제 통계
 */
router.get('/stats', (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const stats = getPaymentStats(days);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/payment/simulate (개발용)
 * 결제 시뮬레이션
 */
router.post('/simulate', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Not allowed in production' });
  }

  try {
    const userId = extractUserId(req);
    const { productId = 'pro_monthly', platform = 'ios' } = req.body;

    // 시뮬레이션 구매 처리
    const result = processPurchase(userId, {
      productId,
      transactionId: `SIM_${Date.now()}`,
      platform,
      expiresDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30일
      purchaseDate: new Date(),
      receipt: 'simulated_receipt',
    });

    res.json({
      success: true,
      data: {
        message: '시뮬레이션 구독이 활성화되었습니다',
        subscription: result,
      },
    });
  } catch (error) {
    console.error('Simulate error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

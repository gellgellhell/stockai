/**
 * 결제 서비스
 * 인앱결제 검증 및 구독 관리
 */

const db = require('../db/database');
const { PLANS } = require('../config/plans');

// 구독 상태
const SUBSCRIPTION_STATUS = {
  ACTIVE: 'active',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
  PENDING: 'pending',
  GRACE_PERIOD: 'grace_period',
};

// SKU와 플랜 매핑
const SKU_TO_PLAN = {
  'basic_monthly': 'basic',
  'basic_yearly': 'basic',
  'pro_monthly': 'pro',
  'pro_yearly': 'pro',
  'premium_monthly': 'premium',
  'premium_yearly': 'premium',
  'com.stockai.analyzer.basic.monthly': 'basic',
  'com.stockai.analyzer.basic.yearly': 'basic',
  'com.stockai.analyzer.pro.monthly': 'pro',
  'com.stockai.analyzer.pro.yearly': 'pro',
  'com.stockai.analyzer.premium.monthly': 'premium',
  'com.stockai.analyzer.premium.yearly': 'premium',
};

/**
 * Apple App Store 영수증 검증
 * 실제 구현시 Apple 서버와 통신 필요
 */
const verifyAppleReceipt = async (receiptData, isProduction = true) => {
  // Apple 검증 URL
  const verifyUrl = isProduction
    ? 'https://buy.itunes.apple.com/verifyReceipt'
    : 'https://sandbox.itunes.apple.com/verifyReceipt';

  try {
    const response = await fetch(verifyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        'receipt-data': receiptData,
        'password': process.env.APPLE_SHARED_SECRET, // App Store Connect에서 발급
        'exclude-old-transactions': true,
      }),
    });

    const result = await response.json();

    // status 0 = 유효한 영수증
    if (result.status === 0) {
      const latestReceipt = result.latest_receipt_info?.[0];

      return {
        valid: true,
        productId: latestReceipt?.product_id,
        transactionId: latestReceipt?.transaction_id,
        originalTransactionId: latestReceipt?.original_transaction_id,
        expiresDate: latestReceipt?.expires_date_ms
          ? new Date(parseInt(latestReceipt.expires_date_ms))
          : null,
        purchaseDate: latestReceipt?.purchase_date_ms
          ? new Date(parseInt(latestReceipt.purchase_date_ms))
          : null,
        isTrialPeriod: latestReceipt?.is_trial_period === 'true',
        environment: result.environment,
      };
    }

    // 21007 = Sandbox 영수증을 Production에서 검증 시도
    if (result.status === 21007 && isProduction) {
      return verifyAppleReceipt(receiptData, false);
    }

    return {
      valid: false,
      error: `Apple verification failed: status ${result.status}`,
    };
  } catch (error) {
    console.error('Apple receipt verification error:', error);
    return {
      valid: false,
      error: error.message,
    };
  }
};

/**
 * Google Play 구매 검증
 * 실제 구현시 Google API 사용 필요
 */
const verifyGooglePurchase = async (purchaseToken, productId, packageName) => {
  // Google Play Developer API 사용
  // 실제 구현시 google-auth-library 사용

  try {
    // 서비스 계정 인증 필요
    // const auth = new google.auth.GoogleAuth({
    //   keyFile: 'service-account.json',
    //   scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    // });

    // 개발용 시뮬레이션
    if (process.env.NODE_ENV !== 'production') {
      console.log('Google purchase verification (dev mode):', { purchaseToken, productId });
      return {
        valid: true,
        productId,
        orderId: `GPA.${Date.now()}`,
        purchaseTime: new Date(),
        expiryTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30일
        autoRenewing: true,
      };
    }

    // 실제 Google API 호출
    // const androidpublisher = google.androidpublisher({ version: 'v3', auth });
    // const result = await androidpublisher.purchases.subscriptions.get({
    //   packageName,
    //   subscriptionId: productId,
    //   token: purchaseToken,
    // });

    return {
      valid: false,
      error: 'Google verification not implemented',
    };
  } catch (error) {
    console.error('Google purchase verification error:', error);
    return {
      valid: false,
      error: error.message,
    };
  }
};

/**
 * 구매 처리 및 플랜 업그레이드
 */
const processPurchase = (userId, purchaseInfo) => {
  const {
    productId,
    transactionId,
    platform,
    expiresDate,
    purchaseDate,
    receipt,
  } = purchaseInfo;

  const planId = SKU_TO_PLAN[productId];

  if (!planId) {
    throw new Error(`Unknown product ID: ${productId}`);
  }

  const now = new Date().toISOString();
  const expiresAt = expiresDate ? expiresDate.toISOString() : null;

  // 기존 활성 구독 확인
  const existingSubscription = db.prepare(`
    SELECT * FROM subscriptions
    WHERE user_id = ? AND status = 'active'
    ORDER BY created_at DESC LIMIT 1
  `).get(userId);

  // 새 구독 생성
  const result = db.prepare(`
    INSERT INTO subscriptions (
      user_id, plan_id, product_id, transaction_id, platform,
      status, purchased_at, expires_at, receipt_data
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId,
    planId,
    productId,
    transactionId,
    platform,
    SUBSCRIPTION_STATUS.ACTIVE,
    purchaseDate?.toISOString() || now,
    expiresAt,
    receipt
  );

  // 사용자 플랜 업데이트
  db.prepare(`
    UPDATE users SET plan = ?, updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ?
  `).run(planId, userId);

  // 구독 이력 기록
  db.prepare(`
    INSERT INTO subscription_history (user_id, plan, action, started_at)
    VALUES (?, ?, 'subscribe', ?)
  `).run(userId, planId, now);

  // 이전 구독 만료 처리
  if (existingSubscription && existingSubscription.id !== result.lastInsertRowid) {
    db.prepare(`
      UPDATE subscriptions SET status = 'upgraded', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(existingSubscription.id);
  }

  return {
    subscriptionId: result.lastInsertRowid,
    planId,
    expiresAt,
    status: SUBSCRIPTION_STATUS.ACTIVE,
  };
};

/**
 * 구독 상태 확인 및 갱신
 */
const checkSubscriptionStatus = (userId) => {
  const subscription = db.prepare(`
    SELECT * FROM subscriptions
    WHERE user_id = ? AND status IN ('active', 'grace_period')
    ORDER BY created_at DESC LIMIT 1
  `).get(userId);

  if (!subscription) {
    return {
      hasActiveSubscription: false,
      plan: 'free',
    };
  }

  // 만료 확인
  if (subscription.expires_at) {
    const expiresAt = new Date(subscription.expires_at);
    const now = new Date();

    if (now > expiresAt) {
      // 유예 기간 (3일)
      const gracePeriodEnd = new Date(expiresAt.getTime() + 3 * 24 * 60 * 60 * 1000);

      if (now > gracePeriodEnd) {
        // 완전 만료
        db.prepare(`
          UPDATE subscriptions SET status = 'expired', updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(subscription.id);

        db.prepare(`
          UPDATE users SET plan = 'free', updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ?
        `).run(userId);

        return {
          hasActiveSubscription: false,
          plan: 'free',
          expiredAt: subscription.expires_at,
        };
      } else {
        // 유예 기간
        db.prepare(`
          UPDATE subscriptions SET status = 'grace_period', updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(subscription.id);

        return {
          hasActiveSubscription: true,
          plan: subscription.plan_id,
          status: SUBSCRIPTION_STATUS.GRACE_PERIOD,
          expiresAt: subscription.expires_at,
          gracePeriodEndsAt: gracePeriodEnd.toISOString(),
        };
      }
    }
  }

  return {
    hasActiveSubscription: true,
    plan: subscription.plan_id,
    status: subscription.status,
    expiresAt: subscription.expires_at,
    productId: subscription.product_id,
  };
};

/**
 * 구독 취소 처리
 */
const cancelSubscription = (userId, reason = null) => {
  const subscription = db.prepare(`
    SELECT * FROM subscriptions
    WHERE user_id = ? AND status = 'active'
    ORDER BY created_at DESC LIMIT 1
  `).get(userId);

  if (!subscription) {
    return { success: false, error: 'No active subscription found' };
  }

  // 상태를 cancelled로 변경 (만료일까지는 사용 가능)
  db.prepare(`
    UPDATE subscriptions
    SET status = 'cancelled', cancel_reason = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(reason, subscription.id);

  // 이력 기록
  db.prepare(`
    INSERT INTO subscription_history (user_id, plan, action, ended_at)
    VALUES (?, ?, 'cancel', CURRENT_TIMESTAMP)
  `).run(userId, subscription.plan_id);

  return {
    success: true,
    message: '구독이 취소되었습니다. 만료일까지 계속 이용 가능합니다.',
    expiresAt: subscription.expires_at,
  };
};

/**
 * 구독 복원 (이전 구매 복원)
 */
const restoreSubscription = async (userId, platform, receiptOrToken) => {
  let verificationResult;

  if (platform === 'ios') {
    verificationResult = await verifyAppleReceipt(receiptOrToken);
  } else {
    // Android는 개별 구매 토큰 필요
    return { success: false, error: 'Android restore requires individual purchase tokens' };
  }

  if (!verificationResult.valid) {
    return { success: false, error: verificationResult.error };
  }

  // 유효한 구독이면 복원
  if (verificationResult.expiresDate && verificationResult.expiresDate > new Date()) {
    const result = processPurchase(userId, {
      productId: verificationResult.productId,
      transactionId: verificationResult.transactionId,
      platform,
      expiresDate: verificationResult.expiresDate,
      purchaseDate: verificationResult.purchaseDate,
      receipt: receiptOrToken,
    });

    return {
      success: true,
      message: '구독이 복원되었습니다',
      subscription: result,
    };
  }

  return {
    success: false,
    error: '복원할 수 있는 활성 구독이 없습니다',
  };
};

/**
 * 사용자 구독 내역 조회
 */
const getSubscriptionHistory = (userId, limit = 10) => {
  return db.prepare(`
    SELECT * FROM subscriptions
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all(userId, limit);
};

/**
 * 결제 통계
 */
const getPaymentStats = (days = 30) => {
  const stats = db.prepare(`
    SELECT
      COUNT(*) as total_subscriptions,
      COUNT(DISTINCT user_id) as unique_subscribers,
      plan_id,
      COUNT(*) as count
    FROM subscriptions
    WHERE created_at >= date('now', '-' || ? || ' days')
    GROUP BY plan_id
  `).all(days);

  const revenue = db.prepare(`
    SELECT
      SUM(CASE
        WHEN plan_id = 'basic' THEN 4900
        WHEN plan_id = 'pro' THEN 9900
        WHEN plan_id = 'premium' THEN 19900
        ELSE 0
      END) as estimated_revenue
    FROM subscriptions
    WHERE created_at >= date('now', '-' || ? || ' days')
      AND status IN ('active', 'cancelled')
  `).get(days);

  return {
    stats,
    estimatedRevenue: revenue?.estimated_revenue || 0,
    period: `${days} days`,
  };
};

module.exports = {
  SUBSCRIPTION_STATUS,
  SKU_TO_PLAN,
  verifyAppleReceipt,
  verifyGooglePurchase,
  processPurchase,
  checkSubscriptionStatus,
  cancelSubscription,
  restoreSubscription,
  getSubscriptionHistory,
  getPaymentStats,
};

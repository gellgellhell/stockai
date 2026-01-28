import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Switch,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePayment } from './PaymentContext';
import { useTheme } from './ThemeContext';

// 웹 호환 알림 함수
const showAlert = (title, message, buttons) => {
  if (Platform.OS === 'web') {
    if (buttons && buttons.length > 1) {
      // 확인/취소 버튼이 있는 경우
      const confirmButton = buttons.find(b => b.text !== '취소');
      if (window.confirm(`${title}\n\n${message}`)) {
        confirmButton?.onPress?.();
      }
    } else {
      window.alert(`${title}\n\n${message}`);
    }
  } else {
    Alert.alert(title, message, buttons);
  }
};

// 분석 레벨 설명
const ANALYSIS_LEVELS = [
  {
    level: 1,
    name: '기본 분석',
    scoreType: 'Low / Middle / High',
    description: '규칙 기반 기술적 분석',
    icon: 'analytics-outline',
    color: '#6B7280',
  },
  {
    level: 2,
    name: 'AI 분석',
    scoreType: 'Low / Middle / High',
    description: 'GPT 기반 패턴 해석',
    icon: 'bulb-outline',
    color: '#3B82F6',
  },
  {
    level: 3,
    name: '프리미엄 분석',
    scoreType: '1-100점',
    description: 'AI Vision 차트 분석',
    icon: 'diamond-outline',
    color: '#8B5CF6',
  },
];

export default function SubscriptionScreen() {
  const { theme } = useTheme();
  const colors = theme.colors;
  const {
    products,
    subscription,
    currentPlan,
    purchasing,
    loading,
    purchase,
    restore,
    simulatePurchase,
  } = usePayment();

  const [selectedPlan, setSelectedPlan] = useState(currentPlan || 'free');
  const [isYearly, setIsYearly] = useState(false);
  const [restoring, setRestoring] = useState(false);

  // 구독 구매 처리
  const handleSubscribe = useCallback(async (planId) => {
    if (planId === 'free') {
      showAlert('알림', '현재 Free 플랜을 사용 중입니다.');
      return;
    }

    if (planId === currentPlan) {
      showAlert('알림', '이미 해당 플랜을 구독 중입니다.');
      return;
    }

    const product = products.find((p) => p.id === planId);
    if (!product) {
      showAlert('오류', '상품 정보를 찾을 수 없습니다.');
      return;
    }

    const selectedProduct = isYearly ? product.yearly : product.monthly;
    const priceText = isYearly
      ? `${product.yearlyPrice?.toLocaleString()}원/년`
      : `${product.monthlyPrice?.toLocaleString()}원/월`;

    const confirmMessage = `${priceText}으로 구독하시겠습니까?\n\n${isYearly ? '연간 결제 시 약 17% 할인!' : '7일 무료 체험 후 결제됩니다.'}`;

    const processPurchase = async () => {
      // 웹 또는 개발 모드에서는 시뮬레이션
      const result = (Platform.OS === 'web' || __DEV__)
        ? await simulatePurchase(selectedProduct?.productId || `${planId}_${isYearly ? 'yearly' : 'monthly'}`)
        : await purchase(selectedProduct.productId, isYearly);

      if (result.success) {
        showAlert('구독 완료', `${product.nameKr} 플랜이 활성화되었습니다!`);
      } else if (!result.cancelled) {
        showAlert('구독 실패', result.error || '결제 처리 중 오류가 발생했습니다.');
      }
    };

    showAlert(
      `${product.nameKr} 플랜 구독`,
      confirmMessage,
      [
        { text: '취소', style: 'cancel' },
        { text: '구독하기', onPress: processPurchase },
      ]
    );
  }, [products, currentPlan, isYearly, purchase, simulatePurchase]);

  // 구매 복원
  const handleRestore = useCallback(async () => {
    setRestoring(true);
    try {
      const result = await restore();
      if (result.success) {
        showAlert('복원 완료', result.message);
      } else {
        showAlert('복원 실패', result.error);
      }
    } finally {
      setRestoring(false);
    }
  }, [restore]);

  // 현재 플랜 정보
  const getCurrentPlanInfo = () => {
    if (currentPlan === 'free') return null;

    const plan = products.find((p) => p.id === currentPlan);
    return {
      ...plan,
      expiresAt: subscription.expiresAt,
      status: subscription.status,
    };
  };

  const currentPlanInfo = getCurrentPlanInfo();

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>플랜 선택</Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>더 정확한 AI 분석을 이용해보세요</Text>
      </View>

      {/* 현재 구독 상태 */}
      {currentPlanInfo && (
        <View style={[styles.currentPlanBanner, { backgroundColor: colors.primaryBg, borderColor: colors.primaryLight }]}>
          <View style={styles.currentPlanHeader}>
            <View style={[styles.currentPlanBadge, { backgroundColor: currentPlanInfo.color }]}>
              <Text style={styles.currentPlanBadgeText}>{currentPlanInfo.nameKr}</Text>
            </View>
            <Text style={[styles.currentPlanLabel, { color: colors.primary }]}>현재 구독 중</Text>
          </View>
          {subscription.expiresAt && (
            <Text style={[styles.currentPlanExpiry, { color: colors.textSecondary }]}>
              만료일: {new Date(subscription.expiresAt).toLocaleDateString('ko-KR')}
            </Text>
          )}
          {subscription.status === 'grace_period' && (
            <Text style={[styles.gracePeriodWarning, { color: colors.error }]}>
              결제 갱신이 필요합니다. 곧 만료됩니다.
            </Text>
          )}
        </View>
      )}

      {/* 결제 주기 토글 */}
      <View style={styles.billingToggle}>
        <Text style={[styles.billingOption, { color: colors.textTertiary }, !isYearly && { color: colors.text, fontWeight: '600' }]}>
          월간 결제
        </Text>
        <Switch
          value={isYearly}
          onValueChange={setIsYearly}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor="#fff"
        />
        <View style={styles.billingYearlyContainer}>
          <Text style={[styles.billingOption, { color: colors.textTertiary }, isYearly && { color: colors.text, fontWeight: '600' }]}>
            연간 결제
          </Text>
          <View style={[styles.discountBadge, { backgroundColor: colors.successBg }]}>
            <Text style={[styles.discountText, { color: colors.success }]}>17% 할인</Text>
          </View>
        </View>
      </View>

      {/* 분석 레벨 설명 */}
      <View style={styles.levelSection}>
        <Text style={[styles.levelSectionTitle, { color: colors.textSecondary }]}>분석 등급 안내</Text>
        <View style={styles.levelCards}>
          {ANALYSIS_LEVELS.map((level) => (
            <View key={level.level} style={[styles.levelCard, { backgroundColor: colors.card }]}>
              <View style={[styles.levelIcon, { backgroundColor: level.color + '20' }]}>
                <Ionicons name={level.icon} size={20} color={level.color} />
              </View>
              <Text style={[styles.levelName, { color: colors.text }]}>{level.name}</Text>
              <Text style={[styles.levelScoreType, { color: level.color }]}>
                {level.scoreType}
              </Text>
              <Text style={[styles.levelDescription, { color: colors.textTertiary }]}>{level.description}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Free 플랜 */}
      <TouchableOpacity
        style={[styles.planCard, { backgroundColor: colors.card, borderColor: colors.border }, selectedPlan === 'free' && { borderColor: colors.primary }]}
        onPress={() => setSelectedPlan('free')}
      >
        <View style={styles.planHeader}>
          <View>
            <Text style={[styles.planName, { color: colors.text }]}>Free</Text>
            <View style={styles.priceRow}>
              <Text style={[styles.planPrice, { color: colors.text }]}>무료</Text>
            </View>
          </View>
          <View style={[styles.radioButton, { borderColor: colors.border }, selectedPlan === 'free' && { borderColor: colors.primary }]}>
            {selectedPlan === 'free' && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
          </View>
        </View>
        <View style={styles.featuresContainer}>
          <FeatureItem text="Level 1 분석 무제한" included colors={colors} />
          <FeatureItem text="Level 2 분석 5회/일" included colors={colors} />
          <FeatureItem text="새로고침 10회/일" included colors={colors} />
          <FeatureItem text="광고 지원" included colors={colors} />
        </View>
        <TouchableOpacity
          style={[styles.subscribeButton, { backgroundColor: colors.surfaceSecondary }, currentPlan === 'free' && { backgroundColor: colors.border }]}
          onPress={() => handleSubscribe('free')}
          disabled={currentPlan === 'free'}
        >
          <Text style={[styles.subscribeButtonText, { color: colors.textSecondary }, currentPlan === 'free' && { color: colors.textTertiary }]}>
            {currentPlan === 'free' ? '현재 플랜' : '무료로 시작'}
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>

      {/* 유료 플랜들 */}
      {products.map((plan) => {
        const isSelected = selectedPlan === plan.id;
        const isCurrent = currentPlan === plan.id;
        const price = isYearly ? plan.yearly : plan.monthly;

        return (
          <TouchableOpacity
            key={plan.id}
            style={[styles.planCard, { backgroundColor: colors.card, borderColor: colors.border }, isSelected && { borderColor: colors.primary }]}
            onPress={() => setSelectedPlan(plan.id)}
          >
            {plan.recommended && (
              <View style={[styles.popularBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.popularText}>추천</Text>
              </View>
            )}

            <View style={styles.planHeader}>
              <View>
                <View style={styles.planNameRow}>
                  <Text style={[styles.planName, { color: colors.text }]}>{plan.name}</Text>
                  <View style={[styles.levelBadge, { backgroundColor: plan.color + '20' }]}>
                    <Text style={[styles.levelBadgeText, { color: plan.color }]}>
                      {plan.nameKr}
                    </Text>
                  </View>
                </View>
                <View style={styles.priceRow}>
                  <Text style={[styles.planPrice, { color: colors.text }, isSelected && { color: colors.primary }]}>
                    {price?.price || `₩${(isYearly ? plan.yearlyPrice : plan.monthlyPrice)?.toLocaleString()}`}
                  </Text>
                  <Text style={[styles.priceSubtext, { color: colors.textSecondary }]}>/{isYearly ? '년' : '월'}</Text>
                </View>
                {isYearly && (
                  <Text style={[styles.monthlyEquivalent, { color: colors.success }]}>
                    월 ₩{Math.round((plan.yearlyPrice || 0) / 12).toLocaleString()} 상당
                  </Text>
                )}
              </View>
              <View style={[styles.radioButton, { borderColor: colors.border }, isSelected && { borderColor: colors.primary }]}>
                {isSelected && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
              </View>
            </View>

            <View style={styles.featuresContainer}>
              {plan.features?.map((feature, index) => (
                <FeatureItem key={index} text={feature} included colors={colors} />
              ))}
            </View>

            <TouchableOpacity
              style={[
                styles.subscribeButton,
                { backgroundColor: colors.surfaceSecondary },
                isSelected && { backgroundColor: colors.primary },
                isCurrent && { backgroundColor: colors.border },
              ]}
              onPress={() => handleSubscribe(plan.id)}
              disabled={purchasing || isCurrent}
            >
              {purchasing && isSelected ? (
                <ActivityIndicator color={isSelected ? '#fff' : colors.textSecondary} />
              ) : (
                <Text style={[
                  styles.subscribeButtonText,
                  { color: colors.textSecondary },
                  isSelected && styles.subscribeButtonTextSelected,
                  isCurrent && { color: colors.textTertiary },
                ]}>
                  {isCurrent ? '현재 플랜' : '구독하기'}
                </Text>
              )}
            </TouchableOpacity>
          </TouchableOpacity>
        );
      })}

      {/* 복원 버튼 */}
      <TouchableOpacity
        style={styles.restoreButton}
        onPress={handleRestore}
        disabled={restoring}
      >
        {restoring ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <>
            <Ionicons name="refresh" size={18} color={colors.primary} />
            <Text style={[styles.restoreButtonText, { color: colors.primary }]}>이전 구매 복원</Text>
          </>
        )}
      </TouchableOpacity>

      <View style={styles.policyContainer}>
        <Ionicons name="shield-checkmark" size={18} color={colors.success} />
        <Text style={[styles.policyText, { color: colors.textSecondary }]}>7일 무료 체험 후 결제 • 언제든지 취소 가능</Text>
      </View>

      <View style={styles.noteContainer}>
        <Text style={[styles.noteText, { color: colors.textTertiary }]}>
          구독은 앱 스토어 설정에서 관리할 수 있습니다.
        </Text>
        <Text style={[styles.noteText, { color: colors.textTertiary }]}>
          구독은 현재 기간이 끝나기 24시간 전에 자동 갱신됩니다.
        </Text>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// 기능 항목 컴포넌트
const FeatureItem = ({ text, included, highlight, colors }) => (
  <View style={styles.featureItem}>
    <Ionicons
      name={included ? 'checkmark-circle' : 'close-circle'}
      size={18}
      color={included ? (highlight ? (colors?.primary || '#3B82F6') : (colors?.success || '#10B981')) : (colors?.border || '#D1D5DB')}
    />
    <Text style={[
      styles.featureText,
      { color: colors?.text || '#374151' },
      !included && { color: colors?.textTertiary || '#9CA3AF' },
      highlight && { fontWeight: '600', color: colors?.primary || '#3B82F6' }
    ]}>
      {text}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    padding: 24,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#6B7280',
  },
  currentPlanBanner: {
    backgroundColor: '#EEF2FF',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  currentPlanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  currentPlanBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  currentPlanBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  currentPlanLabel: {
    fontSize: 14,
    color: '#4F46E5',
    fontWeight: '500',
  },
  currentPlanExpiry: {
    fontSize: 13,
    color: '#6B7280',
  },
  gracePeriodWarning: {
    fontSize: 13,
    color: '#DC2626',
    marginTop: 4,
  },
  billingToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  billingOption: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  billingOptionActive: {
    color: '#1F2937',
    fontWeight: '600',
  },
  billingYearlyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  discountBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  discountText: {
    fontSize: 11,
    color: '#16A34A',
    fontWeight: '600',
  },
  levelSection: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  levelSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12,
  },
  levelCards: {
    flexDirection: 'row',
    gap: 8,
  },
  levelCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  levelIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  levelName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  levelScoreType: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
  },
  levelDescription: {
    fontSize: 9,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  planCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
  },
  planCardSelected: {
    borderColor: '#3B82F6',
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  planNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  planName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  levelBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  planPrice: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
  },
  planPriceSelected: {
    color: '#3B82F6',
  },
  priceSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
  },
  monthlyEquivalent: {
    fontSize: 12,
    color: '#10B981',
    marginTop: 2,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: '#3B82F6',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3B82F6',
  },
  featuresContainer: {
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  featureText: {
    fontSize: 14,
    color: '#374151',
  },
  featureTextDisabled: {
    color: '#9CA3AF',
  },
  featureTextHighlight: {
    fontWeight: '600',
    color: '#3B82F6',
  },
  subscribeButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  subscribeButtonSelected: {
    backgroundColor: '#3B82F6',
  },
  currentPlanButton: {
    backgroundColor: '#E5E7EB',
  },
  subscribeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  subscribeButtonTextSelected: {
    color: '#FFFFFF',
  },
  currentPlanButtonText: {
    color: '#9CA3AF',
  },
  restoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 8,
  },
  restoreButtonText: {
    fontSize: 14,
    color: '#3B82F6',
  },
  policyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 8,
  },
  policyText: {
    fontSize: 14,
    color: '#6B7280',
  },
  noteContainer: {
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 4,
  },
  noteText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});

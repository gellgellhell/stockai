/**
 * 광고 통합 사용 예시
 * 실제 화면에서 광고를 어떻게 사용하는지 보여주는 예시 코드
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// 광고 관련 imports
import { AdProvider, useAd } from '../AdContext';
import { RewardedAdButton, AdLimitModal } from '../components';
import { useAds, useUsageCheck } from '../hooks';

/**
 * 예시 1: 기본 리워드 광고 버튼 사용
 */
const BasicAdExample = () => {
  const handleRewardEarned = (result) => {
    Alert.alert('보상 획득!', result.message);
  };

  const handleError = (error) => {
    Alert.alert('오류', error);
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>기본 리워드 광고</Text>
      <RewardedAdButton
        buttonText="광고 보고 새로고침 얻기"
        rewardType="refresh"
        onRewardEarned={handleRewardEarned}
        onError={handleError}
      />
    </View>
  );
};

/**
 * 예시 2: 사용량 제한 시 광고 유도
 */
const UsageLimitExample = () => {
  const { showUsageLimitModal, hideLimitModal, showLimitModal, limitType } = useAds();
  const { usageInfo, hasRemaining, canUnlockWithAd } = useUsageCheck('level2');

  // 분석 요청 시뮬레이션
  const handleAnalysisRequest = useCallback(() => {
    if (!hasRemaining) {
      // 사용량 초과 - 광고 유도 모달 표시
      showUsageLimitModal('level2');
    } else {
      Alert.alert('분석 실행', `남은 사용량: ${usageInfo.remaining}`);
    }
  }, [hasRemaining, usageInfo, showUsageLimitModal]);

  const handleUpgrade = () => {
    Alert.alert('플랜 업그레이드', '구독 페이지로 이동합니다');
  };

  const handleAdWatched = (result) => {
    Alert.alert('보상 획득!', result.message);
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>사용량 제한 예시</Text>

      <View style={styles.usageInfo}>
        <Text style={styles.usageLabel}>Level 2 분석 남은 횟수:</Text>
        <Text style={styles.usageValue}>{usageInfo.remaining}</Text>
      </View>

      <TouchableOpacity
        style={[styles.button, !hasRemaining && styles.buttonDisabled]}
        onPress={handleAnalysisRequest}
      >
        <Text style={styles.buttonText}>Level 2 분석 실행</Text>
      </TouchableOpacity>

      {/* 광고 유도 모달 */}
      <AdLimitModal
        visible={showLimitModal}
        onClose={hideLimitModal}
        limitType={limitType}
        onUpgrade={handleUpgrade}
        onAdWatched={handleAdWatched}
      />
    </View>
  );
};

/**
 * 예시 3: 광고 상태 표시
 */
const AdStatusExample = () => {
  const { adStatus, usage, canWatchRewarded, refreshAdStatus } = useAd();

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>광고 상태</Text>

      <View style={styles.statusRow}>
        <Text style={styles.statusLabel}>광고 활성화:</Text>
        <Text style={styles.statusValue}>
          {adStatus.adsEnabled ? '예' : '아니오'}
        </Text>
      </View>

      <View style={styles.statusRow}>
        <Text style={styles.statusLabel}>리워드 광고 시청 가능:</Text>
        <Text style={styles.statusValue}>
          {canWatchRewarded ? '예' : '아니오'}
        </Text>
      </View>

      {adStatus.todaySummary && (
        <>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>오늘 시청한 광고:</Text>
            <Text style={styles.statusValue}>
              {adStatus.todaySummary.adsWatched}회
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>얻은 새로고침:</Text>
            <Text style={styles.statusValue}>
              +{adStatus.todaySummary.refreshEarned}회
            </Text>
          </View>
        </>
      )}

      <TouchableOpacity
        style={styles.refreshButton}
        onPress={refreshAdStatus}
      >
        <Ionicons name="refresh" size={16} color="#4CAF50" />
        <Text style={styles.refreshButtonText}>상태 새로고침</Text>
      </TouchableOpacity>
    </View>
  );
};

/**
 * 예시 4: 사용량 대시보드
 */
const UsageDashboard = () => {
  const { usage } = useAd();

  const usageTypes = [
    { key: 'refresh', label: '새로고침', icon: 'refresh' },
    { key: 'level1', label: 'Level 1', icon: 'analytics-outline' },
    { key: 'level2', label: 'Level 2', icon: 'analytics' },
    { key: 'level3', label: 'Level 3', icon: 'diamond' },
  ];

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>사용량 현황</Text>

      {usageTypes.map((type) => {
        const info = usage[type.key] || {};
        const isUnlimited = info.remaining === '무제한';

        return (
          <View key={type.key} style={styles.usageRow}>
            <View style={styles.usageRowLeft}>
              <Ionicons name={type.icon} size={20} color="#666" />
              <Text style={styles.usageRowLabel}>{type.label}</Text>
            </View>
            <View style={styles.usageRowRight}>
              {isUnlimited ? (
                <Text style={styles.unlimited}>무제한</Text>
              ) : (
                <>
                  <Text style={styles.usageRemaining}>
                    {info.remaining || 0}
                  </Text>
                  <Text style={styles.usageTotal}>
                    / {info.totalLimit || info.baseLimit || 0}
                  </Text>
                  {info.adBonus > 0 && (
                    <Text style={styles.adBonus}>+{info.adBonus}</Text>
                  )}
                </>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
};

/**
 * 메인 예시 컴포넌트
 */
const AdIntegrationExample = ({ userId = 'test-user' }) => {
  return (
    <AdProvider userId={userId}>
      <ScrollView style={styles.container}>
        <Text style={styles.title}>광고 통합 예시</Text>

        <BasicAdExample />
        <UsageLimitExample />
        <AdStatusExample />
        <UsageDashboard />

        <View style={styles.note}>
          <Ionicons name="information-circle" size={20} color="#666" />
          <Text style={styles.noteText}>
            이 예시는 개발 모드에서 광고 시뮬레이션을 사용합니다.
            실제 광고를 테스트하려면 EAS Build로 앱을 빌드하세요.
          </Text>
        </View>
      </ScrollView>
    </AdProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    padding: 20,
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  usageInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  usageLabel: {
    color: '#666',
    fontSize: 14,
  },
  usageValue: {
    color: '#333',
    fontSize: 14,
    fontWeight: '600',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statusLabel: {
    color: '#666',
    fontSize: 14,
  },
  statusValue: {
    color: '#333',
    fontSize: 14,
    fontWeight: '500',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginTop: 8,
  },
  refreshButtonText: {
    color: '#4CAF50',
    fontSize: 14,
  },
  usageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  usageRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  usageRowLabel: {
    color: '#333',
    fontSize: 14,
  },
  usageRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  usageRemaining: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600',
  },
  usageTotal: {
    color: '#999',
    fontSize: 14,
  },
  adBonus: {
    color: '#FF9800',
    fontSize: 12,
    fontWeight: '500',
  },
  unlimited: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: '500',
  },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#fff3e0',
    marginHorizontal: 16,
    marginBottom: 32,
    padding: 12,
    borderRadius: 8,
  },
  noteText: {
    flex: 1,
    color: '#666',
    fontSize: 12,
    lineHeight: 18,
  },
});

export default AdIntegrationExample;

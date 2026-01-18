/**
 * 리워드 광고 버튼 컴포넌트
 * 광고 시청 후 보상 지급
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAd } from '../AdContext';
import { AD_CONFIG } from '../config/adConfig';

// AdMob SDK가 설치된 경우에만 import
let RewardedAd, RewardedAdEventType, AdEventType, TestIds;
try {
  const MobileAds = require('react-native-google-mobile-ads');
  RewardedAd = MobileAds.RewardedAd;
  RewardedAdEventType = MobileAds.RewardedAdEventType;
  AdEventType = MobileAds.AdEventType;
  TestIds = MobileAds.TestIds;
} catch (e) {
  console.log('AdMob SDK not installed, using simulation mode');
}

const RewardedAdButton = ({
  onRewardEarned,
  onError,
  buttonText = '광고 보고 보상받기',
  rewardType = 'refresh', // refresh, level2
  style,
  disabled = false,
}) => {
  const {
    canWatchRewarded,
    adStatus,
    loading: contextLoading,
    startWatchingAd,
    completeWatchingAd,
    config,
  } = useAd();

  const [adLoading, setAdLoading] = useState(false);
  const [adLoaded, setAdLoaded] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [rewardedAd, setRewardedAd] = useState(null);

  // 광고 단위 ID
  const adUnitId = AD_CONFIG.adUnitIds?.rewarded || 'ca-app-pub-3940256099942544/5224354917';

  // AdMob 광고 초기화
  useEffect(() => {
    if (!RewardedAd) return;

    const ad = RewardedAd.createForAdRequest(adUnitId, {
      requestNonPersonalizedAdsOnly: true,
      keywords: ['stock', 'trading', 'finance'],
    });

    // 광고 로드 완료
    const loadedUnsubscribe = ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
      setAdLoaded(true);
      setAdLoading(false);
    });

    // 보상 획득
    const earnedUnsubscribe = ad.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      async (reward) => {
        console.log('User earned reward:', reward);
        // 백엔드에 보상 처리 요청
        const result = await completeWatchingAd('rewarded', adUnitId);

        if (result.success) {
          setModalMessage(`${result.message}`);
          setShowModal(true);
          onRewardEarned?.(result);
        } else {
          onError?.(result.error);
        }
      }
    );

    // 광고 닫힘
    const closedUnsubscribe = ad.addAdEventListener(AdEventType.CLOSED, () => {
      // 광고 다시 로드
      ad.load();
    });

    // 에러
    const errorUnsubscribe = ad.addAdEventListener(AdEventType.ERROR, (error) => {
      console.error('Ad error:', error);
      setAdLoading(false);
      onError?.(error);
    });

    setRewardedAd(ad);
    ad.load();

    return () => {
      loadedUnsubscribe();
      earnedUnsubscribe();
      closedUnsubscribe();
      errorUnsubscribe();
    };
  }, [adUnitId, completeWatchingAd, onRewardEarned, onError]);

  // 광고 시청 (AdMob SDK 사용)
  const handleWatchAd = useCallback(async () => {
    if (!canWatchRewarded) {
      const remaining = adStatus.rewarded?.remainingSeconds;
      if (remaining) {
        setModalMessage(`${remaining}초 후에 다시 시청할 수 있습니다`);
      } else {
        setModalMessage('오늘의 광고 시청 한도에 도달했습니다');
      }
      setShowModal(true);
      return;
    }

    // 백엔드에 광고 시청 시작 알림
    const startResult = await startWatchingAd('rewarded');
    if (!startResult.success) {
      setModalMessage(startResult.error || '광고를 시작할 수 없습니다');
      setShowModal(true);
      return;
    }

    // AdMob SDK가 있으면 실제 광고 표시
    if (rewardedAd && adLoaded) {
      rewardedAd.show();
    } else {
      // SDK가 없으면 시뮬레이션 모드
      await simulateAd();
    }
  }, [canWatchRewarded, adStatus, rewardedAd, adLoaded, startWatchingAd]);

  // 광고 시뮬레이션 (개발용)
  const simulateAd = useCallback(async () => {
    setShowModal(true);
    setModalMessage('광고 시청 중...');
    setAdLoading(true);

    // 5초 대기 (광고 시청 시뮬레이션)
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // 보상 처리
    const result = await completeWatchingAd('rewarded', 'simulator');

    setAdLoading(false);

    if (result.success) {
      setModalMessage(`${result.message}`);
      onRewardEarned?.(result);
    } else {
      setModalMessage(result.error || '보상 처리에 실패했습니다');
      onError?.(result.error);
    }
  }, [completeWatchingAd, onRewardEarned, onError]);

  // 예상 보상 표시
  const expectedReward = config.rewards?.rewarded?.[rewardType] || 0;
  const rewardLabel = rewardType === 'refresh' ? '새로고침' : 'Level 2 분석';

  const isDisabled = disabled || !canWatchRewarded || contextLoading || adLoading;

  return (
    <View>
      <TouchableOpacity
        style={[
          styles.button,
          isDisabled && styles.buttonDisabled,
          style,
        ]}
        onPress={handleWatchAd}
        disabled={isDisabled}
      >
        <Ionicons
          name="play-circle"
          size={24}
          color={isDisabled ? '#999' : '#fff'}
        />
        <View style={styles.buttonTextContainer}>
          <Text style={[styles.buttonText, isDisabled && styles.buttonTextDisabled]}>
            {buttonText}
          </Text>
          <Text style={[styles.rewardText, isDisabled && styles.buttonTextDisabled]}>
            +{expectedReward} {rewardLabel}
          </Text>
        </View>
        {(contextLoading || adLoading) && (
          <ActivityIndicator color="#fff" size="small" />
        )}
      </TouchableOpacity>

      {/* 결과 모달 */}
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {adLoading ? (
              <>
                <ActivityIndicator size="large" color="#4CAF50" />
                <Text style={styles.modalText}>{modalMessage}</Text>
              </>
            ) : (
              <>
                <Ionicons
                  name={modalMessage.includes('지급') ? 'checkmark-circle' : 'information-circle'}
                  size={48}
                  color={modalMessage.includes('지급') ? '#4CAF50' : '#FF9800'}
                />
                <Text style={styles.modalText}>{modalMessage}</Text>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => setShowModal(false)}
                >
                  <Text style={styles.modalButtonText}>확인</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 10,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonTextContainer: {
    flex: 1,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextDisabled: {
    color: '#999',
  },
  rewardText: {
    color: '#E8F5E9',
    fontSize: 12,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    width: '80%',
    maxWidth: 300,
  },
  modalText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 6,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default RewardedAdButton;

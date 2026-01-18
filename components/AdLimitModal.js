/**
 * 사용량 제한 모달
 * 사용량 초과 시 광고 시청 또는 플랜 업그레이드 유도
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAd } from '../AdContext';

const AdLimitModal = ({
  visible,
  onClose,
  limitType = 'refresh', // refresh, level1, level2, level3
  onUpgrade,
  onAdWatched,
}) => {
  const {
    adStatus,
    canWatchRewarded,
    startWatchingAd,
    completeWatchingAd,
    config,
    loading,
  } = useAd();

  const [adLoading, setAdLoading] = useState(false);
  const [resultMessage, setResultMessage] = useState('');

  // 타입별 라벨
  const typeLabels = {
    refresh: '새로고침',
    level1: 'Level 1 분석',
    level2: 'Level 2 분석',
    level3: 'Level 3 분석',
  };

  // 광고로 얻을 수 있는 보상
  const adReward = config.rewards?.rewarded?.[limitType] || 0;
  const canUnlockWithAd = adReward > 0 && canWatchRewarded;

  // 광고 시청
  const handleWatchAd = useCallback(async () => {
    setAdLoading(true);
    setResultMessage('');

    try {
      // 백엔드에 광고 시청 시작 알림
      const startResult = await startWatchingAd('rewarded');
      if (!startResult.success) {
        setResultMessage(startResult.error || '광고를 시작할 수 없습니다');
        setAdLoading(false);
        return;
      }

      // 광고 시뮬레이션 (실제로는 AdMob SDK 호출)
      setResultMessage('광고 시청 중...');
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // 보상 처리
      const result = await completeWatchingAd('rewarded', 'simulator');

      if (result.success) {
        setResultMessage(result.message);
        setTimeout(() => {
          onAdWatched?.(result);
          onClose?.();
        }, 1500);
      } else {
        setResultMessage(result.error || '보상 처리에 실패했습니다');
      }
    } catch (error) {
      setResultMessage('오류가 발생했습니다');
    } finally {
      setAdLoading(false);
    }
  }, [startWatchingAd, completeWatchingAd, onAdWatched, onClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* 헤더 */}
          <View style={styles.header}>
            <Ionicons name="alert-circle" size={48} color="#FF9800" />
            <Text style={styles.title}>사용량 제한 도달</Text>
            <Text style={styles.subtitle}>
              오늘의 {typeLabels[limitType]} 사용량을 모두 소진했습니다
            </Text>
          </View>

          {/* 결과 메시지 */}
          {resultMessage ? (
            <View style={styles.resultContainer}>
              {adLoading ? (
                <ActivityIndicator size="large" color="#4CAF50" />
              ) : (
                <Ionicons
                  name={resultMessage.includes('지급') ? 'checkmark-circle' : 'information-circle'}
                  size={32}
                  color={resultMessage.includes('지급') ? '#4CAF50' : '#666'}
                />
              )}
              <Text style={styles.resultText}>{resultMessage}</Text>
            </View>
          ) : (
            <>
              {/* 옵션들 */}
              <View style={styles.options}>
                {/* 광고 시청 옵션 */}
                {canUnlockWithAd && (
                  <TouchableOpacity
                    style={styles.adButton}
                    onPress={handleWatchAd}
                    disabled={loading || adLoading}
                  >
                    <Ionicons name="play-circle" size={24} color="#fff" />
                    <View style={styles.buttonTextContainer}>
                      <Text style={styles.adButtonText}>광고 보고 계속하기</Text>
                      <Text style={styles.adRewardText}>
                        +{adReward} {typeLabels[limitType]}
                      </Text>
                    </View>
                    {(loading || adLoading) && (
                      <ActivityIndicator color="#fff" size="small" />
                    )}
                  </TouchableOpacity>
                )}

                {/* 광고로 해제 불가능한 경우 */}
                {!canUnlockWithAd && adStatus.adsEnabled && (
                  <View style={styles.noAdContainer}>
                    <Ionicons name="information-circle-outline" size={20} color="#666" />
                    <Text style={styles.noAdText}>
                      {adReward === 0
                        ? `${typeLabels[limitType]}은(는) 광고로 얻을 수 없습니다`
                        : '광고 시청 한도에 도달했습니다'}
                    </Text>
                  </View>
                )}

                {/* 플랜 업그레이드 */}
                <TouchableOpacity
                  style={styles.upgradeButton}
                  onPress={onUpgrade}
                >
                  <Ionicons name="diamond" size={24} color="#2196F3" />
                  <View style={styles.buttonTextContainer}>
                    <Text style={styles.upgradeButtonText}>플랜 업그레이드</Text>
                    <Text style={styles.upgradeSubtext}>더 많은 분석 이용 가능</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#2196F3" />
                </TouchableOpacity>
              </View>

              {/* 오늘 광고 시청 현황 */}
              {adStatus.todaySummary && (
                <View style={styles.summaryContainer}>
                  <Text style={styles.summaryTitle}>오늘 광고 시청 현황</Text>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>시청한 광고</Text>
                    <Text style={styles.summaryValue}>
                      {adStatus.todaySummary.adsWatched}회
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>얻은 새로고침</Text>
                    <Text style={styles.summaryValue}>
                      +{adStatus.todaySummary.refreshEarned}회
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>얻은 Level 2 분석</Text>
                    <Text style={styles.summaryValue}>
                      +{adStatus.todaySummary.level2Earned}회
                    </Text>
                  </View>
                </View>
              )}
            </>
          )}

          {/* 닫기 버튼 */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            disabled={adLoading}
          >
            <Text style={styles.closeButtonText}>닫기</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 360,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginTop: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  options: {
    gap: 12,
    marginBottom: 16,
  },
  adButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 12,
  },
  buttonTextContainer: {
    flex: 1,
  },
  adButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  adRewardText: {
    color: '#E8F5E9',
    fontSize: 12,
    marginTop: 2,
  },
  noAdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  noAdText: {
    flex: 1,
    color: '#666',
    fontSize: 13,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 12,
  },
  upgradeButtonText: {
    color: '#2196F3',
    fontSize: 16,
    fontWeight: '600',
  },
  upgradeSubtext: {
    color: '#64B5F6',
    fontSize: 12,
    marginTop: 2,
  },
  resultContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  resultText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginTop: 12,
  },
  summaryContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#888',
  },
  summaryValue: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },
  closeButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  closeButtonText: {
    color: '#666',
    fontSize: 14,
  },
});

export default AdLimitModal;

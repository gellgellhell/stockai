/**
 * 알림 설정 화면
 * 푸시 알림 설정 관리
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications } from '../NotificationContext';

const NotificationSettingsScreen = ({ navigation }) => {
  const {
    permissionGranted,
    settings,
    updateSettings,
    initializePushNotifications,
  } = useNotifications();

  const [loading, setLoading] = useState(false);
  const [savingKey, setSavingKey] = useState(null);

  // 설정 토글
  const handleToggle = useCallback(async (key, value) => {
    setSavingKey(key);
    try {
      await updateSettings({ [key]: value });
    } catch (error) {
      Alert.alert('오류', '설정을 저장하는 중 오류가 발생했습니다.');
    } finally {
      setSavingKey(null);
    }
  }, [updateSettings]);

  // 알림 권한 요청
  const handleRequestPermission = useCallback(async () => {
    setLoading(true);
    try {
      await initializePushNotifications();
    } finally {
      setLoading(false);
    }
  }, [initializePushNotifications]);

  // 방해금지 시간 설정
  const handleSetQuietTime = useCallback((type) => {
    // 시간 선택 모달 표시 로직
    // 실제 구현시 DateTimePicker 사용
    Alert.alert('시간 설정', `${type === 'start' ? '시작' : '종료'} 시간을 선택하세요.`);
  }, []);

  // 권한 미허용 시 안내 화면
  if (!permissionGranted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.title}>알림 설정</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.permissionContainer}>
          <Ionicons name="notifications-off" size={64} color="#9CA3AF" />
          <Text style={styles.permissionTitle}>알림이 비활성화됨</Text>
          <Text style={styles.permissionDescription}>
            가격 알림과 분석 완료 알림을 받으려면{'\n'}알림 권한을 허용해주세요.
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={handleRequestPermission}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.permissionButtonText}>알림 권한 허용</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.title}>알림 설정</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* 알림 유형 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>알림 유형</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="trending-up" size={24} color="#10B981" />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>가격 알림</Text>
                <Text style={styles.settingDescription}>
                  설정한 목표가에 도달하면 알림
                </Text>
              </View>
            </View>
            {savingKey === 'priceAlerts' ? (
              <ActivityIndicator size="small" color="#3B82F6" />
            ) : (
              <Switch
                value={settings.priceAlerts}
                onValueChange={(v) => handleToggle('priceAlerts', v)}
                trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
                thumbColor={settings.priceAlerts ? '#3B82F6' : '#F3F4F6'}
              />
            )}
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="analytics" size={24} color="#8B5CF6" />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>분석 완료</Text>
                <Text style={styles.settingDescription}>
                  AI 분석이 완료되면 알림
                </Text>
              </View>
            </View>
            {savingKey === 'analysisComplete' ? (
              <ActivityIndicator size="small" color="#3B82F6" />
            ) : (
              <Switch
                value={settings.analysisComplete}
                onValueChange={(v) => handleToggle('analysisComplete', v)}
                trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
                thumbColor={settings.analysisComplete ? '#3B82F6' : '#F3F4F6'}
              />
            )}
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="calendar" size={24} color="#F59E0B" />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>일일 요약</Text>
                <Text style={styles.settingDescription}>
                  매일 관심종목 변동 요약 알림
                </Text>
              </View>
            </View>
            {savingKey === 'dailySummary' ? (
              <ActivityIndicator size="small" color="#3B82F6" />
            ) : (
              <Switch
                value={settings.dailySummary}
                onValueChange={(v) => handleToggle('dailySummary', v)}
                trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
                thumbColor={settings.dailySummary ? '#3B82F6' : '#F3F4F6'}
              />
            )}
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="megaphone" size={24} color="#EC4899" />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>마케팅 알림</Text>
                <Text style={styles.settingDescription}>
                  프로모션 및 이벤트 정보
                </Text>
              </View>
            </View>
            {savingKey === 'marketing' ? (
              <ActivityIndicator size="small" color="#3B82F6" />
            ) : (
              <Switch
                value={settings.marketing}
                onValueChange={(v) => handleToggle('marketing', v)}
                trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
                thumbColor={settings.marketing ? '#3B82F6' : '#F3F4F6'}
              />
            )}
          </View>
        </View>

        {/* 방해금지 시간 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>방해금지 시간</Text>
          <Text style={styles.sectionDescription}>
            설정한 시간에는 마케팅 알림을 보내지 않습니다.
          </Text>

          <View style={styles.quietTimeContainer}>
            <TouchableOpacity
              style={styles.quietTimeButton}
              onPress={() => handleSetQuietTime('start')}
            >
              <Text style={styles.quietTimeLabel}>시작</Text>
              <Text style={styles.quietTimeValue}>{settings.quietStart}</Text>
            </TouchableOpacity>

            <Text style={styles.quietTimeSeparator}>~</Text>

            <TouchableOpacity
              style={styles.quietTimeButton}
              onPress={() => handleSetQuietTime('end')}
            >
              <Text style={styles.quietTimeLabel}>종료</Text>
              <Text style={styles.quietTimeValue}>{settings.quietEnd}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 알림 기록 */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('NotificationHistory')}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="time" size={24} color="#6B7280" />
              <Text style={styles.menuItemText}>알림 기록</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 12,
    flex: 1,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
  },
  settingDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  quietTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginTop: 8,
  },
  quietTimeButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 100,
  },
  quietTimeLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  quietTimeValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  quietTimeSeparator: {
    fontSize: 18,
    color: '#9CA3AF',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemText: {
    fontSize: 15,
    color: '#1F2937',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  permissionDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    minWidth: 180,
    alignItems: 'center',
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default NotificationSettingsScreen;

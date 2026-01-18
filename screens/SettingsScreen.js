/**
 * 설정 화면
 * 앱 설정 및 계정 관리
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useOnboarding } from '../OnboardingContext';

const SettingItem = ({ icon, iconColor, title, subtitle, onPress, rightComponent }) => (
  <TouchableOpacity style={styles.settingItem} onPress={onPress} disabled={!onPress}>
    <View style={[styles.settingIconContainer, { backgroundColor: iconColor + '20' }]}>
      <Ionicons name={icon} size={20} color={iconColor} />
    </View>
    <View style={styles.settingContent}>
      <Text style={styles.settingTitle}>{title}</Text>
      {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
    </View>
    {rightComponent || (onPress && <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />)}
  </TouchableOpacity>
);

const SettingsScreen = ({ navigation }) => {
  const { resetOnboarding } = useOnboarding();
  const [darkMode, setDarkMode] = React.useState(false);

  const handleUpgrade = () => {
    navigation.navigate('Subscription');
  };

  const handleNotificationSettings = () => {
    navigation.navigate('NotificationSettings');
  };

  const handleResetOnboarding = () => {
    Alert.alert(
      '온보딩 초기화',
      '온보딩을 다시 보시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { text: '확인', onPress: resetOnboarding },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      '로그아웃',
      '정말 로그아웃 하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { text: '로그아웃', style: 'destructive', onPress: () => {} },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.title}>설정</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* 계정 섹션 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>계정</Text>

          <View style={styles.profileCard}>
            <View style={styles.profileAvatar}>
              <Ionicons name="person" size={32} color="#6B7280" />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>사용자</Text>
              <Text style={styles.profileEmail}>user@example.com</Text>
            </View>
            <View style={styles.planBadge}>
              <Text style={styles.planBadgeText}>Free</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.upgradeCard} onPress={handleUpgrade}>
            <View style={styles.upgradeContent}>
              <Ionicons name="diamond" size={24} color="#8B5CF6" />
              <View style={styles.upgradeText}>
                <Text style={styles.upgradeTitle}>Pro 플랜으로 업그레이드</Text>
                <Text style={styles.upgradeSubtitle}>무제한 분석, 광고 제거</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* 앱 설정 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>앱 설정</Text>

          <SettingItem
            icon="notifications"
            iconColor="#3B82F6"
            title="알림 설정"
            subtitle="푸시 알림, 가격 알림"
            onPress={handleNotificationSettings}
          />

          <SettingItem
            icon="moon"
            iconColor="#6366F1"
            title="다크 모드"
            rightComponent={
              <Switch
                value={darkMode}
                onValueChange={setDarkMode}
                trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
                thumbColor={darkMode ? '#3B82F6' : '#F3F4F6'}
              />
            }
          />

          <SettingItem
            icon="language"
            iconColor="#10B981"
            title="언어"
            subtitle="한국어"
            onPress={() => {}}
          />
        </View>

        {/* 데이터 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>데이터</Text>

          <SettingItem
            icon="cloud-download"
            iconColor="#F59E0B"
            title="데이터 백업"
            subtitle="관심종목, 알림 설정"
            onPress={() => {}}
          />

          <SettingItem
            icon="trash"
            iconColor="#EF4444"
            title="캐시 삭제"
            subtitle="120 MB"
            onPress={() => Alert.alert('캐시 삭제', '캐시가 삭제되었습니다.')}
          />
        </View>

        {/* 정보 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>정보</Text>

          <SettingItem
            icon="document-text"
            iconColor="#6B7280"
            title="이용약관"
            onPress={() => {}}
          />

          <SettingItem
            icon="shield-checkmark"
            iconColor="#6B7280"
            title="개인정보처리방침"
            onPress={() => {}}
          />

          <SettingItem
            icon="help-circle"
            iconColor="#6B7280"
            title="도움말"
            onPress={() => {}}
          />

          <SettingItem
            icon="information-circle"
            iconColor="#6B7280"
            title="앱 버전"
            subtitle="1.0.0"
          />
        </View>

        {/* 개발자 옵션 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>개발자 옵션</Text>

          <SettingItem
            icon="refresh"
            iconColor="#8B5CF6"
            title="온보딩 초기화"
            subtitle="온보딩을 다시 봅니다"
            onPress={handleResetOnboarding}
          />
        </View>

        {/* 로그아웃 */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>로그아웃</Text>
        </TouchableOpacity>

        <View style={styles.bottomPadding} />
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  profileEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  planBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  planBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  upgradeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5F3FF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  upgradeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  upgradeText: {
    flex: 1,
  },
  upgradeTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  upgradeSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  settingIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingContent: {
    flex: 1,
    marginLeft: 12,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
  },
  settingSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 32,
    marginHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#EF4444',
  },
  bottomPadding: {
    height: 40,
  },
});

export default SettingsScreen;

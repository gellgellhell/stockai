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
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from './AuthContext';
import { useTheme } from './ThemeContext';

export default function ProfileScreen({ navigation }) {
  const { user: authUser, signOut } = useAuth();
  const { theme, isDark, toggleTheme } = useTheme();
  const colors = theme.colors;
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const [morningReportEnabled, setMorningReportEnabled] = React.useState(true);

  const user = {
    name: authUser?.displayName || '사용자',
    email: authUser?.email || 'user@example.com',
    photoURL: authUser?.photoURL,
    plan: 'free',
    stocksUsed: 1,
    stocksLimit: 1,
    refreshUsed: 3,
    refreshLimit: 5,
  };

  const handleLogout = async () => {
    // 웹에서는 window.confirm 사용
    const confirmed = window.confirm('정말 로그아웃 하시겠습니까?');
    if (confirmed) {
      try {
        await signOut();
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
  };

  const MenuItem = ({ icon, title, subtitle, onPress, rightComponent }) => (
    <TouchableOpacity style={[styles.menuItem, { backgroundColor: colors.card }]} onPress={onPress}>
      <View style={styles.menuLeft}>
        <View style={[styles.menuIcon, { backgroundColor: colors.primaryBg }]}>
          <Ionicons name={icon} size={20} color={colors.primary} />
        </View>
        <View style={styles.menuText}>
          <Text style={[styles.menuTitle, { color: colors.text }]}>{title}</Text>
          {subtitle && <Text style={[styles.menuSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>}
        </View>
      </View>
      {rightComponent || <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      {/* 사용자 프로필 */}
      <View style={[styles.profileCard, { backgroundColor: colors.card }]}>
        <View style={[styles.avatarContainer, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarText}>{user.name.charAt(0)}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={[styles.profileName, { color: colors.text }]}>{user.name}</Text>
          <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>{user.email}</Text>
        </View>
      </View>

      {/* 구독 플랜 */}
      <TouchableOpacity
        style={[styles.planCard, { backgroundColor: colors.card }]}
        onPress={() => navigation.navigate('Subscription')}
      >
        <View style={styles.planHeader}>
          <View style={[styles.planBadge, { backgroundColor: colors.surfaceSecondary }]}>
            <Text style={[styles.planBadgeText, { color: colors.textSecondary }]}>Free</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
        </View>

        <View style={styles.usageRow}>
          <View style={styles.usageItem}>
            <Text style={[styles.usageLabel, { color: colors.textTertiary }]}>등록 종목</Text>
            <Text style={[styles.usageValue, { color: colors.text }]}>{user.stocksUsed}/{user.stocksLimit}</Text>
          </View>
          <View style={[styles.usageDivider, { backgroundColor: colors.border }]} />
          <View style={styles.usageItem}>
            <Text style={[styles.usageLabel, { color: colors.textTertiary }]}>오늘 새로고침</Text>
            <Text style={[styles.usageValue, { color: colors.text }]}>{user.refreshUsed}/{user.refreshLimit}</Text>
          </View>
        </View>

        <View style={[styles.upgradeRow, { borderTopColor: colors.border }]}>
          <Text style={[styles.upgradeText, { color: colors.primary }]}>업그레이드하고 더 많은 종목 등록하기</Text>
        </View>
      </TouchableOpacity>

      {/* 알림 설정 */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>알림 설정</Text>
        <View style={[styles.menuGroup, { backgroundColor: colors.card }]}>
          <MenuItem
            icon="notifications-outline"
            title="푸시 알림"
            subtitle="앱 알림을 받습니다"
            rightComponent={
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: '#E5E7EB', true: '#3B82F6' }}
                thumbColor="#FFFFFF"
              />
            }
          />
          <MenuItem
            icon="sunny-outline"
            title="아침 리포트"
            subtitle="매일 오전 9시에 분석 리포트 수신"
            rightComponent={
              <Switch
                value={morningReportEnabled}
                onValueChange={setMorningReportEnabled}
                trackColor={{ false: '#E5E7EB', true: '#3B82F6' }}
                thumbColor="#FFFFFF"
              />
            }
          />
          <MenuItem
            icon="time-outline"
            title="알림 시간 설정"
            subtitle="오전 9:00"
          />
        </View>
      </View>

      {/* 일반 설정 */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>일반 설정</Text>
        <View style={[styles.menuGroup, { backgroundColor: colors.card }]}>
          <MenuItem
            icon="moon-outline"
            title="다크 모드"
            subtitle={isDark ? '켜짐' : '꺼짐'}
            rightComponent={
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: '#E5E7EB', true: '#3B82F6' }}
                thumbColor="#FFFFFF"
              />
            }
          />
          <MenuItem
            icon="card-outline"
            title="구독 관리"
            onPress={() => navigation.navigate('Subscription')}
          />
          <MenuItem
            icon="language-outline"
            title="언어"
            subtitle="한국어"
          />
        </View>
      </View>

      {/* 지원 */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>지원</Text>
        <View style={[styles.menuGroup, { backgroundColor: colors.card }]}>
          <MenuItem icon="help-circle-outline" title="도움말" />
          <MenuItem icon="chatbubble-outline" title="문의하기" />
          <MenuItem icon="document-text-outline" title="이용약관" />
          <MenuItem icon="shield-checkmark-outline" title="개인정보처리방침" />
        </View>
      </View>

      {/* 로그아웃 */}
      <TouchableOpacity style={[styles.logoutButton, { borderColor: colors.errorBg, backgroundColor: colors.errorBg }]} onPress={handleLogout}>
        <Text style={[styles.logoutText, { color: colors.error }]}>로그아웃</Text>
      </TouchableOpacity>

      <Text style={[styles.versionText, { color: colors.textTertiary }]}>Stock AI v1.0.0</Text>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#6B7280',
  },
  planCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  planBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  planBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  usageRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  usageItem: {
    flex: 1,
    alignItems: 'center',
  },
  usageDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
  },
  usageLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  usageValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  upgradeRow: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  upgradeText: {
    fontSize: 14,
    color: '#3B82F6',
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12,
    paddingLeft: 4,
  },
  menuGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuText: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 15,
    color: '#1F2937',
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  logoutButton: {
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 20,
  },
});

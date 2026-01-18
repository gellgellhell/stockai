/**
 * 알림 기록 화면
 * 받은 알림 목록 표시
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications } from '../NotificationContext';

// 알림 타입별 아이콘 및 색상
const NOTIFICATION_CONFIG = {
  price_alert: {
    icon: 'trending-up',
    color: '#10B981',
    bgColor: '#ECFDF5',
  },
  analysis_complete: {
    icon: 'analytics',
    color: '#8B5CF6',
    bgColor: '#F5F3FF',
  },
  daily_summary: {
    icon: 'calendar',
    color: '#F59E0B',
    bgColor: '#FFFBEB',
  },
  marketing: {
    icon: 'megaphone',
    color: '#EC4899',
    bgColor: '#FDF2F8',
  },
  default: {
    icon: 'notifications',
    color: '#3B82F6',
    bgColor: '#EFF6FF',
  },
};

// 시간 포맷팅
const formatTime = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return '방금 전';
  if (diffMins < 60) return `${diffMins}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffDays < 7) return `${diffDays}일 전`;

  return date.toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
  });
};

// 알림 아이템 컴포넌트
const NotificationItem = ({ item, onPress }) => {
  const config = NOTIFICATION_CONFIG[item.type] || NOTIFICATION_CONFIG.default;
  const isUnread = !item.read_at;

  return (
    <TouchableOpacity
      style={[styles.notificationItem, isUnread && styles.unreadItem]}
      onPress={() => onPress(item)}
    >
      <View style={[styles.iconContainer, { backgroundColor: config.bgColor }]}>
        <Ionicons name={config.icon} size={20} color={config.color} />
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, isUnread && styles.unreadText]}>
            {item.title}
          </Text>
          {isUnread && <View style={styles.unreadDot} />}
        </View>
        {item.body && (
          <Text style={styles.body} numberOfLines={2}>
            {item.body}
          </Text>
        )}
        <Text style={styles.time}>{formatTime(item.sent_at)}</Text>
      </View>
    </TouchableOpacity>
  );
};

// 빈 상태 컴포넌트
const EmptyState = () => (
  <View style={styles.emptyContainer}>
    <Ionicons name="notifications-off-outline" size={64} color="#D1D5DB" />
    <Text style={styles.emptyTitle}>알림이 없습니다</Text>
    <Text style={styles.emptyDescription}>
      가격 알림이나 분석 완료 시{'\n'}알림이 여기에 표시됩니다.
    </Text>
  </View>
);

const NotificationHistoryScreen = ({ navigation }) => {
  const {
    notifications,
    unreadCount,
    loading,
    loadNotifications,
    markAsRead,
    markAllAsRead,
    handleNotificationClick,
  } = useNotifications();

  // 새로고침
  const handleRefresh = useCallback(() => {
    loadNotifications(true);
  }, [loadNotifications]);

  // 더 불러오기
  const handleLoadMore = useCallback(() => {
    if (!loading) {
      loadNotifications(false);
    }
  }, [loading, loadNotifications]);

  // 알림 클릭
  const handleItemPress = useCallback((item) => {
    markAsRead(item.id);

    // 알림 타입에 따른 네비게이션
    if (item.data?.symbol) {
      navigation.navigate('StockDetail', { symbol: item.data.symbol });
    }
  }, [markAsRead, navigation]);

  // 모두 읽음 처리
  const handleMarkAllRead = useCallback(() => {
    markAllAsRead();
  }, [markAllAsRead]);

  const renderItem = useCallback(({ item }) => (
    <NotificationItem item={item} onPress={handleItemPress} />
  ), [handleItemPress]);

  const keyExtractor = useCallback((item) => item.id.toString(), []);

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>알림 기록</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity style={styles.markAllButton} onPress={handleMarkAllRead}>
            <Text style={styles.markAllText}>모두 읽음</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      {/* 미읽음 알림 카운트 */}
      {unreadCount > 0 && (
        <View style={styles.unreadBanner}>
          <Ionicons name="mail-unread" size={16} color="#3B82F6" />
          <Text style={styles.unreadBannerText}>
            읽지 않은 알림 {unreadCount}개
          </Text>
        </View>
      )}

      {/* 알림 목록 */}
      <FlatList
        data={notifications}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={notifications.length === 0 && styles.emptyList}
        ListEmptyComponent={<EmptyState />}
        ListFooterComponent={
          loading && notifications.length > 0 ? (
            <View style={styles.loadingFooter}>
              <ActivityIndicator size="small" color="#3B82F6" />
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={loading && notifications.length === 0}
            onRefresh={handleRefresh}
            colors={['#3B82F6']}
            tintColor="#3B82F6"
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  markAllText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  unreadBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    backgroundColor: '#EFF6FF',
  },
  unreadBannerText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  unreadItem: {
    backgroundColor: '#FEFCE8',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 15,
    fontWeight: '500',
    color: '#374151',
    flex: 1,
  },
  unreadText: {
    fontWeight: '600',
    color: '#1F2937',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
    marginLeft: 8,
  },
  body: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    lineHeight: 20,
  },
  time: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 6,
  },
  separator: {
    height: 1,
    backgroundColor: '#F3F4F6',
  },
  emptyList: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  loadingFooter: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});

export default NotificationHistoryScreen;

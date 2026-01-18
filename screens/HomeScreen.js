/**
 * 홈 화면
 * 주요 기능 및 빠른 액세스
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const QuickActionCard = ({ icon, title, description, color, onPress }) => (
  <TouchableOpacity style={styles.quickCard} onPress={onPress}>
    <View style={[styles.quickIconContainer, { backgroundColor: color + '20' }]}>
      <Ionicons name={icon} size={28} color={color} />
    </View>
    <Text style={styles.quickTitle}>{title}</Text>
    <Text style={styles.quickDescription}>{description}</Text>
  </TouchableOpacity>
);

const HomeScreen = ({ navigation }) => {
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>안녕하세요</Text>
          <Text style={styles.title}>Stock AI</Text>
        </View>
        <TouchableOpacity
          style={styles.notificationButton}
          onPress={() => navigation.navigate('NotificationHistory')}
        >
          <Ionicons name="notifications-outline" size={24} color="#1F2937" />
          <View style={styles.notificationBadge} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* 빠른 분석 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>빠른 시작</Text>
          <View style={styles.quickActions}>
            <QuickActionCard
              icon="analytics"
              title="AI 분석"
              description="종목 분석 시작"
              color="#8B5CF6"
              onPress={() => navigation.navigate('Analysis')}
            />
            <QuickActionCard
              icon="star"
              title="관심종목"
              description="내 관심종목"
              color="#F59E0B"
              onPress={() => navigation.navigate('Watchlist')}
            />
          </View>
        </View>

        {/* 오늘의 마켓 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>오늘의 마켓</Text>
          <View style={styles.marketCard}>
            <View style={styles.marketItem}>
              <Text style={styles.marketLabel}>S&P 500</Text>
              <Text style={styles.marketValue}>4,782.55</Text>
              <Text style={[styles.marketChange, styles.positive]}>+1.23%</Text>
            </View>
            <View style={styles.marketDivider} />
            <View style={styles.marketItem}>
              <Text style={styles.marketLabel}>NASDAQ</Text>
              <Text style={styles.marketValue}>14,972.76</Text>
              <Text style={[styles.marketChange, styles.positive]}>+1.58%</Text>
            </View>
            <View style={styles.marketDivider} />
            <View style={styles.marketItem}>
              <Text style={styles.marketLabel}>DOW</Text>
              <Text style={styles.marketValue}>37,557.92</Text>
              <Text style={[styles.marketChange, styles.negative]}>-0.31%</Text>
            </View>
          </View>
        </View>

        {/* 최근 분석 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>최근 분석</Text>
            <TouchableOpacity>
              <Text style={styles.seeAll}>전체 보기</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.emptyCard}>
            <Ionicons name="document-text-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>아직 분석 기록이 없습니다</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => navigation.navigate('Analysis')}
            >
              <Text style={styles.emptyButtonText}>첫 분석 시작하기</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 프로 플랜 배너 */}
        <TouchableOpacity
          style={styles.proBanner}
          onPress={() => navigation.navigate('Subscription')}
        >
          <View style={styles.proBannerContent}>
            <Ionicons name="diamond" size={32} color="#FFFFFF" />
            <View style={styles.proBannerText}>
              <Text style={styles.proBannerTitle}>Pro 플랜으로 업그레이드</Text>
              <Text style={styles.proBannerDescription}>
                무제한 분석과 더 많은 기능을 이용하세요
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
        </TouchableOpacity>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
  },
  greeting: {
    fontSize: 14,
    color: '#6B7280',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#F3F4F6',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  seeAll: {
    fontSize: 14,
    color: '#3B82F6',
    marginBottom: 12,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  quickCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  quickIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  quickDescription: {
    fontSize: 13,
    color: '#6B7280',
  },
  marketCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  marketItem: {
    flex: 1,
    alignItems: 'center',
  },
  marketLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  marketValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  marketChange: {
    fontSize: 13,
    fontWeight: '500',
  },
  positive: {
    color: '#10B981',
  },
  negative: {
    color: '#EF4444',
  },
  marketDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 12,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 12,
    marginBottom: 16,
  },
  emptyButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  proBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#8B5CF6',
    borderRadius: 16,
    padding: 20,
    marginTop: 24,
    marginBottom: 32,
  },
  proBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  proBannerText: {
    flex: 1,
  },
  proBannerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  proBannerDescription: {
    fontSize: 13,
    color: '#E9D5FF',
  },
});

export default HomeScreen;

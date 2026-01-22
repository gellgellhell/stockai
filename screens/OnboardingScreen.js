/**
 * 온보딩 화면
 * 첫 사용자 가이드
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  FlatList,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ONBOARDING_SCREENS } from '../config/onboardingConfig';
import { useOnboarding } from '../OnboardingContext';
import { useTheme } from '../ThemeContext';

const { width, height } = Dimensions.get('window');

// 개별 온보딩 페이지
const OnboardingPage = ({ item, index, colors }) => {
  return (
    <View style={[styles.page, { width }]}>
      {/* 아이콘 영역 */}
      <View style={[styles.iconContainer, { backgroundColor: item.backgroundColor }]}>
        <Ionicons name={item.icon} size={80} color={item.color} />
      </View>

      {/* 텍스트 영역 */}
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>{item.description}</Text>

        {/* 기능 리스트 */}
        {item.features && (
          <View style={styles.featureList}>
            {item.features.map((feature, idx) => (
              <View key={idx} style={[styles.featureItem, { backgroundColor: colors.surfaceSecondary }]}>
                <Ionicons name="checkmark-circle" size={20} color={item.color} />
                <Text style={[styles.featureText, { color: colors.text }]}>{feature}</Text>
              </View>
            ))}
          </View>
        )}

        {/* 플랜 리스트 */}
        {item.plans && (
          <View style={styles.planList}>
            {item.plans.map((plan, idx) => (
              <View key={idx} style={[styles.planItem, { backgroundColor: colors.surfaceSecondary }]}>
                <Text style={[styles.planName, { color: item.color }]}>{plan.name}</Text>
                <Text style={[styles.planDescription, { color: colors.textSecondary }]}>{plan.description}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

// 페이지 인디케이터
const PageIndicator = ({ currentIndex, total, color, colors }) => {
  return (
    <View style={styles.indicatorContainer}>
      {Array.from({ length: total }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.indicator,
            { backgroundColor: colors.border },
            index === currentIndex && [styles.indicatorActive, { backgroundColor: color }],
          ]}
        />
      ))}
    </View>
  );
};

const OnboardingScreen = () => {
  const { theme } = useTheme();
  const colors = theme.colors;
  const { completeOnboarding } = useOnboarding();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const currentScreen = ONBOARDING_SCREENS[currentIndex];
  const isLastPage = currentIndex === ONBOARDING_SCREENS.length - 1;

  // 스크롤 이벤트 핸들러
  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false }
  );

  // 페이지 변경 감지
  const handleViewableItemsChanged = useCallback(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }, []);

  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 50,
  }).current;

  // 다음 페이지로 이동
  const handleNext = useCallback(() => {
    if (isLastPage) {
      completeOnboarding();
    } else {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    }
  }, [currentIndex, isLastPage, completeOnboarding]);

  // 이전 페이지로 이동
  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex - 1,
        animated: true,
      });
    }
  }, [currentIndex]);

  // 건너뛰기
  const handleSkip = useCallback(() => {
    completeOnboarding();
  }, [completeOnboarding]);

  const renderItem = useCallback(({ item, index }) => (
    <OnboardingPage item={item} index={index} colors={colors} />
  ), [colors]);

  const keyExtractor = useCallback((item) => item.id, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 건너뛰기 버튼 */}
      <View style={styles.header}>
        {currentIndex > 0 ? (
          <TouchableOpacity style={styles.headerButton} onPress={handlePrev}>
            <Ionicons name="arrow-back" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerButton} />
        )}

        {!isLastPage && (
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={[styles.skipText, { color: colors.textSecondary }]}>건너뛰기</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 페이지 리스트 */}
      <FlatList
        ref={flatListRef}
        data={ONBOARDING_SCREENS}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        onViewableItemsChanged={handleViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        scrollEventThrottle={16}
        bounces={false}
      />

      {/* 하단 컨트롤 */}
      <View style={styles.footer}>
        <PageIndicator
          currentIndex={currentIndex}
          total={ONBOARDING_SCREENS.length}
          color={currentScreen.color}
          colors={colors}
        />

        <TouchableOpacity
          style={[styles.nextButton, { backgroundColor: currentScreen.color }]}
          onPress={handleNext}
        >
          <Text style={styles.nextButtonText}>
            {isLastPage ? '시작하기' : '다음'}
          </Text>
          <Ionicons
            name={isLastPage ? 'rocket' : 'arrow-forward'}
            size={20}
            color="#FFFFFF"
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 16,
    color: '#6B7280',
  },
  page: {
    flex: 1,
    paddingHorizontal: 32,
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: height * 0.08,
    marginBottom: 40,
  },
  textContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    lineHeight: 36,
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  featureList: {
    width: '100%',
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  featureText: {
    fontSize: 15,
    color: '#374151',
    flex: 1,
  },
  planList: {
    width: '100%',
    gap: 12,
  },
  planItem: {
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planName: {
    fontSize: 16,
    fontWeight: '600',
  },
  planDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  footer: {
    paddingHorizontal: 32,
    paddingBottom: 32,
    gap: 24,
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
  },
  indicatorActive: {
    width: 24,
    backgroundColor: '#3B82F6',
  },
  nextButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default OnboardingScreen;

/**
 * 루트 네비게이터
 * 온보딩 상태에 따라 화면 분기
 */

import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useOnboarding } from '../OnboardingContext';

// Screens
import OnboardingScreen from '../screens/OnboardingScreen';
import MainNavigator from './MainNavigator';

const Stack = createNativeStackNavigator();

// 로딩 화면
const LoadingScreen = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#3B82F6" />
  </View>
);

const RootNavigator = () => {
  const { hasCompletedOnboarding, loading } = useOnboarding();

  // 온보딩 상태 로딩 중
  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {hasCompletedOnboarding ? (
        // 온보딩 완료 - 메인 앱으로
        <Stack.Screen name="Main" component={MainNavigator} />
      ) : (
        // 온보딩 미완료 - 온보딩 화면으로
        <Stack.Screen
          name="Onboarding"
          component={OnboardingScreen}
          options={{
            animationTypeForReplace: 'push',
          }}
        />
      )}
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});

export default RootNavigator;

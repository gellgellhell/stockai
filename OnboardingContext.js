/**
 * 온보딩 Context
 * 온보딩 완료 상태 관리
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ONBOARDING_STORAGE_KEY } from './config/onboardingConfig';

const OnboardingContext = createContext(null);

export const OnboardingProvider = ({ children }) => {
  // 온보딩 완료 여부
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(null);
  const [loading, setLoading] = useState(true);

  // 저장된 온보딩 상태 로드
  useEffect(() => {
    const loadOnboardingStatus = async () => {
      try {
        const completed = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
        setHasCompletedOnboarding(completed === 'true');
      } catch (error) {
        console.error('Load onboarding status error:', error);
        setHasCompletedOnboarding(false);
      } finally {
        setLoading(false);
      }
    };

    loadOnboardingStatus();
  }, []);

  // 온보딩 완료 처리
  const completeOnboarding = useCallback(async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
      setHasCompletedOnboarding(true);
    } catch (error) {
      console.error('Save onboarding status error:', error);
    }
  }, []);

  // 온보딩 리셋 (개발/테스트용)
  const resetOnboarding = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(ONBOARDING_STORAGE_KEY);
      setHasCompletedOnboarding(false);
    } catch (error) {
      console.error('Reset onboarding error:', error);
    }
  }, []);

  const value = {
    hasCompletedOnboarding,
    loading,
    completeOnboarding,
    resetOnboarding,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};

export default OnboardingContext;

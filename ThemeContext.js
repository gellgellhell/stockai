/**
 * 테마 컨텍스트
 * 다크 모드 / 라이트 모드 전환 관리
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';

const THEME_STORAGE_KEY = '@stockai_theme';

// 라이트 테마 색상
export const lightTheme = {
  mode: 'light',
  colors: {
    // 배경
    background: '#F9FAFB',
    surface: '#FFFFFF',
    surfaceSecondary: '#F3F4F6',

    // 텍스트
    text: '#1F2937',
    textSecondary: '#6B7280',
    textTertiary: '#9CA3AF',

    // 브랜드
    primary: '#3B82F6',
    primaryLight: '#93C5FD',
    primaryBg: '#EFF6FF',

    // 상태 색상
    success: '#10B981',
    successBg: '#ECFDF5',
    warning: '#F59E0B',
    warningBg: '#FFFBEB',
    error: '#EF4444',
    errorBg: '#FEE2E2',

    // UI 요소
    border: '#E5E7EB',
    borderLight: '#F3F4F6',
    divider: '#E5E7EB',

    // 탭바 / 네비게이션
    tabBar: '#FFFFFF',
    tabBarBorder: '#F3F4F6',
    tabActive: '#3B82F6',
    tabInactive: '#9CA3AF',

    // 카드
    card: '#FFFFFF',
    cardBorder: '#E5E7EB',

    // 입력
    inputBg: '#F9FAFB',
    inputBorder: '#D1D5DB',
    placeholder: '#9CA3AF',

    // 아이콘
    icon: '#6B7280',
    iconActive: '#3B82F6',
  },
  statusBar: 'dark',
};

// 다크 테마 색상
export const darkTheme = {
  mode: 'dark',
  colors: {
    // 배경
    background: '#111827',
    surface: '#1F2937',
    surfaceSecondary: '#374151',

    // 텍스트
    text: '#F9FAFB',
    textSecondary: '#D1D5DB',
    textTertiary: '#9CA3AF',

    // 브랜드
    primary: '#60A5FA',
    primaryLight: '#3B82F6',
    primaryBg: '#1E3A5F',

    // 상태 색상
    success: '#34D399',
    successBg: '#064E3B',
    warning: '#FBBF24',
    warningBg: '#78350F',
    error: '#F87171',
    errorBg: '#7F1D1D',

    // UI 요소
    border: '#374151',
    borderLight: '#4B5563',
    divider: '#374151',

    // 탭바 / 네비게이션
    tabBar: '#1F2937',
    tabBarBorder: '#374151',
    tabActive: '#60A5FA',
    tabInactive: '#6B7280',

    // 카드
    card: '#1F2937',
    cardBorder: '#374151',

    // 입력
    inputBg: '#374151',
    inputBorder: '#4B5563',
    placeholder: '#6B7280',

    // 아이콘
    icon: '#9CA3AF',
    iconActive: '#60A5FA',
  },
  statusBar: 'light',
};

const ThemeContext = createContext({
  theme: lightTheme,
  isDark: false,
  toggleTheme: () => {},
  setThemeMode: () => {},
});

export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [isDark, setIsDark] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // 저장된 테마 불러오기
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme !== null) {
          setIsDark(savedTheme === 'dark');
        } else {
          // 저장된 설정 없으면 시스템 설정 따르기
          setIsDark(systemColorScheme === 'dark');
        }
      } catch (error) {
        console.error('Failed to load theme:', error);
      } finally {
        setIsLoaded(true);
      }
    };

    loadTheme();
  }, []);

  // 테마 저장
  const saveTheme = async (dark) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, dark ? 'dark' : 'light');
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
  };

  // 테마 토글
  const toggleTheme = () => {
    const newValue = !isDark;
    setIsDark(newValue);
    saveTheme(newValue);
  };

  // 테마 직접 설정
  const setThemeMode = (mode) => {
    const dark = mode === 'dark';
    setIsDark(dark);
    saveTheme(dark);
  };

  const theme = isDark ? darkTheme : lightTheme;

  const value = {
    theme,
    isDark,
    toggleTheme,
    setThemeMode,
    isLoaded,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// 커스텀 훅
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// 테마 색상 바로 가져오기
export const useColors = () => {
  const { theme } = useTheme();
  return theme.colors;
};

export default ThemeContext;

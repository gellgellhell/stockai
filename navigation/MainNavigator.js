/**
 * 메인 네비게이터
 * 앱의 주요 화면 네비게이션
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Tab Screens (placeholder - 실제 화면으로 교체 필요)
import HomeScreen from '../screens/HomeScreen';
import WatchlistScreen from '../WatchlistScreen';
import AnalysisScreen from '../screens/AnalysisScreen';
import SettingsScreen from '../screens/SettingsScreen';

// Stack Screens
import StockDetailScreen from '../screens/StockDetailScreen';
import SubscriptionScreen from '../SubscriptionScreen';
import NotificationSettingsScreen from '../screens/NotificationSettingsScreen';
import NotificationHistoryScreen from '../screens/NotificationHistoryScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// 탭 아이콘 설정
const getTabIcon = (routeName, focused) => {
  const icons = {
    Home: focused ? 'home' : 'home-outline',
    Watchlist: focused ? 'star' : 'star-outline',
    Analysis: focused ? 'analytics' : 'analytics-outline',
    Settings: focused ? 'settings' : 'settings-outline',
  };
  return icons[routeName] || 'help-outline';
};

// 탭 네비게이터
const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => (
          <Ionicons
            name={getTabIcon(route.name, focused)}
            size={size}
            color={color}
          />
        ),
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E5E7EB',
          paddingTop: 8,
          paddingBottom: 8,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: '홈' }}
      />
      <Tab.Screen
        name="Watchlist"
        component={WatchlistScreen}
        options={{ tabBarLabel: '관심종목' }}
      />
      <Tab.Screen
        name="Analysis"
        component={AnalysisScreen}
        options={{ tabBarLabel: '분석' }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ tabBarLabel: '설정' }}
      />
    </Tab.Navigator>
  );
};

// 메인 스택 네비게이터
const MainNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Tabs" component={TabNavigator} />
      <Stack.Screen name="StockDetail" component={StockDetailScreen} />
      <Stack.Screen name="Subscription" component={SubscriptionScreen} />
      <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
      <Stack.Screen name="NotificationHistory" component={NotificationHistoryScreen} />
    </Stack.Navigator>
  );
};

export default MainNavigator;

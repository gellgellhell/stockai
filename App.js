import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { AuthProvider, useAuth } from './AuthContext';
import { OnboardingProvider, useOnboarding } from './OnboardingContext';
import { WatchlistProvider } from './WatchlistContext';
import { NotificationProvider } from './NotificationContext';
import { View, ActivityIndicator, Text, Platform }from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Screens (현재 프로젝트는 screens가 루트에 있음)
import HomeScreen from './HomeScreen';
import TrendingScreen from './TrendingScreen';
import SearchScreen from './SearchScreen';
import ProfileScreen from './ProfileScreen';
import StockDetailScreen from './StockDetailScreen';
import LoginScreen from './LoginScreen';
import SubscriptionScreen from './SubscriptionScreen';
import ProfileSetupScreen from './ProfileSetupScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import WatchlistScreen from './WatchlistScreen';
import NotificationSettingsScreen from './screens/NotificationSettingsScreen';
import NotificationHistoryScreen from './screens/NotificationHistoryScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Trending') {
            iconName = focused ? 'trending-up' : 'trending-up-outline';
          } else if (route.name === 'Search') {
            iconName = focused ? 'search' : 'search-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={22} color={color} />;
        },
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#F3F4F6',
          paddingBottom: 8,
          paddingTop: 8,
          height: 64,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
        headerStyle: {
          backgroundColor: '#FFFFFF',
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: '#F3F4F6',
        },
        headerTintColor: '#1F2937',
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 17,
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: '홈',
          headerTitle: 'Stock AI',
        }}
      />
      <Tab.Screen
        name="Trending"
        component={TrendingScreen}
        options={{ title: '인기 종목' }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{ title: '검색' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: '설정' }}
      />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const { user, loading, isNewUser } = useAuth();
  const { hasCompletedOnboarding, loading: onboardingLoading } = useOnboarding();

  if (loading || onboardingLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' }}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#FFFFFF',
        },
        headerTintColor: '#1F2937',
        headerTitleStyle: {
          fontWeight: '600',
        },
        headerShadowVisible: false,
      }}
    >
      {!hasCompletedOnboarding ? (
        // 온보딩 미완료
        <Stack.Screen
          name="Onboarding"
          component={OnboardingScreen}
          options={{ headerShown: false }}
        />
      ) : !user ? (
        // 온보딩 완료, 로그인 안됨
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
      ) : isNewUser ? (
        // 신규 사용자 - 프로필 설정
        <Stack.Screen
          name="ProfileSetup"
          component={ProfileSetupScreen}
          options={{ headerShown: false }}
        />
      ) : (
        // 기존 사용자 - 메인 앱
        <>
          <Stack.Screen
            name="Main"
            component={MainTabs}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="StockDetail"
            component={StockDetailScreen}
            options={{ title: '종목 상세' }}
          />
          <Stack.Screen
            name="Subscription"
            component={SubscriptionScreen}
            options={{ title: '구독 관리' }}
          />
          <Stack.Screen
            name="Watchlist"
            component={WatchlistScreen}
            options={{ title: '관심종목' }}
          />
          <Stack.Screen
            name="NotificationSettings"
            component={NotificationSettingsScreen}
            options={{ title: '알림 설정' }}
          />
          <Stack.Screen
            name="NotificationHistory"
            component={NotificationHistoryScreen}
            options={{ title: '알림 기록' }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

// 카카오 콜백 처리 (팝업 창에서 실행)
function KakaoCallbackHandler() {
  // 즉시 URL 정보 캡처
  const [urlInfo] = useState(() => {
    if (typeof window !== 'undefined') {
      return {
        href: window.location.href,
        search: window.location.search,
        pathname: window.location.pathname,
      };
    }
    return { href: '', search: '', pathname: '' };
  });
  const [status, setStatus] = useState('콜백 페이지 로드됨');
  const [processing, setProcessing] = useState(false);

  const processLogin = async () => {
    if (processing) return;
    setProcessing(true);

    const KAKAO_REST_API_KEY = '4ee4ca90f63be6e44fa529d80bd13304';
    const KAKAO_CLIENT_SECRET = '1Si7JkOGKxgqTd14Xu3oO8MUszUU5MYe';
    const urlParams = new URLSearchParams(urlInfo.search);
    const code = urlParams.get('code');

    if (!code) {
      setStatus('인가 코드 없음');
      return;
    }

    try {
      setStatus('토큰 발급 중...');
      const redirectUri = window.location.origin + '/auth/kakao/callback';

      const tokenResponse = await fetch('https://kauth.kakao.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: KAKAO_REST_API_KEY,
          client_secret: KAKAO_CLIENT_SECRET,
          redirect_uri: redirectUri,
          code: code,
        }).toString(),
      });

      const tokenData = await tokenResponse.json();

      if (!tokenData.access_token) {
        throw new Error(tokenData.error_description || '토큰 발급 실패');
      }

      setStatus('사용자 정보 확인 중...');

      const userResponse = await fetch('https://kapi.kakao.com/v2/user/me', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
        },
      });

      const userInfo = await userResponse.json();

      setStatus('로그인 성공! 창을 닫습니다...');

      window.opener?.postMessage({
        type: 'KAKAO_LOGIN_SUCCESS',
        accessToken: tokenData.access_token,
        user: {
          id: userInfo.id,
          nickname: userInfo.kakao_account?.profile?.nickname || userInfo.properties?.nickname,
          profileImage: userInfo.kakao_account?.profile?.profile_image_url || userInfo.properties?.profile_image,
          email: userInfo.kakao_account?.email,
        },
      }, window.location.origin);

      setTimeout(() => window.close(), 1000);

    } catch (err) {
      setStatus(`오류: ${err.message}`);
    }
  };

  // URL에 code가 있으면 자동 처리
  useEffect(() => {
    const urlParams = new URLSearchParams(urlInfo.search);
    const code = urlParams.get('code');
    if (code) {
      processLogin();
    }
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5', padding: 20 }}>
      <ActivityIndicator size="large" color="#FEE500" />
      <Text style={{ marginTop: 16, fontSize: 16, color: '#333' }}>{status}</Text>
    </View>
  );
}

export default function App() {
  // 웹에서 카카오 콜백 URL인지 확인
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const path = window.location.pathname;
    if (path === '/auth/kakao/callback') {
      return <KakaoCallbackHandler />;
    }
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <OnboardingProvider>
          <NavigationContainer>
            <NotificationProvider userId="temp_user">
              <WatchlistProvider userId="temp_user">
                <StatusBar style="dark" />
                <AppNavigator />
              </WatchlistProvider>
            </NotificationProvider>
          </NavigationContainer>
        </OnboardingProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
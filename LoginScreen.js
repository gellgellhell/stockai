import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from './AuthContext';

const isWeb = Platform.OS === 'web';

export default function LoginScreen({ navigation }) {
  const { loginWithGoogle, loginWithApple, loginWithKakao } = useAuth();
  const [loading, setLoading] = useState(null); // 'google', 'apple', 'kakao', or null

  const handleGoogleLogin = async () => {
    setLoading('google');
    const { user, error } = await loginWithGoogle();
    setLoading(null);

    if (error) {
      Alert.alert('로그인 실패', error);
    }
  };

  const handleAppleLogin = async () => {
    setLoading('apple');
    const { user, error } = await loginWithApple();
    setLoading(null);

    if (error) {
      Alert.alert('로그인 실패', error);
    }
  };

  const handleKakaoLogin = async () => {
    setLoading('kakao');
    const { user, error } = await loginWithKakao();
    setLoading(null);

    if (error) {
      Alert.alert('알림', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* 상단 로고 영역 - 파란 배경 */}
      <View style={styles.logoSection}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>Stock</Text>
          <Text style={styles.logoTextBold}>AI</Text>
        </View>
        <Text style={styles.tagline}>AI가 분석하는 스마트 투자</Text>
      </View>

      {/* 하단 로그인 영역 - 흰 배경 */}
      <View style={styles.loginSection}>
        <Text style={styles.welcomeTitle}>환영합니다</Text>
        <Text style={styles.welcomeSubtitle}>
          로그인하고 AI 투자 분석을 시작하세요
        </Text>

        {/* 기능 소개 */}
        <View style={styles.featuresContainer}>
          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name="analytics-outline" size={20} color="#3B82F6" />
            </View>
            <Text style={styles.featureText}>AI 기반 차트 분석</Text>
          </View>
          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name="notifications-outline" size={20} color="#3B82F6" />
            </View>
            <Text style={styles.featureText}>매일 아침 분석 리포트</Text>
          </View>
          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name="speedometer-outline" size={20} color="#3B82F6" />
            </View>
            <Text style={styles.featureText}>0~100 점수로 쉬운 판단</Text>
          </View>
        </View>

        {/* 로그인 버튼들 */}
        <View style={styles.loginButtons}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleGoogleLogin}
            disabled={loading !== null}
          >
            {loading === 'google' ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="logo-google" size={20} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>Google로 계속하기</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Apple 로그인 - iOS 앱에서만 표시 */}
          {!isWeb && (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleAppleLogin}
              disabled={loading !== null}
            >
              {loading === 'apple' ? (
                <ActivityIndicator color="#000000" />
              ) : (
                <>
                  <Ionicons name="logo-apple" size={20} color="#000000" />
                  <Text style={styles.secondaryButtonText}>Apple로 계속하기</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.kakaoButton}
            onPress={handleKakaoLogin}
            disabled={loading !== null}
          >
            {loading === 'kakao' ? (
              <ActivityIndicator color="#3C1E1E" />
            ) : (
              <>
                <Ionicons name="chatbubble" size={18} color="#3C1E1E" />
                <Text style={styles.kakaoButtonText}>카카오로 계속하기</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* 하단 텍스트 */}
        <Text style={styles.disclaimer}>
          계속 진행하면 서비스 이용약관 및{'\n'}개인정보처리방침에 동의하는 것으로 간주됩니다.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#3B82F6',
  },
  logoSection: {
    flex: 0.35,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  logoText: {
    fontSize: 42,
    color: '#FFFFFF',
    fontWeight: '300',
  },
  logoTextBold: {
    fontSize: 42,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  tagline: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
  },
  loginSection: {
    flex: 0.65,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 24,
  },
  featuresContainer: {
    marginBottom: 32,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featureText: {
    fontSize: 15,
    color: '#374151',
  },
  loginButtons: {
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 10,
  },
  secondaryButtonText: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '600',
  },
  kakaoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE500',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
  },
  kakaoButtonText: {
    color: '#3C1E1E',
    fontSize: 16,
    fontWeight: '600',
  },
  disclaimer: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 24,
  },
});

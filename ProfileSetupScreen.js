import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from './AuthContext';

const INVESTMENT_STYLES = [
  { id: 'aggressive', label: '공격적 투자', icon: 'flash', description: '고위험 고수익 추구' },
  { id: 'moderate', label: '균형 투자', icon: 'analytics', description: '적절한 위험과 수익' },
  { id: 'conservative', label: '안정 투자', icon: 'shield-checkmark', description: '안정적인 수익 추구' },
];

const INTERESTS = [
  { id: 'crypto', label: '암호화폐', icon: 'logo-bitcoin' },
  { id: 'us_stock', label: '미국 주식', icon: 'trending-up' },
  { id: 'kr_stock', label: '한국 주식', icon: 'flag' },
  { id: 'etf', label: 'ETF', icon: 'layers' },
];

export default function ProfileSetupScreen() {
  const { user, completeProfile, signOut } = useAuth();

  const handleLogout = async () => {
    // 웹에서는 window.confirm 사용
    const confirmed = window.confirm('로그아웃 하시겠습니까?');
    if (confirmed) {
      try {
        await signOut();
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
  };
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form data
  const [nickname, setNickname] = useState(user?.displayName || '');
  const [investmentStyle, setInvestmentStyle] = useState('');
  const [interests, setInterests] = useState([]);

  const toggleInterest = (id) => {
    if (interests.includes(id)) {
      setInterests(interests.filter(i => i !== id));
    } else {
      setInterests([...interests, id]);
    }
  };

  const handleNext = () => {
    if (step === 1 && !nickname.trim()) {
      Alert.alert('알림', '닉네임을 입력해주세요.');
      return;
    }
    if (step === 2 && !investmentStyle) {
      Alert.alert('알림', '투자 스타일을 선택해주세요.');
      return;
    }
    setStep(step + 1);
  };

  const handleComplete = async () => {
    if (interests.length === 0) {
      Alert.alert('알림', '관심 분야를 1개 이상 선택해주세요.');
      return;
    }

    setLoading(true);
    try {
      await completeProfile({
        nickname: nickname.trim(),
        investmentStyle,
        interests,
      });
      // completeProfile이 isNewUser를 false로 설정하므로 자동으로 메인 화면으로 이동
    } catch (err) {
      console.log('Profile save error:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>닉네임 설정</Text>
        <Text style={styles.stepSubtitle}>다른 사용자에게 보여질 이름입니다</Text>
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={nickname}
          onChangeText={setNickname}
          placeholder="닉네임을 입력하세요"
          placeholderTextColor="#9CA3AF"
          maxLength={20}
        />
        <Text style={styles.charCount}>{nickname.length}/20</Text>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>투자 스타일</Text>
        <Text style={styles.stepSubtitle}>본인의 투자 성향을 선택해주세요</Text>
      </View>

      <View style={styles.optionsContainer}>
        {INVESTMENT_STYLES.map((style) => (
          <TouchableOpacity
            key={style.id}
            style={[
              styles.optionCard,
              investmentStyle === style.id && styles.optionCardSelected
            ]}
            onPress={() => setInvestmentStyle(style.id)}
          >
            <View style={[
              styles.optionIcon,
              investmentStyle === style.id && styles.optionIconSelected
            ]}>
              <Ionicons
                name={style.icon}
                size={24}
                color={investmentStyle === style.id ? '#FFFFFF' : '#3B82F6'}
              />
            </View>
            <Text style={[
              styles.optionLabel,
              investmentStyle === style.id && styles.optionLabelSelected
            ]}>
              {style.label}
            </Text>
            <Text style={styles.optionDescription}>{style.description}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>관심 분야</Text>
        <Text style={styles.stepSubtitle}>관심 있는 투자 분야를 선택해주세요 (복수 선택 가능)</Text>
      </View>

      <View style={styles.interestsGrid}>
        {INTERESTS.map((interest) => (
          <TouchableOpacity
            key={interest.id}
            style={[
              styles.interestCard,
              interests.includes(interest.id) && styles.interestCardSelected
            ]}
            onPress={() => toggleInterest(interest.id)}
          >
            <View style={[
              styles.interestIcon,
              interests.includes(interest.id) && styles.interestIconSelected
            ]}>
              <Ionicons
                name={interest.icon}
                size={28}
                color={interests.includes(interest.id) ? '#FFFFFF' : '#3B82F6'}
              />
            </View>
            <Text style={[
              styles.interestLabel,
              interests.includes(interest.id) && styles.interestLabelSelected
            ]}>
              {interest.label}
            </Text>
            {interests.includes(interest.id) && (
              <View style={styles.checkBadge}>
                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Logout */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>프로필 설정</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutLink}>로그아웃</Text>
        </TouchableOpacity>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${(step / 3) * 100}%` }]} />
        </View>
        <Text style={styles.progressText}>{step}/3</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </ScrollView>

      {/* Bottom Buttons */}
      <View style={styles.bottomContainer}>
        {step > 1 && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setStep(step - 1)}
          >
            <Text style={styles.backButtonText}>이전</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.nextButton, step === 1 && styles.nextButtonFull]}
          onPress={step === 3 ? handleComplete : handleNext}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.nextButtonText}>
              {step === 3 ? '시작하기' : '다음'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  logoutLink: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '500',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  scrollView: {
    flex: 1,
  },
  stepContainer: {
    padding: 24,
  },
  stepHeader: {
    marginBottom: 32,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
  },
  inputContainer: {
    position: 'relative',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    color: '#1F2937',
  },
  charCount: {
    position: 'absolute',
    right: 16,
    top: 18,
    fontSize: 14,
    color: '#9CA3AF',
  },
  optionsContainer: {
    gap: 12,
  },
  optionCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  optionCardSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  optionIconSelected: {
    backgroundColor: '#3B82F6',
  },
  optionLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  optionLabelSelected: {
    color: '#3B82F6',
  },
  optionDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  interestCard: {
    width: '47%',
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    position: 'relative',
  },
  interestCardSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  interestIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  interestIconSelected: {
    backgroundColor: '#3B82F6',
  },
  interestLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  interestLabelSelected: {
    color: '#3B82F6',
  },
  checkBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomContainer: {
    flexDirection: 'row',
    padding: 24,
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  backButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  nextButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
  },
  nextButtonFull: {
    flex: 1,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

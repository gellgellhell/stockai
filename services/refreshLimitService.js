/**
 * 새로고침 횟수 제한 서비스
 * 무료 사용자의 일일 새로고침 횟수 관리
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'refresh_limit_data';
const FREE_DAILY_LIMIT = 5; // 무료 사용자 일일 제한
const PREMIUM_DAILY_LIMIT = 999; // 프리미엄 사용자 (사실상 무제한)

/**
 * 오늘 날짜 문자열 반환 (YYYY-MM-DD)
 */
const getTodayString = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

/**
 * 저장된 데이터 가져오기
 */
const getStoredData = async () => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to get refresh limit data:', error);
  }
  return null;
};

/**
 * 데이터 저장하기
 */
const saveData = async (data) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save refresh limit data:', error);
  }
};

/**
 * 현재 새로고침 상태 가져오기
 * @param {boolean} isPremium - 프리미엄 사용자 여부
 * @returns {Object} { used, limit, remaining, canRefresh }
 */
export const getRefreshStatus = async (isPremium = false) => {
  const today = getTodayString();
  const stored = await getStoredData();
  const limit = isPremium ? PREMIUM_DAILY_LIMIT : FREE_DAILY_LIMIT;

  // 저장된 데이터가 없거나 날짜가 다르면 초기화
  if (!stored || stored.date !== today) {
    const newData = {
      date: today,
      used: 0,
    };
    await saveData(newData);
    return {
      used: 0,
      limit,
      remaining: limit,
      canRefresh: true,
    };
  }

  const remaining = Math.max(0, limit - stored.used);
  return {
    used: stored.used,
    limit,
    remaining,
    canRefresh: remaining > 0,
  };
};

/**
 * 새로고침 사용 (횟수 차감)
 * @param {boolean} isPremium - 프리미엄 사용자 여부
 * @returns {Object} { success, used, limit, remaining, canRefresh }
 */
export const useRefresh = async (isPremium = false) => {
  const today = getTodayString();
  const stored = await getStoredData();
  const limit = isPremium ? PREMIUM_DAILY_LIMIT : FREE_DAILY_LIMIT;

  // 저장된 데이터가 없거나 날짜가 다르면 초기화
  let currentUsed = 0;
  if (stored && stored.date === today) {
    currentUsed = stored.used;
  }

  // 제한 확인
  if (currentUsed >= limit) {
    return {
      success: false,
      used: currentUsed,
      limit,
      remaining: 0,
      canRefresh: false,
      message: '오늘의 새로고침 횟수를 모두 사용했습니다.',
    };
  }

  // 횟수 증가
  const newUsed = currentUsed + 1;
  await saveData({
    date: today,
    used: newUsed,
  });

  const remaining = Math.max(0, limit - newUsed);
  return {
    success: true,
    used: newUsed,
    limit,
    remaining,
    canRefresh: remaining > 0,
  };
};

/**
 * 광고 시청으로 새로고침 횟수 추가
 * @param {number} count - 추가할 횟수
 * @returns {Object} { success, used, limit, remaining }
 */
export const addRefreshByAd = async (count = 1) => {
  const today = getTodayString();
  const stored = await getStoredData();

  let currentUsed = 0;
  if (stored && stored.date === today) {
    currentUsed = stored.used;
  }

  // 사용 횟수 감소 (음수 가능 = 보너스)
  const newUsed = Math.max(0, currentUsed - count);
  await saveData({
    date: today,
    used: newUsed,
  });

  return {
    success: true,
    used: newUsed,
    added: count,
    message: `새로고침 ${count}회가 추가되었습니다!`,
  };
};

/**
 * 새로고침 횟수 초기화 (테스트/관리용)
 */
export const resetRefreshCount = async () => {
  const today = getTodayString();
  await saveData({
    date: today,
    used: 0,
  });
  return { success: true, message: '새로고침 횟수가 초기화되었습니다.' };
};

/**
 * 일일 제한 상수 내보내기
 */
export const LIMITS = {
  FREE: FREE_DAILY_LIMIT,
  PREMIUM: PREMIUM_DAILY_LIMIT,
};

/**
 * 광고 설정 (AdMob)
 * 실제 배포시 테스트 ID를 실제 광고 단위 ID로 교체
 */

import { Platform } from 'react-native';

// 테스트용 광고 단위 ID (개발 중에만 사용)
const TEST_IDS = {
  ios: {
    banner: 'ca-app-pub-3940256099942544/2934735716',
    interstitial: 'ca-app-pub-3940256099942544/4411468910',
    rewarded: 'ca-app-pub-3940256099942544/1712485313',
    rewardedInterstitial: 'ca-app-pub-3940256099942544/6978759866',
  },
  android: {
    banner: 'ca-app-pub-3940256099942544/6300978111',
    interstitial: 'ca-app-pub-3940256099942544/1033173712',
    rewarded: 'ca-app-pub-3940256099942544/5224354917',
    rewardedInterstitial: 'ca-app-pub-3940256099942544/5354046379',
  },
};

// 실제 광고 단위 ID (프로덕션용 - AdMob 콘솔에서 발급)
const PRODUCTION_IDS = {
  ios: {
    banner: 'YOUR_IOS_BANNER_AD_UNIT_ID',
    interstitial: 'YOUR_IOS_INTERSTITIAL_AD_UNIT_ID',
    rewarded: 'YOUR_IOS_REWARDED_AD_UNIT_ID',
    rewardedInterstitial: 'YOUR_IOS_REWARDED_INTERSTITIAL_AD_UNIT_ID',
  },
  android: {
    banner: 'YOUR_ANDROID_BANNER_AD_UNIT_ID',
    interstitial: 'YOUR_ANDROID_INTERSTITIAL_AD_UNIT_ID',
    rewarded: 'YOUR_ANDROID_REWARDED_AD_UNIT_ID',
    rewardedInterstitial: 'YOUR_ANDROID_REWARDED_INTERSTITIAL_AD_UNIT_ID',
  },
};

// 개발/프로덕션 환경에 따라 광고 ID 선택
const isDevelopment = __DEV__;

const getAdUnitIds = () => {
  const platform = Platform.OS;
  const ids = isDevelopment ? TEST_IDS : PRODUCTION_IDS;

  return ids[platform] || ids.android;
};

export const AD_CONFIG = {
  // 광고 단위 ID
  adUnitIds: getAdUnitIds(),

  // AdMob 앱 ID (app.json에도 설정 필요)
  appId: {
    ios: 'ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY',
    android: 'ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY',
  },

  // 광고 요청 설정
  requestOptions: {
    requestNonPersonalizedAdsOnly: false, // GDPR 관련
    keywords: ['stock', 'trading', 'finance', 'investment'],
  },

  // 광고 타입별 설정
  types: {
    rewarded: {
      name: '리워드 광고',
      description: '30초 영상 시청 후 보상',
      minWatchTime: 5000, // 최소 시청 시간 (ms)
    },
    interstitial: {
      name: '전면 광고',
      description: '5초 후 스킵 가능',
    },
  },

  // 광고 쿨다운 (ms) - 백엔드와 동기화
  cooldown: {
    rewarded: 60000,      // 1분
    interstitial: 30000,  // 30초
  },

  // 광고 보상 (표시용 - 실제 보상은 백엔드에서 처리)
  rewards: {
    rewarded: {
      refresh: 3,
      level2: 1,
    },
    interstitial: {
      refresh: 1,
    },
  },
};

export default AD_CONFIG;

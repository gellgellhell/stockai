/**
 * 전면 광고 매니저
 * 화면 전환 시 전면 광고 표시
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAd } from '../AdContext';
import { AD_CONFIG } from '../config/adConfig';

// AdMob SDK가 설치된 경우에만 import
let InterstitialAd, AdEventType, TestIds;
try {
  const MobileAds = require('react-native-google-mobile-ads');
  InterstitialAd = MobileAds.InterstitialAd;
  AdEventType = MobileAds.AdEventType;
  TestIds = MobileAds.TestIds;
} catch (e) {
  console.log('AdMob SDK not installed for interstitial ads');
}

// 싱글톤 인스턴스
let interstitialAdInstance = null;
let isInterstitialLoaded = false;

/**
 * 전면 광고 초기화
 */
export const initializeInterstitialAd = () => {
  if (!InterstitialAd) {
    console.log('InterstitialAd not available');
    return;
  }

  const adUnitId = AD_CONFIG.adUnitIds?.interstitial || 'ca-app-pub-3940256099942544/1033173712';

  interstitialAdInstance = InterstitialAd.createForAdRequest(adUnitId, {
    requestNonPersonalizedAdsOnly: true,
    keywords: ['stock', 'trading', 'finance'],
  });

  // 광고 로드 완료
  interstitialAdInstance.addAdEventListener(AdEventType.LOADED, () => {
    isInterstitialLoaded = true;
    console.log('Interstitial ad loaded');
  });

  // 광고 닫힘
  interstitialAdInstance.addAdEventListener(AdEventType.CLOSED, () => {
    isInterstitialLoaded = false;
    // 다시 로드
    interstitialAdInstance.load();
  });

  // 에러
  interstitialAdInstance.addAdEventListener(AdEventType.ERROR, (error) => {
    console.error('Interstitial ad error:', error);
    isInterstitialLoaded = false;
  });

  // 초기 로드
  interstitialAdInstance.load();
};

/**
 * 전면 광고 표시
 * @returns {Promise<boolean>} 광고 표시 성공 여부
 */
export const showInterstitialAd = async () => {
  if (!InterstitialAd) {
    console.log('InterstitialAd not available');
    return false;
  }

  if (!interstitialAdInstance || !isInterstitialLoaded) {
    console.log('Interstitial ad not ready');
    return false;
  }

  try {
    await interstitialAdInstance.show();
    return true;
  } catch (error) {
    console.error('Failed to show interstitial ad:', error);
    return false;
  }
};

/**
 * 전면 광고 로드 상태 확인
 */
export const isInterstitialAdReady = () => {
  return isInterstitialLoaded;
};

/**
 * 전면 광고 Hook
 */
export const useInterstitialAd = (showInterval = 3) => {
  const { canWatchInterstitial, startWatchingAd, completeWatchingAd } = useAd();
  const screenCountRef = useRef(0);

  // 화면 전환 카운트 증가 및 광고 표시 체크
  const onScreenTransition = useCallback(async () => {
    screenCountRef.current += 1;

    // 일정 횟수마다 광고 표시
    if (screenCountRef.current >= showInterval && canWatchInterstitial) {
      screenCountRef.current = 0;

      // 백엔드에 광고 시작 알림
      const startResult = await startWatchingAd('interstitial');
      if (!startResult.success) {
        return false;
      }

      // 광고 표시
      const shown = await showInterstitialAd();

      if (shown) {
        // 백엔드에 광고 완료 알림
        await completeWatchingAd('interstitial', AD_CONFIG.adUnitIds?.interstitial);
        return true;
      }
    }

    return false;
  }, [canWatchInterstitial, showInterval, startWatchingAd, completeWatchingAd]);

  // 카운터 리셋
  const resetCounter = useCallback(() => {
    screenCountRef.current = 0;
  }, []);

  return {
    onScreenTransition,
    resetCounter,
    screenCount: screenCountRef.current,
  };
};

// 컴포넌트로도 사용 가능
const InterstitialAdManager = ({ children, showInterval = 3 }) => {
  const { onScreenTransition } = useInterstitialAd(showInterval);

  useEffect(() => {
    initializeInterstitialAd();
  }, []);

  return children;
};

export default InterstitialAdManager;

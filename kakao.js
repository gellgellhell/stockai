// 카카오 JavaScript SDK 설정
const KAKAO_JS_KEY = 'f469a6c63571d2566ede8577050994e0';
const KAKAO_REST_API_KEY = '4ee4ca90f63be6e44fa529d80bd13304';

// SDK 로드 여부 확인
let isKakaoLoaded = false;

// 카카오 SDK 초기화
export const initKakao = () => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Window is not defined'));
      return;
    }

    // 이미 로드됨
    if (isKakaoLoaded && window.Kakao?.isInitialized()) {
      resolve(true);
      return;
    }

    // SDK 스크립트 로드
    if (!document.getElementById('kakao-sdk')) {
      const script = document.createElement('script');
      script.id = 'kakao-sdk';
      script.src = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js';
      script.crossOrigin = 'anonymous';
      script.onload = () => {
        if (window.Kakao && !window.Kakao.isInitialized()) {
          window.Kakao.init(KAKAO_JS_KEY);
          isKakaoLoaded = true;
          console.log('Kakao SDK initialized');
          resolve(true);
        }
      };
      script.onerror = () => {
        reject(new Error('Failed to load Kakao SDK'));
      };
      document.head.appendChild(script);
    } else if (window.Kakao) {
      if (!window.Kakao.isInitialized()) {
        window.Kakao.init(KAKAO_JS_KEY);
      }
      isKakaoLoaded = true;
      resolve(true);
    }
  });
};

// 카카오 로그인 (팝업 방식 - SDK v2)
export const kakaoLogin = () => {
  return new Promise(async (resolve, reject) => {
    try {
      await initKakao();

      // 팝업 창 열기
      const width = 500;
      const height = 600;
      const left = (window.screen.width - width) / 2;
      const top = (window.screen.height - height) / 2;

      const redirectUri = window.location.origin + '/auth/kakao/callback';

      // 카카오 인증 URL 생성 (authorization code flow - REST API 키 사용)
      const state = Math.random().toString(36).substring(7);
      const kakaoAuthUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${KAKAO_REST_API_KEY}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=profile_nickname&state=${state}`;

      const popup = window.open(
        kakaoAuthUrl,
        'kakao_login',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // 팝업에서 메시지 수신 대기
      const handleMessage = (event) => {
        if (event.origin !== window.location.origin) return;

        if (event.data.type === 'KAKAO_LOGIN_SUCCESS') {
          window.removeEventListener('message', handleMessage);
          clearInterval(checkPopup);
          popup?.close();
          resolve({
            accessToken: event.data.accessToken,
            user: event.data.user
          });
        } else if (event.data.type === 'KAKAO_LOGIN_ERROR') {
          window.removeEventListener('message', handleMessage);
          clearInterval(checkPopup);
          popup?.close();
          reject(new Error(event.data.error));
        }
      };

      window.addEventListener('message', handleMessage);

      // 팝업 닫힘 감지
      const checkPopup = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkPopup);
          window.removeEventListener('message', handleMessage);
          reject(new Error('로그인이 취소되었습니다.'));
        }
      }, 1000);

    } catch (error) {
      reject(error);
    }
  });
};

// 카카오 로그아웃
export const kakaoLogout = () => {
  return new Promise((resolve, reject) => {
    if (!window.Kakao?.Auth?.getAccessToken()) {
      resolve(true);
      return;
    }

    window.Kakao.Auth.logout(() => {
      console.log('Kakao logout success');
      resolve(true);
    });
  });
};

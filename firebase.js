import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signInWithCustomToken,
  GoogleAuthProvider,
  OAuthProvider,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { kakaoLogin, kakaoLogout } from './kakao';

const firebaseConfig = {
  apiKey: "AIzaSyA06rbH6pJfuEVtpKX7mbLUVqoCc05UAeI",
  authDomain: "scorestock-8268d.firebaseapp.com",
  projectId: "scorestock-8268d",
  storageBucket: "scorestock-8268d.firebasestorage.app",
  messagingSenderId: "1024998669474",
  appId: "1:1024998669474:web:9ddac47140842684102bfb",
  measurementId: "G-0474E5EGGC"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);

// Auth 인스턴스
export const auth = getAuth(app);

// Firestore 인스턴스
export const db = getFirestore(app);

// Google 로그인 Provider
export const googleProvider = new GoogleAuthProvider();

// Apple 로그인 Provider
export const appleProvider = new OAuthProvider('apple.com');
appleProvider.addScope('email');
appleProvider.addScope('name');

// Google 로그인 함수
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const isNewUser = result._tokenResponse?.isNewUser || false;
    return { user: result.user, isNewUser, error: null };
  } catch (error) {
    return { user: null, isNewUser: false, error: error.message };
  }
};

// Apple 로그인 함수
export const signInWithApple = async () => {
  try {
    const result = await signInWithPopup(auth, appleProvider);
    const isNewUser = result._tokenResponse?.isNewUser || false;
    return { user: result.user, isNewUser, error: null };
  } catch (error) {
    return { user: null, isNewUser: false, error: error.message };
  }
};

// 카카오 로그인
export const signInWithKakao = async () => {
  try {
    // 카카오 SDK로 로그인
    const kakaoResult = await kakaoLogin();

    // Firebase Functions를 통해 Custom Token 발급받기
    // Cloud Function URL (배포 후 설정)
    const CLOUD_FUNCTION_URL = process.env.KAKAO_AUTH_FUNCTION_URL;

    if (CLOUD_FUNCTION_URL) {
      // Firebase Functions가 설정된 경우
      const response = await fetch(CLOUD_FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: kakaoResult.accessToken })
      });

      const { firebaseToken } = await response.json();
      const userCredential = await signInWithCustomToken(auth, firebaseToken);

      return {
        user: userCredential.user,
        isNewUser: true,
        kakaoUser: kakaoResult.user,
        error: null
      };
    } else {
      // Firebase Functions가 없는 경우 - 카카오 정보만 반환
      // 임시로 카카오 사용자 정보를 반환 (Firebase Auth 없이)
      return {
        user: null,
        isNewUser: true,
        kakaoUser: kakaoResult.user,
        error: null,
        needsFirebaseSetup: true
      };
    }
  } catch (error) {
    console.error('Kakao login error:', error);
    return {
      user: null,
      isNewUser: false,
      error: error.message || '카카오 로그인에 실패했습니다.'
    };
  }
};

// 로그아웃 함수
export const logout = async () => {
  try {
    // 카카오 로그아웃도 함께 처리
    try {
      await kakaoLogout();
    } catch (e) {
      console.log('Kakao logout skipped');
    }

    await signOut(auth);
    return { error: null };
  } catch (error) {
    return { error: error.message };
  }
};

// 인증 상태 변화 감지
export const subscribeToAuthChanges = (callback) => {
  return onAuthStateChanged(auth, callback);
};

// 사용자 프로필 저장
export const saveUserProfile = async (uid, profileData) => {
  try {
    await setDoc(doc(db, 'users', uid), {
      ...profileData,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return { error: null };
  } catch (error) {
    return { error: error.message };
  }
};

// 사용자 프로필 가져오기
export const getUserProfile = async (uid) => {
  try {
    const docSnap = await getDoc(doc(db, 'users', uid));
    if (docSnap.exists()) {
      return { profile: docSnap.data(), error: null };
    }
    return { profile: null, error: null };
  } catch (error) {
    return { profile: null, error: error.message };
  }
};

export default app;

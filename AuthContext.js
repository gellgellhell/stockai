import React, { createContext, useState, useEffect, useContext } from 'react';
import {
  subscribeToAuthChanges,
  signInWithGoogle,
  signInWithApple,
  signInWithKakao,
  logout,
  getUserProfile,
  saveUserProfile
} from './firebase';

const AuthContext = createContext({});

// 카카오 사용자용 로컬 스토리지 헬퍼
const getKakaoProfile = (uid) => {
  if (typeof window === 'undefined') return null;
  try {
    const data = localStorage.getItem(`kakao_profile_${uid}`);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

const saveKakaoProfile = (uid, profile) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`kakao_profile_${uid}`, JSON.stringify(profile));
  } catch {
    console.error('Failed to save Kakao profile to localStorage');
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);

  useEffect(() => {
    // Firebase 인증 상태 변화 감지
    const unsubscribe = subscribeToAuthChanges(async (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
        });

        // 사용자 프로필 확인
        const { profile } = await getUserProfile(firebaseUser.uid);
        setUserProfile(profile);

        // 프로필이 없으면 새 사용자로 간주
        if (!profile || !profile.profileCompleted) {
          setIsNewUser(true);
        } else {
          setIsNewUser(false);
        }
      } else {
        setUser(null);
        setUserProfile(null);
        setIsNewUser(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    const result = await signInWithGoogle();
    if (result.isNewUser) {
      setIsNewUser(true);
    }
    return result;
  };

  const loginWithApple = async () => {
    const result = await signInWithApple();
    if (result.isNewUser) {
      setIsNewUser(true);
    }
    return result;
  };

  const loginWithKakao = async () => {
    const result = await signInWithKakao();

    if (result.kakaoUser && !result.error) {
      // 카카오 로그인 성공 - Firebase Functions 없이도 동작
      if (result.needsFirebaseSetup) {
        const kakaoUid = `kakao_${result.kakaoUser.id}`;

        // Firebase Functions가 없는 경우, 카카오 사용자 정보로 임시 로그인
        setUser({
          uid: kakaoUid,
          email: result.kakaoUser.email,
          displayName: result.kakaoUser.nickname,
          photoURL: result.kakaoUser.profileImage,
          provider: 'kakao'
        });

        // 기존 프로필이 있는지 확인 (로컬 스토리지 우선)
        const localProfile = getKakaoProfile(kakaoUid);
        if (localProfile && localProfile.profileCompleted) {
          setUserProfile(localProfile);
          setIsNewUser(false);
        } else {
          // Firestore에서도 확인 (백업)
          const { profile } = await getUserProfile(kakaoUid);
          if (profile && profile.profileCompleted) {
            setUserProfile(profile);
            saveKakaoProfile(kakaoUid, profile); // 로컬에도 저장
            setIsNewUser(false);
          } else {
            setIsNewUser(true);
          }
        }
      } else if (result.isNewUser) {
        setIsNewUser(true);
      }
    }

    return result;
  };

  const completeProfile = async (profileData) => {
    if (!user) return { error: '로그인이 필요합니다.' };

    const fullProfile = {
      ...profileData,
      email: user.email,
      profileCompleted: true,
      createdAt: new Date().toISOString()
    };

    // 카카오 사용자인 경우 로컬 스토리지에 저장
    if (user.uid.startsWith('kakao_')) {
      saveKakaoProfile(user.uid, fullProfile);
    }

    // Firestore에도 저장 시도
    const result = await saveUserProfile(user.uid, fullProfile);

    // 로컬 상태 업데이트
    setUserProfile(fullProfile);
    setIsNewUser(false);

    return result;
  };

  // 프로필 설정 건너뛰기 (테스트용)
  const skipProfileSetup = () => {
    setIsNewUser(false);
  };

  const signOut = async () => {
    const result = await logout();
    // 카카오 사용자는 Firebase Auth를 사용하지 않으므로 수동으로 상태 초기화
    setUser(null);
    setUserProfile(null);
    setIsNewUser(false);
    return result;
  };

  return (
    <AuthContext.Provider value={{
      user,
      userProfile,
      loading,
      isNewUser,
      loginWithGoogle,
      loginWithApple,
      loginWithKakao,
      completeProfile,
      skipProfileSetup,
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export default AuthContext;

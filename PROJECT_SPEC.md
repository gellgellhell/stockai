# Stock AI Analyzer - 프로젝트 기획서

## 1. 프로젝트 개요

### 앱 정보
- **앱 이름**: Stock AI Analyzer
- **버전**: 1.0.0
- **패키지명**: com.stockai.analyzer
- **플랫폼**: iOS, Android, Web

### 기술 스택
| 분류 | 기술 |
|------|------|
| 프레임워크 | React Native (Expo SDK 51) |
| 언어 | JavaScript |
| 상태관리 | React Context API |
| 네비게이션 | React Navigation 6 |
| 인증 | Firebase Authentication, 카카오 로그인 |
| 백엔드 | Express.js (Node.js) |
| 데이터베이스 | SQLite (로컬) |
| 배포 (웹) | Vercel |
| 결제 | react-native-iap |
| 광고 | Google AdMob |
| 푸시 알림 | Expo Notifications |

---

## 2. 핵심 기능 (구현 완료)

### 2.1 사용자 인증
- [x] 카카오 로그인 (웹/앱)
- [x] Apple 로그인 (iOS)
- [x] 프로필 설정 화면
- [x] 온보딩 플로우

### 2.2 관심종목 관리
- [x] 종목 검색 (한국/미국 주식)
- [x] 관심종목 추가/삭제
- [x] 관심종목 목록 조회
- [x] 실시간 주가 정보 표시

### 2.3 AI 분석 기능
- [x] 3단계 분석 레벨 (Level 1/2/3)
  - Level 1: 기본 기술적 분석 (무료)
  - Level 2: 상세 기술적 분석 (베이직+)
  - Level 3: AI 심층 분석 (프로+)
- [x] 타임프레임별 분석 (1일/1주/1개월/3개월)
- [x] AI 점수 시스템 (0-100점)
- [x] 매수/매도/보유 추천
- [x] 분석 결과 캐싱 (백엔드)

### 2.4 새로고침 제한 시스템
- [x] 무료 사용자: 일일 5회 제한
- [x] 베이직: 50회 / 프로: 200회 / 프리미엄: 무제한
- [x] 새로고침 횟수 표시
- [x] 자정 자동 초기화

### 2.5 광고 시스템
- [x] 리워드 광고 시청 → 새로고침 +1회
- [x] Google AdMob 연동
- [x] 웹 환경 시뮬레이션

### 2.6 구독 결제 시스템
- [x] 3개 요금제 (베이직/프로/프리미엄)
- [x] react-native-iap 연동
- [x] 구독 상태 관리 (PaymentContext)
- [x] 구독 화면 UI
- [x] 구매 복원 기능

### 2.7 설정 기능
- [x] 다크/라이트 테마 전환
- [x] 알림 설정
- [x] 구독 정보 표시
- [x] 캐시 삭제
- [x] 로그아웃

### 2.8 기타
- [x] 인기 종목 화면
- [x] 알림 기록 화면
- [x] 웹 호환성 (Vercel 배포)

---

## 3. 화면 구성

```
App
├── OnboardingScreen (온보딩)
├── LoginScreen (로그인)
├── ProfileSetupScreen (프로필 설정)
└── MainTabs
    ├── Home (홈 - 관심종목 AI 점수)
    ├── Trending (인기 종목)
    ├── Search (종목 검색)
    └── Profile (설정)
        ├── SubscriptionScreen (구독 관리)
        ├── WatchlistScreen (관심종목 관리)
        ├── NotificationSettingsScreen (알림 설정)
        └── NotificationHistoryScreen (알림 기록)

StockDetailScreen (종목 상세 - 모든 탭에서 접근)
```

---

## 4. API 구조 (백엔드)

| 엔드포인트 | 메서드 | 설명 |
|------------|--------|------|
| `/api/analysis/analyze` | POST | AI 분석 요청 |
| `/api/market/search` | GET | 종목 검색 |
| `/api/market/quote/:symbol` | GET | 실시간 시세 |
| `/api/market/chart/:symbol` | GET | 차트 데이터 |
| `/api/watchlist` | GET/POST/DELETE | 관심종목 CRUD |
| `/api/payment/verify` | POST | 결제 검증 |
| `/api/payment/subscription/:userId` | GET | 구독 상태 |
| `/api/ads/reward` | POST | 광고 리워드 지급 |
| `/api/notifications` | GET/POST | 알림 관리 |
| `/api/user/profile` | GET/PUT | 프로필 관리 |

---

## 5. 요금제 구성

| 기능 | Free | 베이직 (₩4,900/월) | 프로 (₩9,900/월) | 프리미엄 (₩19,900/월) |
|------|------|---------------------|-------------------|------------------------|
| 일일 새로고침 | 5회 | 50회 | 200회 | 무제한 |
| 관심종목 개수 | 5개 | 20개 | 50개 | 무제한 |
| Level 1 분석 | O | O | O | O |
| Level 2 분석 | X | O | O | O |
| Level 3 분석 | X | X | O | O |
| 광고 제거 | X | O | O | O |
| 우선 지원 | X | X | X | O |

---

## 6. 향후 개발 계획

### 6.1 단기 (1-2주)

#### 1) 앱 스토어 출시 준비
- [ ] AdMob 실제 앱 ID 등록
- [ ] 인앱결제 상품 등록 (App Store Connect / Google Play Console)
- [ ] 앱 아이콘 및 스크린샷 제작
- [ ] 개인정보처리방침 페이지 작성
- [ ] TestFlight / 내부 테스트 배포

#### 2) 안정성 개선
- [ ] 에러 핸들링 강화
- [ ] 오프라인 모드 지원
- [ ] 로딩 상태 개선
- [ ] 캐싱 최적화

#### 3) 분석 기능 고도화
- [ ] 분석 결과 히스토리 저장
- [ ] 이전 분석과 비교 기능
- [ ] 분석 정확도 피드백 시스템

### 6.2 중기 (1-2개월)

#### 4) 가격 알림 기능
- [ ] 목표가 설정
- [ ] 변동률 알림
- [ ] 푸시 알림 발송

#### 5) 실시간 차트
- [ ] 인앱 차트 라이브러리 통합 (react-native-charts-wrapper)
- [ ] 캔들스틱/라인 차트
- [ ] 기술 지표 오버레이

#### 6) 커뮤니티 기능
- [ ] 종목 토론 게시판
- [ ] 분석 공유 기능
- [ ] 팔로우/팔로워

### 6.3 장기 (3개월+)

#### 7) 포트폴리오 관리
- [ ] 보유 종목 등록
- [ ] 수익률 계산
- [ ] 포트폴리오 분석

#### 8) 글로벌 확장
- [ ] 영어 지원
- [ ] 일본/중국 주식 추가
- [ ] 암호화폐 지원

#### 9) AI 고도화
- [ ] GPT-4 기반 심층 분석
- [ ] 뉴스 감성 분석
- [ ] 실적 발표 분석

---

## 7. 프로젝트 구조

```
stock-ai-analyzer/
├── App.js                    # 앱 진입점
├── app.json                  # Expo 설정
├── package.json              # 의존성
│
├── /screens                  # 화면 컴포넌트
│   ├── OnboardingScreen.js
│   ├── NotificationSettingsScreen.js
│   └── NotificationHistoryScreen.js
│
├── /services                 # API 서비스
│   ├── adService.js          # 광고 서비스
│   ├── aiAnalysis.js         # AI 분석
│   ├── iapService.js         # 인앱결제
│   ├── marketApi.js          # 시장 데이터
│   ├── refreshLimitService.js # 새로고침 제한
│   ├── notificationService.js # 알림
│   └── watchlistService.js   # 관심종목
│
├── /components               # 재사용 컴포넌트
├── /hooks                    # 커스텀 훅
├── /config                   # 설정 파일
├── /assets                   # 이미지, 폰트
│
├── HomeScreen.js             # 홈 화면
├── SearchScreen.js           # 검색 화면
├── TrendingScreen.js         # 인기 종목
├── ProfileScreen.js          # 설정 화면
├── StockDetailScreen.js      # 종목 상세
├── SubscriptionScreen.js     # 구독 관리
├── WatchlistScreen.js        # 관심종목 관리
├── LoginScreen.js            # 로그인
├── ProfileSetupScreen.js     # 프로필 설정
│
├── AuthContext.js            # 인증 상태
├── ThemeContext.js           # 테마 상태
├── WatchlistContext.js       # 관심종목 상태
├── PaymentContext.js         # 결제 상태
├── NotificationContext.js    # 알림 상태
├── OnboardingContext.js      # 온보딩 상태
│
└── /backend                  # 백엔드 서버
    ├── server.js             # Express 서버
    ├── /routes               # API 라우트
    ├── /services             # 비즈니스 로직
    └── /db                   # 데이터베이스
```

---

## 8. 개발 환경 설정

```bash
# 프론트엔드
cd stock-ai-analyzer
npm install
npm start

# 백엔드
cd backend
npm install
npm run dev

# 웹 빌드 (Vercel)
npm run build:web
```

---

## 9. 배포 정보

| 환경 | URL / 정보 |
|------|------------|
| 웹 (Vercel) | 배포 완료 |
| iOS | App Store 심사 대기 |
| Android | Google Play 심사 대기 |
| 백엔드 | 별도 서버 필요 |
| GitHub | github.com/gellgellhell/stockai |

---

## 10. 우선순위 개발 항목 (권장)

1. **앱 스토어 출시 준비** - 실제 배포를 위한 필수 작업
2. **에러 핸들링 강화** - 안정성 확보
3. **분석 결과 히스토리** - 사용자 가치 향상
4. **가격 알림** - 리텐션 향상 핵심 기능
5. **실시간 차트** - 사용자 경험 개선

---

*마지막 업데이트: 2026-01-28*

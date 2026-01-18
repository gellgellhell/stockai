/**
 * SQLite 데이터베이스 설정
 * 사용자 및 API 사용량 추적
 */

const Database = require('better-sqlite3');
const path = require('path');

// 데이터베이스 파일 경로
const DB_PATH = path.join(__dirname, 'stockai.db');

// 데이터베이스 연결
const db = new Database(DB_PATH);

// WAL 모드 활성화 (성능 향상)
db.pragma('journal_mode = WAL');

/**
 * 테이블 초기화
 */
const initializeTables = () => {
  // 사용자 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT UNIQUE NOT NULL,
      email TEXT,
      plan TEXT DEFAULT 'free',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 일일 사용량 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS daily_usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      refresh_count INTEGER DEFAULT 0,
      level1_count INTEGER DEFAULT 0,
      level2_count INTEGER DEFAULT 0,
      level3_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, date)
    )
  `);

  // API 호출 로그 테이블 (상세 기록)
  db.exec(`
    CREATE TABLE IF NOT EXISTS api_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      endpoint TEXT NOT NULL,
      symbol TEXT,
      timeframe TEXT,
      analysis_level INTEGER,
      method TEXT,
      tokens_used INTEGER,
      cost_usd REAL,
      response_time_ms INTEGER,
      success INTEGER DEFAULT 1,
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 구독 이력 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS subscription_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      plan TEXT NOT NULL,
      action TEXT NOT NULL,
      started_at DATETIME,
      ended_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 광고 보상 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS ad_rewards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      ad_type TEXT NOT NULL,
      reward_type TEXT NOT NULL,
      reward_amount INTEGER DEFAULT 1,
      ad_provider TEXT,
      ad_unit_id TEXT,
      watched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, date, id)
    )
  `);

  // 일일 광고 보상 요약 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS daily_ad_summary (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      total_ads_watched INTEGER DEFAULT 0,
      refresh_earned INTEGER DEFAULT 0,
      level2_earned INTEGER DEFAULT 0,
      level3_earned INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, date)
    )
  `);

  // 구독 테이블 (인앱결제)
  db.exec(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      plan_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      transaction_id TEXT,
      original_transaction_id TEXT,
      platform TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      purchased_at DATETIME,
      expires_at DATETIME,
      cancel_reason TEXT,
      receipt_data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 관심종목 그룹 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS watchlist_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#3B82F6',
      icon TEXT DEFAULT 'folder',
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, name)
    )
  `);

  // 관심종목 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS watchlist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      symbol TEXT NOT NULL,
      name TEXT,
      type TEXT DEFAULT 'stock',
      group_id INTEGER,
      sort_order INTEGER DEFAULT 0,
      memo TEXT,
      target_price REAL,
      alert_above REAL,
      alert_below REAL,
      alert_enabled INTEGER DEFAULT 0,
      last_price REAL,
      last_change_percent REAL,
      last_updated DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, symbol),
      FOREIGN KEY (group_id) REFERENCES watchlist_groups(id) ON DELETE SET NULL
    )
  `);

  // 가격 알림 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS price_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      symbol TEXT NOT NULL,
      condition TEXT NOT NULL,
      target_price REAL NOT NULL,
      current_price REAL,
      triggered INTEGER DEFAULT 0,
      triggered_at DATETIME,
      notification_sent INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME
    )
  `);

  // 푸시 토큰 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS push_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      token TEXT NOT NULL,
      platform TEXT NOT NULL,
      device_id TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, token)
    )
  `);

  // 알림 설정 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS notification_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT UNIQUE NOT NULL,
      price_alerts INTEGER DEFAULT 1,
      analysis_complete INTEGER DEFAULT 1,
      daily_summary INTEGER DEFAULT 1,
      marketing INTEGER DEFAULT 0,
      quiet_start TEXT DEFAULT '22:00',
      quiet_end TEXT DEFAULT '08:00',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 알림 이력 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS notification_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT,
      data TEXT,
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      read_at DATETIME,
      clicked_at DATETIME
    )
  `);

  // 인덱스 생성
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_daily_usage_user_date ON daily_usage(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_api_logs_user ON api_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_api_logs_created ON api_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_ad_rewards_user_date ON ad_rewards(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_daily_ad_summary_user_date ON daily_ad_summary(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
    CREATE INDEX IF NOT EXISTS idx_watchlist_user ON watchlist(user_id);
    CREATE INDEX IF NOT EXISTS idx_watchlist_symbol ON watchlist(symbol);
    CREATE INDEX IF NOT EXISTS idx_watchlist_groups_user ON watchlist_groups(user_id);
    CREATE INDEX IF NOT EXISTS idx_price_alerts_user ON price_alerts(user_id);
    CREATE INDEX IF NOT EXISTS idx_price_alerts_symbol ON price_alerts(symbol);
  `);

  console.log('✅ Database tables initialized');
};

// 초기화 실행
initializeTables();

module.exports = db;

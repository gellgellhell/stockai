/**
 * 관심종목 버튼 컴포넌트
 * 종목 상세 화면 등에서 관심종목 추가/제거
 */

import React, { useState, useCallback } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWatchlist } from '../WatchlistContext';

/**
 * 관심종목 아이콘 버튼 (헤더용)
 */
export const WatchlistIconButton = ({ symbol, name, type = 'stock', size = 24 }) => {
  const { isInWatchlist, toggleWatchlist, loading, limitInfo } = useWatchlist();
  const [localLoading, setLocalLoading] = useState(false);

  const inWatchlist = isInWatchlist(symbol);

  const handlePress = useCallback(async () => {
    // 추가 시 한도 체크
    if (!inWatchlist && !limitInfo.allowed) {
      Alert.alert(
        '관심종목 한도 초과',
        `관심종목 한도(${limitInfo.limit}개)에 도달했습니다.\n플랜을 업그레이드하면 더 많은 종목을 추가할 수 있습니다.`,
        [{ text: '확인' }]
      );
      return;
    }

    setLocalLoading(true);
    try {
      const result = await toggleWatchlist({ symbol, name, type });

      if (!result.success && result.error !== 'ALREADY_EXISTS') {
        Alert.alert('오류', result.message || result.error);
      }
    } finally {
      setLocalLoading(false);
    }
  }, [symbol, name, type, inWatchlist, limitInfo, toggleWatchlist]);

  if (localLoading || loading) {
    return (
      <View style={styles.iconButton}>
        <ActivityIndicator size="small" color="#3B82F6" />
      </View>
    );
  }

  return (
    <TouchableOpacity style={styles.iconButton} onPress={handlePress}>
      <Ionicons
        name={inWatchlist ? 'star' : 'star-outline'}
        size={size}
        color={inWatchlist ? '#F59E0B' : '#6B7280'}
      />
    </TouchableOpacity>
  );
};

/**
 * 관심종목 전체 버튼
 */
export const WatchlistButton = ({
  symbol,
  name,
  type = 'stock',
  style,
  showLabel = true,
}) => {
  const { isInWatchlist, toggleWatchlist, loading, limitInfo } = useWatchlist();
  const [localLoading, setLocalLoading] = useState(false);

  const inWatchlist = isInWatchlist(symbol);

  const handlePress = useCallback(async () => {
    // 추가 시 한도 체크
    if (!inWatchlist && !limitInfo.allowed) {
      Alert.alert(
        '관심종목 한도 초과',
        `관심종목 한도(${limitInfo.limit}개)에 도달했습니다.\n플랜을 업그레이드하면 더 많은 종목을 추가할 수 있습니다.`,
        [{ text: '확인' }]
      );
      return;
    }

    setLocalLoading(true);
    try {
      const result = await toggleWatchlist({ symbol, name, type });

      if (result.success) {
        // 성공 피드백 (선택적)
      } else if (result.error !== 'ALREADY_EXISTS') {
        Alert.alert('오류', result.message || result.error);
      }
    } finally {
      setLocalLoading(false);
    }
  }, [symbol, name, type, inWatchlist, limitInfo, toggleWatchlist]);

  const isLoading = localLoading || loading;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        inWatchlist ? styles.buttonActive : styles.buttonInactive,
        style,
      ]}
      onPress={handlePress}
      disabled={isLoading}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={inWatchlist ? '#F59E0B' : '#6B7280'} />
      ) : (
        <>
          <Ionicons
            name={inWatchlist ? 'star' : 'star-outline'}
            size={20}
            color={inWatchlist ? '#F59E0B' : '#6B7280'}
          />
          {showLabel && (
            <Text style={[styles.buttonText, inWatchlist && styles.buttonTextActive]}>
              {inWatchlist ? '관심종목' : '관심종목 추가'}
            </Text>
          )}
        </>
      )}
    </TouchableOpacity>
  );
};

/**
 * 관심종목 추가 카드 (종목 검색 결과용)
 */
export const WatchlistAddCard = ({ symbol, name, type = 'stock', onAdded }) => {
  const { isInWatchlist, addStock, limitInfo } = useWatchlist();
  const [loading, setLoading] = useState(false);

  const inWatchlist = isInWatchlist(symbol);

  const handleAdd = useCallback(async () => {
    if (inWatchlist) return;

    if (!limitInfo.allowed) {
      Alert.alert(
        '관심종목 한도 초과',
        `관심종목 한도(${limitInfo.limit}개)에 도달했습니다.`,
      );
      return;
    }

    setLoading(true);
    try {
      const result = await addStock({ symbol, name, type });

      if (result.success) {
        onAdded?.();
      } else {
        Alert.alert('오류', result.message || result.error);
      }
    } finally {
      setLoading(false);
    }
  }, [symbol, name, type, inWatchlist, limitInfo, addStock, onAdded]);

  if (inWatchlist) {
    return (
      <View style={styles.addedBadge}>
        <Ionicons name="checkmark" size={16} color="#10B981" />
        <Text style={styles.addedText}>추가됨</Text>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={styles.addButton}
      onPress={handleAdd}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#3B82F6" />
      ) : (
        <>
          <Ionicons name="add" size={18} color="#3B82F6" />
          <Text style={styles.addButtonText}>추가</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  iconButton: {
    padding: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  buttonActive: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  buttonInactive: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  buttonTextActive: {
    color: '#D97706',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#3B82F6',
  },
  addedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
  },
  addedText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#10B981',
  },
});

export default WatchlistButton;

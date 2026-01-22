/**
 * 관심종목 화면
 * 관심종목 목록 및 그룹 관리
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWatchlist } from './WatchlistContext';
import { useTheme } from './ThemeContext';

// 그룹 색상 옵션
const GROUP_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#06B6D4', '#6B7280',
];

export default function WatchlistScreen({ navigation }) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const {
    watchlist,
    groups,
    ungroupedCount,
    limitInfo,
    loading,
    selectedGroupId,
    refreshWatchlist,
    removeStock,
    updateStock,
    selectGroup,
    createGroup,
    deleteGroup,
  } = useWatchlist();

  const [showGroupModal, setShowGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColor, setNewGroupColor] = useState(GROUP_COLORS[0]);
  const [editingStock, setEditingStock] = useState(null);
  const [showMemoModal, setShowMemoModal] = useState(false);
  const [memo, setMemo] = useState('');

  // 새로고침
  const handleRefresh = useCallback(() => {
    refreshWatchlist(selectedGroupId);
  }, [refreshWatchlist, selectedGroupId]);

  // 종목 클릭
  const handleStockPress = useCallback((item) => {
    navigation.navigate('StockDetail', {
      symbol: item.symbol,
      name: item.name,
      type: item.type,
    });
  }, [navigation]);

  // 종목 삭제
  const handleRemoveStock = useCallback(async (symbol, name) => {
    Alert.alert(
      '관심종목 삭제',
      `${name || symbol}을(를) 관심종목에서 삭제하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            const result = await removeStock(symbol);
            if (!result.success) {
              Alert.alert('오류', result.error || '삭제에 실패했습니다.');
            }
          },
        },
      ]
    );
  }, [removeStock]);

  // 메모 수정
  const handleEditMemo = useCallback((item) => {
    setEditingStock(item);
    setMemo(item.memo || '');
    setShowMemoModal(true);
  }, []);

  // 메모 저장
  const handleSaveMemo = useCallback(async () => {
    if (!editingStock) return;

    const result = await updateStock(editingStock.symbol, { memo });
    if (result.success) {
      setShowMemoModal(false);
      setEditingStock(null);
      setMemo('');
    } else {
      Alert.alert('오류', result.error || '저장에 실패했습니다.');
    }
  }, [editingStock, memo, updateStock]);

  // 그룹 생성
  const handleCreateGroup = useCallback(async () => {
    if (!newGroupName.trim()) {
      Alert.alert('오류', '그룹 이름을 입력해주세요.');
      return;
    }

    const result = await createGroup(newGroupName.trim(), newGroupColor);
    if (result.success) {
      setShowGroupModal(false);
      setNewGroupName('');
      setNewGroupColor(GROUP_COLORS[0]);
    } else {
      Alert.alert('오류', result.error || '그룹 생성에 실패했습니다.');
    }
  }, [newGroupName, newGroupColor, createGroup]);

  // 그룹 삭제
  const handleDeleteGroup = useCallback((groupId, groupName) => {
    Alert.alert(
      '그룹 삭제',
      `'${groupName}' 그룹을 삭제하시겠습니까?\n그룹 내 종목들은 '전체'로 이동됩니다.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => deleteGroup(groupId),
        },
      ]
    );
  }, [deleteGroup]);

  // 종목 카드 렌더링
  const renderStockItem = useCallback(({ item }) => {
    const changeColor = (item.last_change_percent || 0) >= 0 ? colors.success : colors.error;

    return (
      <TouchableOpacity
        style={[styles.stockCard, { backgroundColor: colors.card }]}
        onPress={() => handleStockPress(item)}
        onLongPress={() => handleRemoveStock(item.symbol, item.name)}
      >
        <View style={styles.stockMain}>
          <View style={styles.stockInfo}>
            <Text style={[styles.stockSymbol, { color: colors.text }]}>{item.symbol}</Text>
            <Text style={[styles.stockName, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.name || item.symbol}
            </Text>
            {item.group_name && (
              <View style={[styles.groupBadge, { backgroundColor: item.group_color + '20' }]}>
                <Text style={[styles.groupBadgeText, { color: item.group_color }]}>
                  {item.group_name}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.stockPrice}>
            {item.last_price ? (
              <>
                <Text style={[styles.priceText, { color: colors.text }]}>
                  ${item.last_price?.toLocaleString()}
                </Text>
                <Text style={[styles.changeText, { color: changeColor }]}>
                  {(item.last_change_percent || 0) >= 0 ? '+' : ''}
                  {(item.last_change_percent || 0).toFixed(2)}%
                </Text>
              </>
            ) : (
              <Text style={[styles.noPriceText, { color: colors.textTertiary }]}>가격 정보 없음</Text>
            )}
          </View>
        </View>

        {item.memo && (
          <View style={[styles.memoContainer, { borderTopColor: colors.border }]}>
            <Ionicons name="document-text-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.memoText, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.memo}
            </Text>
          </View>
        )}

        <View style={styles.stockActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleEditMemo(item)}
          >
            <Ionicons name="create-outline" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleRemoveStock(item.symbol, item.name)}
          >
            <Ionicons name="trash-outline" size={18} color={colors.error} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }, [handleStockPress, handleRemoveStock, handleEditMemo, colors]);

  // 빈 목록
  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="star-outline" size={64} color={colors.textTertiary} />
      <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>관심종목이 없습니다</Text>
      <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>
        종목 검색에서 관심있는 종목을 추가해보세요
      </Text>
      <TouchableOpacity
        style={[styles.searchButton, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate('Search')}
      >
        <Ionicons name="search" size={20} color="#fff" />
        <Text style={styles.searchButtonText}>종목 검색하기</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>관심종목</Text>
        <View style={[styles.limitBadge, { backgroundColor: colors.surfaceSecondary }]}>
          <Text style={[styles.limitText, { color: colors.textSecondary }]}>
            {limitInfo.current} / {limitInfo.limit === '무제한' ? '∞' : limitInfo.limit}
          </Text>
        </View>
      </View>

      {/* 그룹 탭 */}
      <View style={[styles.groupTabs, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[{ id: null, name: '전체', stock_count: watchlist.length }, ...groups]}
          keyExtractor={(item) => item.id?.toString() || 'all'}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.groupTab,
                { backgroundColor: colors.surfaceSecondary },
                selectedGroupId === item.id && { backgroundColor: colors.primary },
              ]}
              onPress={() => selectGroup(item.id)}
              onLongPress={() => item.id && handleDeleteGroup(item.id, item.name)}
            >
              {item.color && (
                <View style={[styles.groupColorDot, { backgroundColor: item.color }]} />
              )}
              <Text
                style={[
                  styles.groupTabText,
                  { color: colors.textSecondary },
                  selectedGroupId === item.id && styles.groupTabTextActive,
                ]}
              >
                {item.name}
              </Text>
              <Text style={[styles.groupCount, { color: colors.textTertiary }]}>{item.stock_count || 0}</Text>
            </TouchableOpacity>
          )}
          ListFooterComponent={
            <TouchableOpacity
              style={[styles.addGroupButton, { backgroundColor: colors.primaryBg }]}
              onPress={() => setShowGroupModal(true)}
            >
              <Ionicons name="add" size={20} color={colors.primary} />
            </TouchableOpacity>
          }
          contentContainerStyle={styles.groupTabsContent}
        />
      </View>

      {/* 종목 리스트 */}
      <FlatList
        data={watchlist}
        keyExtractor={(item) => item.symbol}
        renderItem={renderStockItem}
        contentContainerStyle={watchlist.length === 0 ? styles.emptyList : styles.listContent}
        ListEmptyComponent={renderEmptyList}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      />

      {/* 그룹 생성 모달 */}
      <Modal
        visible={showGroupModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowGroupModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>새 그룹 만들기</Text>

            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
              placeholder="그룹 이름"
              placeholderTextColor={colors.placeholder}
              value={newGroupName}
              onChangeText={setNewGroupName}
              maxLength={20}
            />

            <Text style={[styles.colorLabel, { color: colors.textSecondary }]}>그룹 색상</Text>
            <View style={styles.colorOptions}>
              {GROUP_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    newGroupColor === color && styles.colorOptionSelected,
                  ]}
                  onPress={() => setNewGroupColor(color)}
                >
                  {newGroupColor === color && (
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: colors.surfaceSecondary }]}
                onPress={() => setShowGroupModal(false)}
              >
                <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, { backgroundColor: colors.primary }]}
                onPress={handleCreateGroup}
              >
                <Text style={styles.confirmButtonText}>만들기</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 메모 수정 모달 */}
      <Modal
        visible={showMemoModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMemoModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>메모 수정</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              {editingStock?.name || editingStock?.symbol}
            </Text>

            <TextInput
              style={[styles.input, styles.memoInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
              placeholder="메모를 입력하세요"
              placeholderTextColor={colors.placeholder}
              value={memo}
              onChangeText={setMemo}
              multiline
              maxLength={200}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: colors.surfaceSecondary }]}
                onPress={() => setShowMemoModal(false)}
              >
                <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, { backgroundColor: colors.primary }]}
                onPress={handleSaveMemo}
              >
                <Text style={styles.confirmButtonText}>저장</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
    padding: 16,
    paddingTop: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  limitBadge: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  limitText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  groupTabs: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  groupTabsContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  groupTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
    gap: 6,
  },
  groupTabActive: {
    backgroundColor: '#3B82F6',
  },
  groupColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  groupTabText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  groupTabTextActive: {
    color: '#fff',
  },
  groupCount: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  addGroupButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  stockCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  stockMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  stockInfo: {
    flex: 1,
  },
  stockSymbol: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  stockName: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  groupBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 6,
  },
  groupBadgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  stockPrice: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  changeText: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  noPriceText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  memoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  memoText: {
    flex: 1,
    fontSize: 13,
    color: '#6B7280',
  },
  stockActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 10,
  },
  actionButton: {
    padding: 8,
  },
  emptyList: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 24,
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 340,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1F2937',
    marginBottom: 16,
  },
  memoInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  colorLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 10,
  },
  colorOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#3B82F6',
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});

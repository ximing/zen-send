import { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { useService, observer } from '@rabjs/react';
import { ThemeService } from '../../services/theme.service';
import { HomeService } from '../../services/home.service';
import TransferItem from '../transfer-item';
import type { TransferSession } from '@zen-send/shared';

interface TransferListProps {
  onItemPress: (transfer: TransferSession) => void;
  onDownload: (transfer: TransferSession) => void;
}

function TransferListInner({ onItemPress, onDownload }: TransferListProps) {
  const themeService = useService(ThemeService);
  const homeService = useService(HomeService);
  const colors = themeService.colors;
  const listRef = useRef<FlashListRef<TransferSession>>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [newTransferCount, setNewTransferCount] = useState(0);
  const prevLengthRef = useRef(homeService.transfers.length);

  // Track new transfers arriving while not at bottom
  useEffect(() => {
    const currentLength = homeService.transfers.length;
    if (currentLength > prevLengthRef.current && !atBottom) {
      setNewTransferCount((c) => c + (currentLength - prevLengthRef.current));
    }
    prevLengthRef.current = currentLength;
  });

  const renderItem = ({ item }: { item: TransferSession }) => (
    <TransferItem
      transfer={item}
      onPress={() => onItemPress(item)}
      onDownload={() => onDownload(item)}
    />
  );

  // In inverted mode, ListFooterComponent renders at visual top (for older data loading)
  const renderFooter = () => {
    if (!homeService.loadingMore) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator color={colors.textSecondary} />
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.empty}>
      <Ionicons
        name="mail-open-outline"
        size={48}
        color={colors.textSecondary}
        style={styles.emptyIcon}
      />
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No transfers yet</Text>
    </View>
  );

  const scrollToBottom = useCallback(() => {
    // In inverted mode, offset 0 = bottom
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
    setNewTransferCount(0);
  }, []);

  if (homeService.loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlashList
        ref={listRef}
        data={homeService.filteredTransfers}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        inverted
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        onStartReached={() => homeService.loadOlder()}
        onStartReachedThreshold={0.1}
        maintainVisibleContentPosition={{
          autoscrollToBottomThreshold: 0.2,
          startRenderingFromBottom: true,
        }}
        onScroll={(e) => {
          // In inverted mode, contentOffset.y close to 0 means at bottom
          const offsetY = e.nativeEvent.contentOffset.y;
          setAtBottom(offsetY < 50);
          if (offsetY < 50) setNewTransferCount(0);
        }}
      />

      {/* New transfer banner */}
      {newTransferCount > 0 && (
        <TouchableOpacity
          style={[styles.banner, { backgroundColor: colors.accent }]}
          onPress={scrollToBottom}
          activeOpacity={0.9}
        >
          <Text style={styles.bannerText}>{newTransferCount} 条新传输</Text>
          <Ionicons name="chevron-down" size={16} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Scroll to bottom button */}
      {!atBottom && newTransferCount === 0 && (
        <TouchableOpacity
          style={[styles.scrollToBottom, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}
          onPress={scrollToBottom}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    paddingVertical: 8,
    flexGrow: 1,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyIcon: {
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
  },
  banner: {
    position: 'absolute',
    bottom: 16,
    left: '50%',
    transform: [{ translateX: -70 }],
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  bannerText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  scrollToBottom: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
});

export default observer(TransferListInner);

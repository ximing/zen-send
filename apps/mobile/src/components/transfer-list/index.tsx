import { FlatList, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { useService, observer } from '@rabjs/react';
import { ThemeService } from '../../services/theme.service';
import { HomeService } from '../../services/home.service';
import TransferItem from '../transfer-item';
import type { TransferSession } from '@zen-send/shared';

interface TransferListProps {
  onItemPress: (transfer: TransferSession) => void;
}

function TransferListInner({ onItemPress }: TransferListProps) {
  const themeService = useService(ThemeService);
  const homeService = useService(HomeService);
  const colors = themeService.colors;

  const renderItem = ({ item }: { item: TransferSession }) => (
    <TransferItem transfer={item} onPress={() => onItemPress(item)} />
  );

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
      <Text style={styles.emptyIcon}>📭</Text>
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No transfers yet</Text>
    </View>
  );

  if (homeService.loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <FlatList
      data={homeService.filteredTransfers}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      ListFooterComponent={renderFooter}
      ListEmptyComponent={renderEmpty}
      onEndReached={() => homeService.loadMore()}
      onEndReachedThreshold={0.5}
    />
  );
}

const styles = StyleSheet.create({
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
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
  },
});

export default observer(TransferListInner);

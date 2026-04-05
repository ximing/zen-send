import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, ScrollView } from 'react-native';
import { useState } from 'react';
import { useService, observer } from '@rabjs/react';
import { ThemeService } from '../../services/theme.service';
import { HomeService } from '../../services/home.service';
import TransferItem from '../transfer-item';
import type { TransferSession } from '@zen-send/shared';

const TIME_FILTERS = [
  { label: '全部', value: 'all' },
  { label: '今天', value: 'today' },
  { label: '本周', value: 'week' },
  { label: '本月', value: 'month' },
];

function isInTimeFilter(transfer: TransferSession, filter: string): boolean {
  const now = Date.now();
  const createdAt = transfer.createdAt * 1000;
  const diff = now - createdAt;
  const day = 24 * 60 * 60 * 1000;

  switch (filter) {
    case 'today': return diff < day;
    case 'week': return diff < 7 * day;
    case 'month': return diff < 30 * day;
    default: return true;
  }
}

interface SearchModalProps {
  visible: boolean;
  onClose: () => void;
}

function SearchModalInner({ visible, onClose }: SearchModalProps) {
  const themeService = useService(ThemeService);
  const homeService = useService(HomeService);
  const colors = themeService.colors;
  const [query, setQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState('all');

  const handleSearch = (text: string) => {
    setQuery(text);
    homeService.setSearchQuery(text);
  };

  const handleClose = () => {
    setQuery('');
    setTimeFilter('all');
    homeService.setSearchQuery('');
    onClose();
  };

  const filteredByTime = homeService.filteredTransfers.filter((t) => isInTimeFilter(t, timeFilter));

  return (
    <Modal visible={visible} onRequestClose={handleClose} animationType="slide">
      <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
        <View style={styles.header}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.bgSurface, color: colors.textPrimary }]}
            value={query}
            onChangeText={handleSearch}
            placeholder="搜索文件名..."
            placeholderTextColor={colors.textMuted}
            autoFocus
          />
          <TouchableOpacity onPress={handleClose}>
            <Text style={[styles.cancel, { color: colors.accent }]}>取消</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {TIME_FILTERS.map((filter) => (
              <TouchableOpacity
                key={filter.value}
                style={[
                  styles.filterTab,
                  {
                    backgroundColor: timeFilter === filter.value ? colors.accent : colors.bgSurface,
                  },
                ]}
                onPress={() => setTimeFilter(filter.value)}
              >
                <Text
                  style={[
                    styles.filterText,
                    { color: timeFilter === filter.value ? '#FFFFFF' : colors.textPrimary },
                  ]}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <FlatList
          data={filteredByTime}
          renderItem={({ item }) => (
            <TransferItem
              transfer={item}
              onPress={() => {
                handleClose();
              }}
            />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  input: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  cancel: {
    fontSize: 14,
    fontWeight: '500',
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '500',
  },
  list: {
    paddingVertical: 8,
  },
});

export default observer(SearchModalInner);

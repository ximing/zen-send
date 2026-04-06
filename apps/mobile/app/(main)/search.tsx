import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useService, observer } from '@rabjs/react';
import { ThemeService } from '../../src/services/theme.service';
import { HomeService } from '../../src/services/home.service';
import TransferItem from '../../src/components/transfer-item';
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

function SearchScreenInner() {
  const router = useRouter();
  const themeService = useService(ThemeService);
  const homeService = useService(HomeService);
  const colors = themeService.colors;
  const [query, setQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState('all');

  const handleSearch = (text: string) => {
    setQuery(text);
    homeService.setSearchQuery(text);
  };

  const handleBack = () => {
    homeService.setSearchQuery('');
    router.back();
  };

  const filteredByTime = homeService.filteredTransfers.filter((t) => isInTimeFilter(t, timeFilter));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <TextInput
          style={[styles.input, { backgroundColor: colors.bgSurface, color: colors.textPrimary }]}
          value={query}
          onChangeText={handleSearch}
          placeholder="搜索文件名..."
          placeholderTextColor={colors.textMuted}
          autoFocus
        />
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
              handleBack();
            }}
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
}

const SearchScreen = observer(SearchScreenInner);

export default SearchScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 0,
    gap: 8,
  },
  backButton: {
    padding: 4,
  },
  input: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  filterContainer: {
    marginTop: 16,
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

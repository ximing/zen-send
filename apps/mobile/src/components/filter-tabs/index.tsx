import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useService, observer } from '@rabjs/react';
import { ThemeService } from '../../services/theme.service';
import { HomeService, TransferFilter } from '../../services/home.service';

const FILTERS: { label: string; value: TransferFilter }[] = [
  { label: 'ALL', value: 'all' },
  { label: 'FILES', value: 'file' },
  { label: 'TEXT', value: 'text' },
];

function FilterTabsInner() {
  const themeService = useService(ThemeService);
  const homeService = useService(HomeService);
  const colors = themeService.colors;

  return (
    <View style={styles.container}>
      {FILTERS.map((f) => {
        const isActive = homeService.filter === f.value;
        return (
          <TouchableOpacity
            key={f.value}
            style={[
              styles.tab,
              { backgroundColor: isActive ? colors.accentSoft : colors.bgElevated },
            ]}
            onPress={() => homeService.setFilter(f.value)}
          >
            <Text
              style={[
                styles.tabText,
                { color: isActive ? colors.accent : colors.textSecondary },
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default observer(FilterTabsInner);

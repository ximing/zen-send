import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useService, observer } from '@rabjs/react';
import { ThemeService } from '../../services/theme.service';

interface HeaderProps {
  onMenuPress: () => void;
  onSearchPress: () => void;
}

function HeaderInner({ onMenuPress, onSearchPress }: HeaderProps) {
  const themeService = useService(ThemeService);
  const colors = themeService.colors;

  return (
    <View style={[styles.container, { backgroundColor: colors.bgSurface, borderBottomColor: colors.borderSubtle }]}>
      <TouchableOpacity style={styles.menuButton} onPress={onMenuPress}>
        <Text style={[styles.menuIcon, { color: colors.textPrimary }]}>☰</Text>
      </TouchableOpacity>
      <Text style={[styles.logo, { color: colors.textPrimary }]}>ZEN_SEND</Text>
      <TouchableOpacity style={styles.searchButton} onPress={onSearchPress}>
        <Text style={{ fontSize: 18 }}>🔍</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  menuButton: {
    padding: 8,
    minWidth: 44,
  },
  menuIcon: {
    fontSize: 20,
    fontWeight: '500',
  },
  logo: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 1,
  },
  searchButton: {
    padding: 8,
    minWidth: 44,
    alignItems: 'flex-end',
  },
});

export default observer(HeaderInner);

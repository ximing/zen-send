import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useService, observer } from '@rabjs/react';
import { ThemeService } from '../../services/theme.service';
import { SocketService } from '../../services/socket.service';

interface HeaderProps {
  onMenuPress: () => void;
  onSearchPress: () => void;
}

function HeaderInner({ onMenuPress, onSearchPress }: HeaderProps) {
  const themeService = useService(ThemeService);
  const socketService = useService(SocketService);
  const colors = themeService.colors;

  return (
    <View style={[styles.container, { backgroundColor: colors.bgSurface, borderBottomColor: colors.borderSubtle }]}>
      <TouchableOpacity style={styles.menuButton} onPress={onMenuPress}>
        <Ionicons name="menu" size={24} color={colors.textPrimary} />
      </TouchableOpacity>
      <View style={styles.center}>
        <Text style={[styles.logo, { color: colors.textPrimary }]}>ZEN_SEND</Text>
        <View style={[styles.statusDot, { backgroundColor: socketService.connected ? '#22C55E' : '#EF4444' }]} />
      </View>
      <TouchableOpacity style={styles.searchButton} onPress={onSearchPress}>
        <Ionicons name="search" size={22} color={colors.textPrimary} />
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
  center: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logo: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  searchButton: {
    padding: 8,
    minWidth: 44,
    alignItems: 'flex-end',
  },
});

export default observer(HeaderInner);

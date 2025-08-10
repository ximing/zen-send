import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useService, observer } from '@rabjs/react';
import { ThemeService } from '../../services/theme.service';
import { AuthService } from '../../services/auth.service';

function HeaderInner() {
  const router = useRouter();
  const themeService = useService(ThemeService);
  const authService = useService(AuthService);
  const colors = themeService.colors;

  const handleThemeToggle = () => {
    themeService.toggleTheme();
  };

  const handleLogout = async () => {
    await authService.logout();
    router.replace('/(auth)/login');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bgSurface, borderBottomColor: colors.borderSubtle }]}>
      <Text style={[styles.logo, { color: colors.textPrimary }]}>ZEN_SEND</Text>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.iconButton} onPress={handleThemeToggle}>
          <Text style={{ fontSize: 18 }}>{themeService.isDark ? '☀️' : '🌙'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={handleLogout}>
          <Text style={{ fontSize: 18 }}>🚪</Text>
        </TouchableOpacity>
      </View>
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
  logo: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    padding: 8,
  },
});

export default observer(HeaderInner);

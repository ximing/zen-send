import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useService, observer } from '@rabjs/react';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';

interface DrawerContentProps {
  onClose?: () => void;
}

function DrawerContentInner({ onClose }: DrawerContentProps) {
  const router = useRouter();
  const authService = useService(AuthService);
  const themeService = useService(ThemeService);
  const colors = themeService.colors;

  const handleThemeToggle = () => {
    themeService.toggleTheme();
    onClose?.();
  };

  const handleLogout = async () => {
    await authService.logout();
    onClose?.();
    router.replace('/(auth)/login');
  };

  const user = authService.user;
  const serverUrl = authService.serverUrl;

  return (
    <View style={[styles.container, { backgroundColor: colors.bgSurface }]}>
      {/* User Info Section */}
      <View style={[styles.userSection, { borderBottomColor: colors.borderSubtle }]}>
        <View style={[styles.avatar, { backgroundColor: colors.accentSoft }]}>
          <Text style={[styles.avatarText, { color: colors.accent }]}>
            {user?.email?.charAt(0).toUpperCase() ?? '?'}
          </Text>
        </View>
        <Text style={[styles.username, { color: colors.textPrimary }]}>
          {user?.email?.split('@')[0] ?? 'User'}
        </Text>
        <Text style={[styles.email, { color: colors.textSecondary }]}>
          {user?.email ?? ''}
        </Text>
        <Text style={[styles.serverUrl, { color: colors.textMuted }]}>
          {serverUrl}
        </Text>
      </View>

      {/* Actions Section */}
      <View style={styles.actionsSection}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleThemeToggle}
        >
          <Text style={styles.actionIcon}>{themeService.isDark ? '☀️' : '🌙'}</Text>
          <Text style={[styles.actionText, { color: colors.textPrimary }]}>
            {themeService.isDark ? 'Light Mode' : 'Dark Mode'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleLogout}
        >
          <Text style={styles.actionIcon}>🚪</Text>
          <Text style={[styles.actionText, { color: colors.textPrimary }]}>
            Logout
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const DrawerContent = observer(DrawerContentInner);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  userSection: {
    alignItems: 'center',
    paddingBottom: 24,
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '600',
  },
  username: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    marginBottom: 2,
  },
  serverUrl: {
    fontSize: 12,
  },
  actionsSection: {
    paddingTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  actionIcon: {
    fontSize: 18,
    width: 28,
    textAlign: 'center',
  },
  actionText: {
    fontSize: 16,
  },
});

export default DrawerContent;

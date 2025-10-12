import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useService, observer } from '@rabjs/react';
import { Ionicons } from '@expo/vector-icons';
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

  const handleDownloads = () => {
    onClose?.();
    router.push('/(main)/downloads');
  };

  const user = authService.user;

  return (
    <View style={[styles.container, { backgroundColor: colors.bgSurface }]}>
      {/* User Info Section */}
      <TouchableOpacity
        style={[styles.userSection, { borderBottomColor: colors.borderSubtle }]}
        onPress={() => {
          onClose?.();
          router.push('/(main)/settings');
        }}
      >
        {user?.avatarUrl ? (
          <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
        ) : (
          <View style={[styles.avatar, { backgroundColor: colors.accentSoft }]}>
            <Text style={[styles.avatarText, { color: colors.accent }]}>
              {user?.email?.charAt(0).toUpperCase() ?? '?'}
            </Text>
          </View>
        )}
        <Text style={[styles.username, { color: colors.textPrimary }]} numberOfLines={1}>
          {user?.nickname || user?.email?.split('@')[0] || 'User'}
        </Text>
      </TouchableOpacity>

      {/* Actions Section */}
      <View style={styles.actionsSection}>
        <TouchableOpacity style={styles.actionButton} onPress={handleDownloads}>
          <Ionicons name="cloud-download-outline" size={20} color={colors.textPrimary} />
          <Text style={[styles.actionText, { color: colors.textPrimary }]}>下载</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <TouchableOpacity style={styles.actionButton} onPress={handleThemeToggle}>
          <Ionicons
            name={themeService.isDark ? 'sunny' : 'moon-outline'}
            size={20}
            color={colors.textPrimary}
          />
          <Text style={[styles.actionText, { color: colors.textPrimary }]}>
            {themeService.isDark ? 'Light Mode' : 'Dark Mode'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            onClose?.();
            router.push('/(main)/settings');
          }}
        >
          <Ionicons name="settings-outline" size={20} color={colors.textPrimary} />
          <Text style={[styles.actionText, { color: colors.textPrimary }]}>设置</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={colors.textPrimary} />
          <Text style={[styles.actionText, { color: colors.textPrimary }]}>Logout</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
  },
  username: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  actionsSection: {
    paddingTop: 8,
  },
  bottomActions: {
    marginTop: 'auto',
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  actionText: {
    fontSize: 16,
  },
});

export default DrawerContent;

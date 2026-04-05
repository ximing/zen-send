import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { observer } from '@rabjs/react';
import { useService } from '@rabjs/react';
import { ThemeService } from '../../services/theme.service';
import type { TransferSession } from '@zen-send/shared';

interface TransferItemProps {
  transfer: TransferSession;
  onPress: () => void;
}

function TransferItemInner({ transfer, onPress }: TransferItemProps) {
  const themeService = useService(ThemeService);
  const colors = themeService.colors;

  const firstItem = transfer.items?.[0];
  const isText = firstItem?.type === 'text';
  const icon = isText ? '✏️' : '📎';
  const name = isText ? firstItem?.content?.slice(0, 30) || 'Text' : firstItem?.name || 'File';
  const size = isText ? 'Text' : firstItem?.size ? formatSize(firstItem.size) : 'File';

  const timeAgo = getRelativeTime(transfer.createdAt);

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.bgSurface }]}
      onPress={onPress}
    >
      <View style={[styles.iconContainer, { backgroundColor: colors.bgElevated }]}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <View style={styles.content}>
        <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
          {name}
        </Text>
        <Text style={[styles.meta, { color: colors.textSecondary }]}>
          {size} · {timeAgo}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'JUST NOW';
  if (minutes < 60) return `${minutes}M AGO`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}H AGO`;
  const days = Math.floor(hours / 24);
  return `${days}D AGO`;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 20,
  },
  content: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontSize: 14,
    fontWeight: '500',
  },
  meta: {
    fontSize: 12,
    marginTop: 2,
  },
});

export default observer(TransferItemInner);

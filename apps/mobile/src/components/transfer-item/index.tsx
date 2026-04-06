import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { observer } from '@rabjs/react';
import { useService } from '@rabjs/react';
import { ThemeService } from '../../services/theme.service';
import { showToast } from '../toast';
import type { TransferSession } from '@zen-send/shared';

interface TransferItemProps {
  transfer: TransferSession;
  onPress: () => void;
  onDownload?: () => void;
  onPreview?: () => void;
}

function TransferItemInner({ transfer, onPress, onDownload, onPreview }: TransferItemProps) {
  const themeService = useService(ThemeService);
  const colors = themeService.colors;

  const firstItem = transfer.items?.[0];
  const isText = firstItem?.type === 'text';
  const name = isText ? firstItem?.content?.slice(0, 30) || 'Text' : firstItem?.name || 'File';
  const size = isText ? 'Text' : firstItem?.size ? formatSize(firstItem.size) : 'File';

  const timeAgo = getRelativeTime(transfer.createdAt);

  const handleCopy = async () => {
    if (firstItem?.content) {
      await Clipboard.setStringAsync(firstItem.content);
      showToast('Copied to clipboard');
    }
  };

  const handleDownload = () => {
    onDownload?.();
  };

  const handlePreview = () => {
    onPreview?.();
  };

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.bgSurface }]}
      onPress={onPress}
    >
      <View style={[styles.iconContainer, { backgroundColor: colors.bgElevated }]}>
        <Ionicons
          name={isText ? 'create-outline' : 'document-outline'}
          size={20}
          color={colors.textSecondary}
        />
      </View>
      <View style={styles.content}>
        <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
          {name}
        </Text>
        <Text style={[styles.meta, { color: colors.textSecondary }]}>
          {size} · {timeAgo}
        </Text>
      </View>
      <View style={styles.actions}>
        {isText ? (
          <TouchableOpacity style={styles.actionBtn} onPress={handleCopy}>
            <Ionicons name="copy-outline" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity style={styles.actionBtn} onPress={handlePreview}>
              <Ionicons name="eye-outline" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={handleDownload}>
              <Ionicons name="download-outline" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </>
        )}
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
  // Database stores timestamps in seconds, convert to milliseconds
  const now = Date.now();
  const diff = now - timestamp * 1000;
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
  actions: {
    flexDirection: 'row',
    gap: 4,
  },
  actionBtn: {
    padding: 6,
  },
});

export default observer(TransferItemInner);

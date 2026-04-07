import { View, Text, TouchableOpacity, StyleSheet, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import * as Clipboard from 'expo-clipboard';
import { observer } from '@rabjs/react';
import { useService } from '@rabjs/react';
import { ThemeService } from '../../services/theme.service';
import { ApiService } from '../../services/api.service';
import { HomeService } from '../../services/home.service';
import { showToast } from '../toast';
import type { TransferSession } from '@zen-send/shared';
import { useState, useEffect, useRef } from 'react';

// Check if mime type is an image
const isImageMimeType = (mimeType: string | null): boolean => {
  if (!mimeType) return false;
  return mimeType.startsWith('image/');
};

interface TransferItemProps {
  transfer: TransferSession;
  onPress: () => void;
  onDownload?: () => void;
}

function TransferItemInner({ transfer, onPress, onDownload }: TransferItemProps) {
  const themeService = useService(ThemeService);
  const apiService = useService(ApiService);
  const homeService = useService(HomeService);
  const colors = themeService.colors;
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

  const firstItem = transfer.items?.[0];
  const isText = firstItem?.type === 'text';
  const isImage = !isText && isImageMimeType(firstItem?.mimeType ?? null);
  const name = isText ? firstItem?.content?.slice(0, 30) || 'Text' : firstItem?.name || 'File';
  const size = isText ? 'Text' : firstItem?.size ? formatSize(firstItem.size) : 'File';

  const timeAgo = getRelativeTime(transfer.createdAt);

  // Load thumbnail for images
  useEffect(() => {
    if (!isImage || !firstItem?.id) {
      setThumbnailUrl(null);
      return;
    }

    // For images stored in S3, get the download URL using ApiService
    if (firstItem.storageType === 's3') {
      apiService.getTransferDownloadUrl(transfer.id)
        .then((url) => {
          setThumbnailUrl(url);
        })
        .catch(() => setThumbnailUrl(null));
    } else if (firstItem.storageType === 'db' && firstItem.content) {
      // For small images stored in DB (base64 or text content)
      if (firstItem.content.startsWith('data:image')) {
        setThumbnailUrl(firstItem.content);
      } else if (firstItem.content.startsWith('http')) {
        setThumbnailUrl(firstItem.content);
      }
    }
  }, [isImage, firstItem, transfer.id, apiService]);

  const handleCopy = async () => {
    if (firstItem?.content) {
      await Clipboard.setStringAsync(firstItem.content);
      showToast('Copied to clipboard');
    }
  };

  const handleDownload = () => {
    onDownload?.();
  };

  const handleCopyLink = async () => {
    if (firstItem?.storageType === 's3') {
      try {
        const { url } = await apiService.getTransferExternalLink(transfer.id);
        await Clipboard.setStringAsync(url);
        showToast('Link copied');
      } catch (err) {
        showToast('Failed to copy link');
      }
    }
  };

  const swipeableRef = useRef<Swipeable>(null);

  const handleSwipeDelete = () => {
    // Just close the swipeable - delete is handled by onPress in renderRightActions
    swipeableRef.current?.close();
  };

  const handleDelete = async () => {
    swipeableRef.current?.close();
    try {
      await homeService.deleteTransfer(transfer.id);
      showToast('Deleted');
    } catch (err) {
      showToast('Failed to delete');
    }
  };

  const renderRightActions = () => (
    <TouchableOpacity
      style={[styles.deleteContainer, { backgroundColor: '#FF3B30' }]}
      onPress={handleDelete}
    >
      <Ionicons name="trash-outline" size={20} color="white" />
    </TouchableOpacity>
  );

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      rightThreshold={40}
      overshootRight={false}
    >
      <TouchableOpacity
        style={[styles.container, { backgroundColor: colors.bgSurface }]}
        onPress={onPress}
      >
      <View style={[styles.iconContainer, { backgroundColor: colors.bgElevated }]}>
        {isImage && thumbnailUrl ? (
          <Image
            source={{ uri: thumbnailUrl }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
        ) : (
          <Ionicons
            name={isText ? 'create-outline' : isImage ? 'image-outline' : 'document-outline'}
            size={20}
            color={colors.textSecondary}
          />
        )}
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
            {firstItem?.storageType === 's3' && (
              <TouchableOpacity style={styles.actionBtn} onPress={handleCopyLink}>
                <Ionicons name="link-outline" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.actionBtn} onPress={handleDownload}>
              <Ionicons name="download-outline" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </>
        )}
      </View>
    </TouchableOpacity>
    </Swipeable>
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
    overflow: 'hidden',
  },
  thumbnail: {
    width: 42,
    height: 42,
    borderRadius: 10,
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
  deleteContainer: {
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
});

export default observer(TransferItemInner);

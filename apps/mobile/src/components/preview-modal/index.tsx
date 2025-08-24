import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Clipboard from 'expo-clipboard';
import { useService, observer } from '@rabjs/react';
import { ThemeService } from '../../services/theme.service';
import { ApiService } from '../../services/api.service';
import { showToast } from '../toast';
import type { TransferSession } from '@zen-send/shared';
import { useState, useEffect } from 'react';
import QRCode from 'qrcode';

// Check if mime type is an image
const isImageMimeType = (mimeType: string | null): boolean => {
  if (!mimeType) return false;
  return mimeType.startsWith('image/');
};

interface PreviewModalProps {
  transfer: TransferSession | null;
  onClose: () => void;
  onDownload: (transfer: TransferSession) => void;
  onDelete?: (transfer: TransferSession) => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function PreviewModalInner({ transfer, onClose, onDownload, onDelete }: PreviewModalProps) {
  const themeService = useService(ThemeService);
  const apiService = useService(ApiService);
  const colors = themeService.colors;
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loadingImage, setLoadingImage] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  // Derive values from transfer (safe even if transfer is null)
  const firstItem = transfer?.items?.[0] ?? null;
  const isText = firstItem?.type === 'text';
  const isImage = !isText && isImageMimeType(firstItem?.mimeType ?? null);
  const transferId = transfer?.id;
  const storageType = firstItem?.storageType;
  const itemContent = firstItem?.content;

  // Load image URL for preview - must be called before any early returns
  useEffect(() => {
    if (!isImage || !firstItem?.id || !transferId) {
      setImageUrl(null);
      setLoadingImage(false);
      return;
    }

    setLoadingImage(true);

    // For images stored in S3, get the download URL using ApiService
    if (storageType === 's3') {
      apiService.getTransferDownloadUrl(transferId)
        .then((url) => {
          console.log('[PreviewModal] Got download URL for S3 image:', url ? 'success' : 'empty');
          setImageUrl(url);
          setLoadingImage(false);
        })
        .catch((err) => {
          console.error('[PreviewModal] Failed to get download URL:', err);
          setImageUrl(null);
          setLoadingImage(false);
        });
    } else if (storageType === 'db' && itemContent) {
      // For small images stored in DB
      if (itemContent.startsWith('data:image')) {
        setImageUrl(itemContent);
      } else if (itemContent.startsWith('http')) {
        setImageUrl(itemContent);
      } else {
        // Content is not a direct URL, try to use it as-is (might be base64)
        setImageUrl(itemContent);
      }
      setLoadingImage(false);
    } else {
      console.log('[PreviewModal] Unknown storage type or no content:', { storageType, hasContent: !!itemContent });
      setLoadingImage(false);
    }
  }, [isImage, firstItem, transferId, storageType, itemContent, apiService]);

  const handleShare = async () => {
    if (!transfer) return;

    try {
      const downloadUrl = await apiService.getTransferDownloadUrl(transfer.id);
      if (downloadUrl) {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(downloadUrl);
        } else {
          await IntentLauncher.shareAsync(downloadUrl);
        }
      }
    } catch (err) {
      console.error('[PreviewModal] Share failed:', err);
    }
  };

  const handleDelete = () => {
    if (onDelete && transfer) {
      onDelete(transfer);
      onClose();
    }
  };

  const handleCopyLink = async () => {
    if (!transfer) return;
    try {
      const { url } = await apiService.getTransferExternalLink(transfer.id);
      await Clipboard.setStringAsync(url);
      showToast('Link copied');
    } catch (err) {
      showToast('Failed to copy link');
    }
  };

  const handleShowQR = async () => {
    if (!transfer) return;
    try {
      console.log('[PreviewModal] handleShowQR called, transfer.id:', transfer.id);
      const url = await apiService.getTransferDownloadUrl(transfer.id);
      console.log('[PreviewModal] got url:', url ? url.substring(0, 50) : 'null');
      if (url) {
        const dataUrl = await QRCode.toDataURL(url, { width: 280, margin: 2 });
        console.log('[PreviewModal] generated QR dataUrl length:', dataUrl.length);
        setQrDataUrl(dataUrl);
        setShowQRModal(true);
      } else {
        showToast('No download URL available');
      }
    } catch (err) {
      console.error('[PreviewModal] QR error:', err);
      showToast('Failed to generate QR code');
    }
  };

  const handleCloseQR = () => {
    setShowQRModal(false);
    setQrDataUrl(null);
  };

  // Early returns AFTER all hooks
  if (!transfer) return null;
  if (!firstItem) return null;

  return (
    <Modal visible={!!transfer} onRequestClose={onClose} animationType="slide" transparent>
      <TouchableOpacity
        style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={[styles.container, { backgroundColor: colors.bgSurface }]}>
          <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
            <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
              {isText ? (firstItem.content?.slice(0, 50) || 'Text') : (firstItem.name || 'File')}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} contentContainerStyle={isImage ? styles.imageContentContainer : undefined}>
            {isText ? (
              <Text style={[styles.textContent, { color: colors.textPrimary }]}>
                {firstItem.content}
              </Text>
            ) : isImage ? (
              <View style={styles.imageContainer}>
                {loadingImage ? (
                  <ActivityIndicator size="large" color={colors.accent} />
                ) : imageUrl ? (
                  <Image
                    source={{ uri: imageUrl }}
                    style={styles.image}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={styles.fileInfo}>
                    <Ionicons name="image-outline" size={48} color={colors.textSecondary} style={styles.fileIcon} />
                    <Text style={[styles.fileName, { color: colors.textPrimary }]}>{firstItem.name}</Text>
                    <Text style={[styles.fileSize, { color: colors.textSecondary }]}>
                      {formatSize(firstItem.size)}
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.fileInfo}>
                <Ionicons name="document-outline" size={48} color={colors.textSecondary} style={styles.fileIcon} />
                <Text style={[styles.fileName, { color: colors.textPrimary }]}>{firstItem.name}</Text>
                <Text style={[styles.fileSize, { color: colors.textSecondary }]}>
                  {formatSize(firstItem.size)}
                </Text>
              </View>
            )}
          </ScrollView>

          <View style={[styles.actions, { borderTopColor: colors.borderSubtle }]}>
            {!isText && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.bgElevated }]}
                onPress={() => onDownload(transfer)}
              >
                <Ionicons name="download-outline" size={22} color={colors.accent} />
              </TouchableOpacity>
            )}

            {!isText && firstItem?.storageType === 's3' && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.bgElevated }]}
                onPress={handleShowQR}
              >
                <Ionicons name="qr-code-outline" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            )}

            {!isText && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.bgElevated }]}
                onPress={handleShare}
              >
                <Ionicons name="share-outline" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.bgElevated }]}
              onPress={handleCopyLink}
            >
              <Ionicons name="link-outline" size={22} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.bgElevated }]}
              onPress={handleDelete}
            >
              <Ionicons name="trash-outline" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>

      {/* QR Code Modal */}
      <Modal visible={showQRModal} transparent animationType="fade" onRequestClose={handleCloseQR}>
        <TouchableOpacity style={styles.qrOverlay} activeOpacity={1} onPress={handleCloseQR}>
          <View style={[styles.qrContainer, { backgroundColor: colors.bgSurface }]}>
            <Text style={[styles.qrTitle, { color: colors.textPrimary }]}>Download QR Code</Text>
            <View style={styles.qrCodeWrapper}>
              {qrDataUrl && (
                <Image source={{ uri: qrDataUrl }} style={{ width: 200, height: 200 }} />
              )}
            </View>
            <TouchableOpacity
              style={[styles.qrCloseBtn, { backgroundColor: colors.bgElevated }]}
              onPress={handleCloseQR}
            >
              <Text style={[styles.qrCloseText, { color: colors.textPrimary }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  closeIcon: {
    fontSize: 20,
    padding: 4,
  },
  content: {
    padding: 16,
    maxHeight: 400,
  },
  imageContentContainer: {
    flexGrow: 1,
  justifyContent: 'center',
  },
  imageContainer: {
    alignItems: 'center',
    minHeight: 200,
  },
  image: {
    width: '100%',
    height: 300,
    borderRadius: 8,
  },
  textContent: {
    fontSize: 14,
    lineHeight: 22,
  },
  fileInfo: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  fileIcon: {
    marginBottom: 12,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  fileSize: {
    fontSize: 12,
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderTopWidth: 1,
  },
  actionBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButton: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '500',
  },
  qrOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrContainer: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    minWidth: 280,
  },
  qrTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 20,
  },
  qrCodeWrapper: {
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  qrCloseBtn: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  qrCloseText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default observer(PreviewModalInner);

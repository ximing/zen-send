import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useService, observer } from '@rabjs/react';
import { ThemeService } from '../../services/theme.service';
import type { TransferSession } from '@zen-send/shared';

interface PreviewModalProps {
  transfer: TransferSession | null;
  onClose: () => void;
  onDownload: (transfer: TransferSession) => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function PreviewModalInner({ transfer, onClose, onDownload }: PreviewModalProps) {
  const themeService = useService(ThemeService);
  const colors = themeService.colors;

  if (!transfer) return null;

  const firstItem = transfer.items?.[0];
  if (!firstItem) return null;

  const isText = firstItem.type === 'text';
  const isImage = firstItem.mimeType?.startsWith('image/');

  return (
    <Modal visible={!!transfer} onRequestClose={onClose} animationType="slide" transparent>
      <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
        <View style={[styles.container, { backgroundColor: colors.bgSurface }]}>
          <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
            <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
              {isText ? (firstItem.content?.slice(0, 50) || 'Text') : (firstItem.name || 'File')}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {isText ? (
              <Text style={[styles.textContent, { color: colors.textPrimary }]}>
                {firstItem.content}
              </Text>
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
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.bgElevated }]}
              onPress={onClose}
            >
              <Text style={[styles.actionText, { color: colors.textPrimary }]}>CLOSE</Text>
            </TouchableOpacity>
            {!isText && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.accent }]}
                onPress={() => onDownload(transfer)}
              >
                <Text style={[styles.actionText, { color: colors.bgPrimary }]}>DOWNLOAD</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
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
  image: {
    width: '100%',
    height: 300,
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
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
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
});

export default observer(PreviewModalInner);

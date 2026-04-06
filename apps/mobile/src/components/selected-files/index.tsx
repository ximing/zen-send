import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useService, observer } from '@rabjs/react';
import { ThemeService } from '../../services/theme.service';
import { HomeService, UploadProgress } from '../../services/home.service';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${Math.round(seconds / 3600)}h`;
}

interface SelectedFilesItemProps {
  progress: UploadProgress;
  onCancel: () => void;
  onRemove: () => void;
}

function SelectedFilesItemInner({ progress, onCancel, onRemove }: SelectedFilesItemProps) {
  const themeService = useService(ThemeService);
  const colors = themeService.colors;

  const getStatusColor = () => {
    switch (progress.status) {
      case 'uploading': return colors.accent;
      case 'completed': return '#22C55E';
      case 'failed': return '#EF4444';
      case 'cancelled': return '#9A958F';
    }
  };

  return (
    <View style={[styles.item, { backgroundColor: colors.bgSurface }]}>
      <View style={styles.itemContent}>
        <Text style={[styles.fileName, { color: colors.textPrimary }]} numberOfLines={1}>
          {progress.fileName}
        </Text>
        {progress.status === 'uploading' && (
          <Text style={[styles.progressText, { color: colors.textSecondary }]}>
            {progress.progress.toFixed(0)}% · {formatSize(progress.speed)}/s · ETA {formatTime(progress.eta)}
          </Text>
        )}
        {progress.status === 'completed' && (
          <Text style={[styles.progressText, { color: '#22C55E' }]}>Completed</Text>
        )}
        {progress.status === 'failed' && (
          <Text style={[styles.progressText, { color: '#EF4444' }]}>Failed</Text>
        )}
        {progress.status === 'cancelled' && (
          <Text style={[styles.progressText, { color: '#9A958F' }]}>Cancelled</Text>
        )}
      </View>
      <View style={styles.itemActions}>
        {progress.status === 'uploading' && (
          <TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
            <Ionicons name="close" size={18} color="#9A958F" />
          </TouchableOpacity>
        )}
        {progress.status !== 'uploading' && (
          <TouchableOpacity onPress={onRemove} style={styles.cancelButton}>
            <Ionicons name="close" size={18} color="#9A958F" />
          </TouchableOpacity>
        )}
        {progress.status === 'uploading' && (
          <View style={[styles.progressBar, { backgroundColor: colors.bgElevated }]}>
            <View
              style={[
                styles.progressFill,
                { backgroundColor: getStatusColor(), width: `${progress.progress}%` },
              ]}
            />
          </View>
        )}
      </View>
    </View>
  );
}

const SelectedFilesItem = observer(SelectedFilesItemInner);

function SelectedFilesInner() {
  const themeService = useService(ThemeService);
  const homeService = useService(HomeService);
  const colors = themeService.colors;

  if (homeService.uploadProgress.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      {homeService.uploadProgress.map((progress) => (
        <SelectedFilesItem
          key={progress.sessionId}
          progress={progress}
          onCancel={() => homeService.cancelUpload(progress.sessionId)}
          onRemove={() => homeService.removeUpload(progress.sessionId)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  itemContent: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
  },
  progressText: {
    fontSize: 12,
    marginTop: 2,
  },
  itemActions: {
    marginLeft: 12,
  },
  cancelButton: {
    padding: 4,
  },
  progressBar: {
    width: 60,
    height: 4,
    borderRadius: 2,
    marginTop: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
});

export default observer(SelectedFilesInner);

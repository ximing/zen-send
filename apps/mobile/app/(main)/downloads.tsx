import { View, Text, TouchableOpacity, StyleSheet, FlatList, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import * as IntentLauncher from 'expo-intent-launcher';
import * as FileSystem from 'expo-file-system';
import { useService, observer } from '@rabjs/react';
import { ThemeService } from '../../src/services/theme.service';
import { HomeService, DownloadProgress } from '../../src/services/home.service';

function DownloadsScreenInner() {
  const router = useRouter();
  const themeService = useService(ThemeService);
  const homeService = useService(HomeService);
  const colors = themeService.colors;

  const handleBack = () => {
    router.back();
  };

  const handleShare = async (download: DownloadProgress) => {
    if (download.localUri) {
      try {
        if (download.localUri.startsWith('http')) {
          // For S3 URLs, share directly (would need to download first for proper sharing)
          await Sharing.shareAsync(download.localUri);
        } else {
          await Sharing.shareAsync(download.localUri);
        }
      } catch (err) {
        console.error('Share failed:', err);
      }
    }
  };

  const handleRemove = (sessionId: string) => {
    homeService.removeDownload(sessionId);
  };

  // Android only: Open file in file manager
  const handleOpenInFileManager = async (download: DownloadProgress) => {
    if (!download.localUri) {
      Alert.alert('提示', '文件尚未下载完成');
      return;
    }

    try {
      // Convert file URI to content URI for Android
      const contentUri = await FileSystem.getContentUriAsync(download.localUri);
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: contentUri,
        flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
      });
    } catch (err) {
      console.error('Open file failed:', err);
      Alert.alert('错误', '无法打开文件');
    }
  };

  const handleClearCompleted = () => {
    homeService.clearDownloads();
  };

  const downloads = homeService.downloads.filter((d) => d.localUri || d.status === 'downloading');

  const renderItem = ({ item }: { item: DownloadProgress }) => {
    const fileName = item.transfer.items?.[0]?.name ?? 'Unknown';
    const isCompleted = item.status === 'completed';

    return (
      <View style={[styles.item, { backgroundColor: colors.bgSurface }]}>
        <View style={styles.itemIcon}>
          <Ionicons
            name={isCompleted ? 'checkmark-circle' : item.status === 'failed' ? 'alert-circle' : 'cloud-download'}
            size={24}
            color={isCompleted ? '#22C55E' : item.status === 'failed' ? '#EF4444' : colors.accent}
          />
        </View>
        <View style={styles.itemContent}>
          <Text style={[styles.fileName, { color: colors.textPrimary }]} numberOfLines={1}>
            {fileName}
          </Text>
          <Text style={[styles.statusText, { color: colors.textSecondary }]}>
            {item.status === 'downloading' && `下载中... ${item.progress}%`}
            {item.status === 'completed' && '下载完成'}
            {item.status === 'failed' && '下载失败'}
          </Text>
        </View>
        {isCompleted && Platform.OS === 'android' && (
          <TouchableOpacity style={styles.actionButton} onPress={() => handleOpenInFileManager(item)}>
            <Ionicons name="folder-outline" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        )}
        {isCompleted && (
          <TouchableOpacity style={styles.actionButton} onPress={() => handleShare(item)}>
            <Ionicons name="share-outline" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.actionButton} onPress={() => handleRemove(item.sessionId)}>
          <Ionicons name="close" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>下载</Text>
        {homeService.downloads.some((d) => d.status === 'completed' && d.localUri) && (
          <TouchableOpacity onPress={handleClearCompleted} style={styles.clearButton}>
            <Text style={[styles.clearText, { color: colors.accent }]}>清除已完成</Text>
          </TouchableOpacity>
        )}
      </View>

      {downloads.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cloud-download-outline" size={64} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>暂无下载记录</Text>
        </View>
      ) : (
        <FlatList
          data={downloads}
          renderItem={renderItem}
          keyExtractor={(item) => item.sessionId}
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  );
}

const DownloadsScreen = observer(DownloadsScreenInner);

export default DownloadsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  clearButton: {
    padding: 4,
  },
  clearText: {
    fontSize: 14,
    fontWeight: '500',
  },
  list: {
    padding: 16,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  itemIcon: {
    marginRight: 12,
  },
  itemContent: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
  },
  statusText: {
    fontSize: 12,
    marginTop: 2,
  },
  actionButton: {
    padding: 8,
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
  },
});

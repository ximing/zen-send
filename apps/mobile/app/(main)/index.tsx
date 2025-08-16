import { useState } from 'react';
import { StyleSheet, Modal, View, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useService, observer, bindServices } from '@rabjs/react';
import { ThemeService } from '../../src/services/theme.service';
import { HomeService } from '../../src/services/home.service';
import Header from '../../src/components/header';
import FilterTabs from '../../src/components/filter-tabs';
import TransferList from '../../src/components/transfer-list';
import BottomToolbar from '../../src/components/bottom-toolbar';
import SelectedFiles from '../../src/components/selected-files';
import PreviewModal from '../../src/components/preview-modal';
import SearchModal from '../../src/components/search-modal';
import DrawerContent from '../../src/components/drawer/drawer-content';
import type { TransferSession } from '@zen-send/shared';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

interface HomeContentProps {
  homeService: HomeService;
}

function HomeContentInner({ homeService }: HomeContentProps) {
  const themeService = useService(ThemeService);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [previewTransfer, setPreviewTransfer] = useState<TransferSession | null>(null);
  const [searchVisible, setSearchVisible] = useState(false);

  const handleDownload = async (transfer: TransferSession) => {
    setPreviewTransfer(null);
    const url = await homeService.downloadTransfer(transfer);
    if (url) {
      try {
        if (url.startsWith('http')) {
          const fileUri = `${FileSystem.documentDirectory}${transfer.items?.[0]?.name ?? 'download'}`;
          const downloadedUri = await FileSystem.downloadAsync(url, fileUri);
          if (downloadedUri.uri && (await Sharing.isAvailableAsync())) {
            await Sharing.shareAsync(downloadedUri.uri);
          }
        } else if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(url);
        }
      } catch (err) {
        console.error('Failed to share download:', err);
      }
    }
  };

  return (
    <>
      <SafeAreaView style={[styles.container, { backgroundColor: themeService.colors.bgPrimary }]} edges={['top', 'left', 'right', 'bottom']}>
        <Header
          onMenuPress={() => setDrawerVisible(true)}
          onSearchPress={() => setSearchVisible(true)}
        />
        <SelectedFiles />
        <FilterTabs />
        <TransferList onItemPress={setPreviewTransfer} />
        <BottomToolbar onSearchPress={() => setSearchVisible(true)} />
        <PreviewModal
          transfer={previewTransfer}
          onClose={() => setPreviewTransfer(null)}
          onDownload={handleDownload}
        />
        <SearchModal visible={searchVisible} onClose={() => setSearchVisible(false)} />
      </SafeAreaView>

      <Modal
        visible={drawerVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDrawerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.overlayTouchable} onPress={() => setDrawerVisible(false)} />
          <View style={[styles.drawerContainer, { backgroundColor: themeService.colors.bgSurface }]}>
            <DrawerContent onClose={() => setDrawerVisible(false)} />
          </View>
        </View>
      </Modal>
    </>
  );
}

const HomeContent = bindServices(HomeContentInner, [HomeService]);

function HomeScreen() {
  return <HomeContent />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    flexDirection: 'row',
  },
  overlayTouchable: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  drawerContainer: {
    width: 280,
    height: '100%',
  },
});

export default observer(HomeScreen);

import { useState, useEffect, useRef } from 'react';
import { StyleSheet, Modal, View, TouchableOpacity, Text, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useService, observer } from '@rabjs/react';
import { ThemeService } from '../../src/services/theme.service';
import { HomeService } from '../../src/services/home.service';
import Header from '../../src/components/header';
import FilterTabs from '../../src/components/filter-tabs';
import TransferList from '../../src/components/transfer-list';
import BottomToolbar from '../../src/components/bottom-toolbar';
import SelectedFiles from '../../src/components/selected-files';
import PreviewModal from '../../src/components/preview-modal';
import DrawerContent from '../../src/components/drawer/drawer-content';
import type { TransferSession } from '@zen-send/shared';

function HomeContentInner() {
  const router = useRouter();
  const themeService = useService(ThemeService);
  const homeService = useService(HomeService);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [previewTransfer, setPreviewTransfer] = useState<TransferSession | null>(null);
  const drawerTranslateX = useRef(new Animated.Value(-280)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (drawerVisible) {
      Animated.parallel([
        Animated.timing(drawerTranslateX, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(drawerTranslateX, {
          toValue: -280,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [drawerVisible]);

  const handleDownload = async (transfer: TransferSession) => {
    homeService.startDownload(transfer);
    router.push('/(main)/downloads');
  };

  return (
    <>
      <SafeAreaView style={[styles.container, { backgroundColor: themeService.colors.bgPrimary }]} edges={['top', 'left', 'right', 'bottom']}>
        <Header
          onMenuPress={() => setDrawerVisible(true)}
          onSearchPress={() => router.push('/(main)/search')}
        />
        <SelectedFiles />
        <FilterTabs />
        <TransferList
          onItemPress={setPreviewTransfer}
          onDownload={(t) => handleDownload(t)}
          onPreview={setPreviewTransfer}
        />
        <BottomToolbar />
        <PreviewModal
          transfer={previewTransfer}
          onClose={() => setPreviewTransfer(null)}
          onDownload={handleDownload}
        />
      </SafeAreaView>

      <Modal
        visible={drawerVisible}
        animationType="none"
        transparent={true}
        onRequestClose={() => setDrawerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.overlayTouchable, { opacity: overlayOpacity }]}>
            <TouchableOpacity style={styles.fullOverlay} onPress={() => setDrawerVisible(false)} />
          </Animated.View>
          <Animated.View
            style={[
              styles.drawerContainer,
              { backgroundColor: themeService.colors.bgSurface, transform: [{ translateX: drawerTranslateX }] },
            ]}
          >
            <DrawerContent onClose={() => setDrawerVisible(false)} />
          </Animated.View>
        </View>
      </Modal>
    </>
  );
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
    ...StyleSheet.absoluteFillObject,
  },
  fullOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  drawerContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 280,
  },
});

export default observer(HomeContentInner);

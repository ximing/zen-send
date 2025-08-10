import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useService, observer, bindServices } from '@rabjs/react';
import { ThemeService } from '../../src/services/theme.service';
import { HomeService } from '../../src/services/home.service';
import Header from '../../src/components/header';
import FilterTabs from '../../src/components/filter-tabs';
import TransferList from '../../src/components/transfer-list';
import BottomToolbar from '../../src/components/bottom-toolbar';
import SelectedFiles from '../../src/components/selected-files';
import PreviewModal from '../../src/components/preview-modal';
import type { TransferSession } from '@zen-send/shared';

interface HomeContentProps {
  homeService: HomeService;
}

function HomeContentInner({ homeService }: HomeContentProps) {
  const themeService = useService(ThemeService);
  const [previewTransfer, setPreviewTransfer] = useState<TransferSession | null>(null);

  const handleDownload = async (transfer: TransferSession) => {
    setPreviewTransfer(null);
    const url = await homeService.downloadTransfer(transfer);
    if (url) {
      // For now, the URL could be used to share or open the file
      // In a real app, you'd use expo-file-system to save and share
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: themeService.colors.bgPrimary }]}>
      <Header />
      <SelectedFiles />
      <FilterTabs />
      <TransferList onItemPress={setPreviewTransfer} />
      <BottomToolbar />
      <PreviewModal
        transfer={previewTransfer}
        onClose={() => setPreviewTransfer(null)}
        onDownload={handleDownload}
      />
    </View>
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
});

export default observer(HomeScreen);

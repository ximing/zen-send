import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useService, observer, bindServices } from '@rabjs/react';
import { ThemeService } from '../../src/services/theme.service';
import { HomeService } from '../../src/services/home.service';
import Header from '../../src/components/header';
import FilterTabs from '../../src/components/filter-tabs';
import TransferList from '../../src/components/transfer-list';
import type { TransferSession } from '@zen-send/shared';

interface HomeContentProps {
  homeService: HomeService;
}

function HomeContentInner({ homeService }: HomeContentProps) {
  const themeService = useService(ThemeService);
  const [previewTransfer, setPreviewTransfer] = useState<TransferSession | null>(null);

  return (
    <View style={[styles.container, { backgroundColor: themeService.colors.bgPrimary }]}>
      <Header />
      <FilterTabs />
      <TransferList onItemPress={setPreviewTransfer} />
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

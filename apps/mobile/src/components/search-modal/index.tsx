import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { useState } from 'react';
import { useService, observer } from '@rabjs/react';
import { ThemeService } from '../../services/theme.service';
import { HomeService } from '../../services/home.service';
import TransferItem from '../transfer-item';
import type { TransferSession } from '@zen-send/shared';

interface SearchModalProps {
  visible: boolean;
  onClose: () => void;
}

function SearchModalInner({ visible, onClose }: SearchModalProps) {
  const themeService = useService(ThemeService);
  const homeService = useService(HomeService);
  const colors = themeService.colors;
  const [query, setQuery] = useState('');

  const handleSearch = (text: string) => {
    setQuery(text);
    homeService.setSearchQuery(text);
  };

  const handleClose = () => {
    setQuery('');
    homeService.setSearchQuery('');
    onClose();
  };

  return (
    <Modal visible={visible} onRequestClose={handleClose} animationType="slide">
      <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
        <View style={styles.header}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.bgSurface, color: colors.textPrimary }]}
            value={query}
            onChangeText={handleSearch}
            placeholder="搜索文件名..."
            placeholderTextColor={colors.textMuted}
            autoFocus
          />
          <TouchableOpacity onPress={handleClose}>
            <Text style={[styles.cancel, { color: colors.accent }]}>取消</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={homeService.filteredTransfers}
          renderItem={({ item }) => (
            <TransferItem
              transfer={item}
              onPress={() => {
                handleClose();
              }}
            />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  input: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  cancel: {
    fontSize: 14,
    fontWeight: '500',
  },
  list: {
    paddingVertical: 8,
  },
});

export default observer(SearchModalInner);

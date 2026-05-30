import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useService, observer } from '@rabjs/react';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { NoteService } from '../../../src/services/note.service';
import { ThemeService } from '../../../src/services/theme.service';
import { showToast } from '../../../src/components/toast';
import type { NoteListItem } from '@zen-send/dto';

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() / 1000 - timestamp;
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}天前`;
  const d = new Date(timestamp * 1000);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function NoteListScreenInner() {
  const router = useRouter();
  const noteService = useService(NoteService);
  const themeService = useService(ThemeService);
  const colors = themeService.colors;

  useEffect(() => {
    noteService.loadNoteList();
  }, []);

  const handleCreate = async () => {
    try {
      const note = await noteService.createNote();
      router.push(`/(main)/notes/${note.id}`);
    } catch {
      showToast('创建笔记失败');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await noteService.deleteNote(id);
    } catch {
      showToast('删除失败');
    }
  };

  const renderRightActions = (id: string) => (
    <TouchableOpacity
      style={[styles.deleteAction, { backgroundColor: '#FF3B30' }]}
      onPress={() => handleDelete(id)}
    >
      <Ionicons name="trash-outline" size={22} color="#fff" />
    </TouchableOpacity>
  );

  const renderItem = ({ item }: { item: NoteListItem }) => (
    <Swipeable renderRightActions={() => renderRightActions(item.id)}>
      <TouchableOpacity
        style={[styles.item, { backgroundColor: colors.bgSurface }]}
        onPress={() => router.push(`/(main)/notes/${item.id}`)}
        activeOpacity={0.7}
      >
        <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
          {item.title || '未命名笔记'}
        </Text>
        <Text style={[styles.time, { color: colors.textMuted }]}>
          {formatRelativeTime(item.updatedAt)}
        </Text>
      </TouchableOpacity>
    </Swipeable>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.heading, { color: colors.textPrimary }]}>笔记</Text>
        <TouchableOpacity onPress={handleCreate} style={styles.addButton}>
          <Ionicons name="add" size={26} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* List */}
      {noteService.notes.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="document-text-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>还没有笔记</Text>
          <TouchableOpacity
            style={[styles.emptyButton, { backgroundColor: colors.accent }]}
            onPress={handleCreate}
          >
            <Text style={styles.emptyButtonText}>新建笔记</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={noteService.notes}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: { padding: 4, marginRight: 8 },
  heading: { flex: 1, fontSize: 17, fontWeight: '600' },
  addButton: { padding: 4 },
  list: { paddingTop: 8, paddingHorizontal: 16 },
  item: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: 15, fontWeight: '500', flex: 1, marginRight: 12 },
  time: { fontSize: 12 },
  deleteAction: {
    width: 72,
    borderRadius: 10,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  emptyText: { fontSize: 15 },
  emptyButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  emptyButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});

export default observer(NoteListScreenInner);

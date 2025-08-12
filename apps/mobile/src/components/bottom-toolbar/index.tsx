import { View, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Text, Alert } from 'react-native';
import { useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import { useService, observer } from '@rabjs/react';
import { ThemeService } from '../../services/theme.service';
import { HomeService } from '../../services/home.service';

interface BottomToolbarProps {
  onSearchPress: () => void;
}

function BottomToolbarInner({ onSearchPress }: BottomToolbarProps) {
  const themeService = useService(ThemeService);
  const homeService = useService(HomeService);
  const colors = themeService.colors;
  const [text, setText] = useState('');

  const handleSelectFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        multiple: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        await homeService.uploadFiles(result.assets);
      }
    } catch (err) {
      console.error('File selection error:', err);
    }
  };

  const handleSendText = async () => {
    if (!text.trim()) return;
    try {
      await homeService.sendText(text.trim());
      setText('');
    } catch (err) {
      console.error('Send text error:', err);
    }
  };

  const handlePasteClipboard = async () => {
    try {
      const content = await homeService.readClipboard();
      if (content) {
        setText(content);
      } else {
        Alert.alert('剪贴板为空', '没有可粘贴的内容');
      }
    } catch (err) {
      console.error('Clipboard error:', err);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <View style={[styles.container, { backgroundColor: colors.bgSurface, borderTopColor: colors.borderSubtle }]}>
        <View style={styles.iconsRow}>
          <TouchableOpacity style={styles.iconButton} onPress={handleSelectFile}>
            <Text style={styles.iconText}>📎</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={onSearchPress}>
            <Text style={styles.iconText}>🔍</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={handlePasteClipboard}>
            <Text style={styles.iconText}>📋</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.bgElevated, color: colors.textPrimary }]}
            value={text}
            onChangeText={setText}
            placeholder="输入文字..."
            placeholderTextColor={colors.textMuted}
            multiline
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              { backgroundColor: text.trim() ? colors.textPrimary : colors.bgElevated },
            ]}
            onPress={handleSendText}
            disabled={!text.trim()}
          >
            <Text style={[styles.sendIcon, { color: text.trim() ? colors.bgPrimary : colors.textMuted }]}>➤</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  iconsRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  iconButton: {
    padding: 8,
  },
  iconText: {
    fontSize: 22,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendIcon: {
    fontSize: 18,
  },
});

export default observer(BottomToolbarInner);

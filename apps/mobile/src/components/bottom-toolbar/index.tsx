import { View, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Text, Alert, ActionSheetIOS } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useService, observer } from '@rabjs/react';
import { ThemeService } from '../../services/theme.service';
import { HomeService } from '../../services/home.service';

function BottomToolbarInner() {
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

  const handleAddMedia = async () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['取消', '从相册选择', '拍摄照片'],
          cancelButtonIndex: 0,
        },
        async (buttonIndex) => {
          if (buttonIndex === 1) {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              allowsMultipleSelection: true,
            });
            if (!result.canceled && result.assets && result.assets.length > 0) {
              const files = result.assets.map((asset) => ({
                uri: asset.uri,
                name: asset.fileName || asset.uri.split('/').pop() || 'image.jpg',
                mimeType: asset.mimeType || 'image/jpeg',
              }));
              await homeService.uploadFiles(files);
            }
          } else if (buttonIndex === 2) {
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ['images'],
            });
            if (!result.canceled && result.assets && result.assets.length > 0) {
              const files = result.assets.map((asset) => ({
                uri: asset.uri,
                name: asset.fileName || asset.uri.split('/').pop() || 'image.jpg',
                mimeType: asset.mimeType || 'image/jpeg',
              }));
              await homeService.uploadFiles(files);
            }
          }
        }
      );
    } else {
      // Android: use Alert with buttons
      Alert.alert(
        '选择图片来源',
        '',
        [
          { text: '取消', style: 'cancel' },
          {
            text: '从相册选择',
            onPress: async () => {
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsMultipleSelection: true,
              });
              if (!result.canceled && result.assets && result.assets.length > 0) {
                const files = result.assets.map((asset) => ({
                  uri: asset.uri,
                  name: asset.fileName || asset.uri.split('/').pop() || 'image.jpg',
                  mimeType: asset.mimeType || 'image/jpeg',
                }));
                await homeService.uploadFiles(files);
              }
            },
          },
          {
            text: '拍摄照片',
            onPress: async () => {
              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ['images'],
              });
              if (!result.canceled && result.assets && result.assets.length > 0) {
                const files = result.assets.map((asset) => ({
                  uri: asset.uri,
                  name: asset.fileName || asset.uri.split('/').pop() || 'image.jpg',
                  mimeType: asset.mimeType || 'image/jpeg',
                }));
                await homeService.uploadFiles(files);
              }
            },
          },
        ],
        { cancelable: true }
      );
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
            <Ionicons name="folder-outline" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={handleAddMedia}>
            <Ionicons name="image-outline" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={handlePasteClipboard}>
            <Ionicons name="clipboard-outline" size={22} color={colors.textPrimary} />
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
            <Ionicons name="send" size={18} color={text.trim() ? colors.bgPrimary : colors.textMuted} />
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

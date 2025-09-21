import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { observer, useService } from '@rabjs/react';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { AuthService } from '../../src/services/auth.service';
import { UserService } from '../../src/services/user.service';
import { ThemeService } from '../../src/services/theme.service';
import { showToast } from '../../src/components/toast';

function SettingsPageInner() {
  const authService = useService(AuthService);
  const userService = useService(UserService);
  const themeService = useService(ThemeService);
  const colors = themeService.colors;

  const user = authService.user;
  const [nickname, setNickname] = useState(user?.nickname || user?.email?.split('@')[0] || '');
  const [isSavingNickname, setIsSavingNickname] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  useEffect(() => {
    userService.getProfile().catch(console.error);
  }, []);

  const handleSaveNickname = async () => {
    setIsSavingNickname(true);
    try {
      await userService.updateProfile({ nickname });
      showToast('Nickname saved');
    } catch (err) {
      showToast('Failed to save nickname');
    } finally {
      setIsSavingNickname(false);
    }
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: false,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
      showToast('File size must be less than 10MB');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      await userService.uploadAvatar(
        asset.uri,
        asset.mimeType || 'image/jpeg',
        asset.fileSize || 0
      );
      showToast('Avatar updated');
    } catch (err) {
      showToast('Failed to upload avatar');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      await userService.updateProfile({ removeAvatar: true });
      showToast('Avatar removed');
    } catch (err) {
      showToast('Failed to remove avatar');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bgSurface }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Settings</Text>
      </View>

      <View style={styles.content}>
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.accentSoft }]}>
                <Text style={[styles.avatarPlaceholderText, { color: colors.accent }]}>
                  {user?.email?.charAt(0).toUpperCase() ?? '?'}
                </Text>
              </View>
            )}
            <TouchableOpacity
              onPress={handlePickImage}
              disabled={isUploadingAvatar}
              style={[styles.cameraButton, { backgroundColor: colors.accent }]}
            >
              <Ionicons name="camera" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
          {user?.avatarUrl && (
            <TouchableOpacity onPress={handleRemoveAvatar}>
              <Text style={[styles.removeAvatarText, { color: colors.textMuted }]}>
                Remove avatar
              </Text>
            </TouchableOpacity>
          )}
          {isUploadingAvatar && (
            <ActivityIndicator size="small" color={colors.accent} style={styles.uploadIndicator} />
          )}
        </View>

        {/* Nickname Section */}
        <View style={styles.fieldSection}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Nickname</Text>
          <View style={styles.nicknameRow}>
            <TextInput
              value={nickname}
              onChangeText={setNickname}
              placeholder={user?.email?.split('@')[0] || 'Enter nickname'}
              placeholderTextColor={colors.textMuted}
              maxLength={50}
              style={[
                styles.nicknameInput,
                {
                  color: colors.textPrimary,
                  backgroundColor: colors.bgElevated,
                  borderColor: colors.borderSubtle,
                },
              ]}
            />
            <TouchableOpacity
              onPress={handleSaveNickname}
              disabled={isSavingNickname}
              style={[styles.saveButton, { backgroundColor: colors.accent }]}
            >
              <Text style={styles.saveButtonText}>
                {isSavingNickname ? '...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Email (read-only) */}
        <View style={styles.fieldSection}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Email</Text>
          <View style={[styles.readOnlyField, { backgroundColor: colors.bgElevated }]}>
            <Text style={[styles.readOnlyText, { color: colors.textMuted }]}>
              {user?.email ?? ''}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  content: { flex: 1, padding: 24 },
  avatarSection: { alignItems: 'center', marginBottom: 32 },
  avatarContainer: { position: 'relative', marginBottom: 12 },
  avatarImage: { width: 96, height: 96, borderRadius: 48 },
  avatarPlaceholder: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  avatarPlaceholderText: { fontSize: 36, fontWeight: '600' },
  cameraButton: { position: 'absolute', bottom: 0, right: 0, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  removeAvatarText: { fontSize: 14, marginTop: 8 },
  uploadIndicator: { marginTop: 8 },
  fieldSection: { marginBottom: 20 },
  fieldLabel: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
  nicknameRow: { flexDirection: 'row', gap: 8 },
  nicknameInput: { flex: 1, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, fontSize: 16, borderWidth: 1 },
  saveButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, justifyContent: 'center' },
  saveButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  readOnlyField: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
  readOnlyText: { fontSize: 14 },
});

export default observer(SettingsPageInner);

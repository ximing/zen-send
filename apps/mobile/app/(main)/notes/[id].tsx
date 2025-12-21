import { View, StyleSheet, Platform, TouchableOpacity, Text, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useEffect } from 'react';
import WebView from 'react-native-webview';
import { useService, observer } from '@rabjs/react';
import { Ionicons } from '@expo/vector-icons';
import { AuthService } from '../../../src/services/auth.service';
import { ThemeService } from '../../../src/services/theme.service';

function NoteEditorScreenInner() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const authService = useService(AuthService);
  const themeService = useService(ThemeService);
  const colors = themeService.colors;
  const webViewRef = useRef<WebView>(null);
  const prevTokenRef = useRef(authService.accessToken);

  // Reload WebView if token refreshes
  useEffect(() => {
    if (prevTokenRef.current !== authService.accessToken) {
      prevTokenRef.current = authService.accessToken;
      webViewRef.current?.reload();
    }
  }, [authService.accessToken]);

  const displayName = encodeURIComponent(
    authService.user?.nickname ?? authService.user?.email ?? 'Mobile User'
  );
  const userId = authService.user?.id ?? '';
  const token = authService.accessToken ?? '';

  // In production the web app is served from the same server.
  // In dev, point serverUrl to the web dev server (port 5274) or build web first.
  const embedUrl = `${authService.serverUrl}/#/notes/embed/${id}?access_token=${token}&user_id=${userId}&user_name=${displayName}`;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      <View style={[styles.header, { backgroundColor: colors.bgSurface, borderBottomColor: colors.borderSubtle }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textSecondary }]} numberOfLines={1}>
          编辑中
        </Text>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <WebView
          ref={webViewRef}
          source={{ uri: embedUrl }}
          style={styles.flex}
          allowsInlineMediaPlayback
          keyboardDisplayRequiresUserAction={false}
          scrollEnabled={false}
          contentInsetAdjustmentBehavior="never"
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  header: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: { padding: 4, marginRight: 8 },
  headerTitle: { fontSize: 14 },
});

export default observer(NoteEditorScreenInner);

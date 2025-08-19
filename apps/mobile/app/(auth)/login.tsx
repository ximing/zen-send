import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useService, observer } from '@rabjs/react';
import { AuthService } from '../../src/services/auth.service';
import { ThemeService } from '../../src/services/theme.service';
import QrScanner from '../../src/components/qr-scanner';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type AuthStackParamList = {
  login: undefined;
};

function LoginScreen() {
  const router = useRouter();
  const authService = useService(AuthService);
  const themeService = useService(ThemeService);
  const colors = themeService.colors;

  const [serverUrl, setServerUrl] = useState(authService.serverUrl);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showQrScanner, setShowQrScanner] = useState(false);

  const handleQrScan = async ({ token, serverUrl }: { token: string; serverUrl: string }) => {
    setShowQrScanner(false);
    setIsLoading(true);
    setError(null);
    try {
      await authService.loginWithQrToken(token, serverUrl);
      router.replace('/(main)');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'QR login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await authService.login({ email, password }, serverUrl);
      router.replace('/(main)');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.bgPrimary }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Zen Send</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Sign in to continue
        </Text>

        {error && (
          <View style={[styles.errorContainer, { backgroundColor: colors.accentSoft }]}>
            <Text style={[styles.errorText, { color: colors.accent }]}>{error}</Text>
          </View>
        )}

        <View style={styles.form}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Server URL</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.bgSurface,
                color: colors.textPrimary,
                borderColor: colors.borderDefault,
              },
            ]}
            value={serverUrl}
            onChangeText={setServerUrl}
            placeholder="http://localhost:3110"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={[styles.label, { color: colors.textSecondary }]}>Email</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.bgSurface,
                color: colors.textPrimary,
                borderColor: colors.borderDefault,
              },
            ]}
            value={email}
            onChangeText={setEmail}
            placeholder="your@email.com"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />

          <Text style={[styles.label, { color: colors.textSecondary }]}>Password</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.bgSurface,
                color: colors.textPrimary,
                borderColor: colors.borderDefault,
              },
            ]}
            value={password}
            onChangeText={setPassword}
            placeholder="Enter password"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
          />

          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: colors.accent },
              isLoading && styles.buttonDisabled,
            ]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.bgSurface} />
            ) : (
              <Text style={[styles.buttonText, { color: colors.bgSurface }]}>Sign In</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.qrButton} onPress={() => setShowQrScanner(true)}>
            <Text style={[styles.qrButtonText, { color: colors.accent }]}>SCAN QR CODE</Text>
          </TouchableOpacity>
        </View>
      </View>

      <QrScanner
        visible={showQrScanner}
        onClose={() => setShowQrScanner(false)}
        onScan={handleQrScan}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 32,
  },
  errorContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    textAlign: 'center',
  },
  form: {
    gap: 4,
  },
  label: {
    fontSize: 12,
    marginBottom: 4,
    marginLeft: 4,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 14,
    marginBottom: 12,
  },
  button: {
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  qrButton: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  qrButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default observer(LoginScreen);

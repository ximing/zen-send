import { Stack } from 'expo-router';
import { register } from '@rabjs/react';
import { StatusBar } from 'expo-status-bar';
import { ApiService } from '../src/services/api.service';
import { AuthService } from '../src/services/auth.service';
import { ThemeService } from '../src/services/theme.service';
import { SocketService } from '../src/services/socket.service';

// Register services
register(ApiService);
register(AuthService);
register(ThemeService);
register(SocketService);

export default function RootLayout() {
  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)/login" />
        <Stack.Screen name="(main)" />
      </Stack>
    </>
  );
}

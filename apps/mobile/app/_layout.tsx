import { Stack } from 'expo-router';
import { register, useService, observer } from '@rabjs/react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ApiService } from '../src/services/api.service';
import { AuthService } from '../src/services/auth.service';
import { ThemeService } from '../src/services/theme.service';
import { SocketService } from '../src/services/socket.service';
import { HomeService } from '../src/services/home.service';
import { NotificationService } from '../src/services/notification.service';
import { UserService } from '../src/services/user.service';
import { NoteService } from '../src/services/note.service';
import ToastInner from '../src/components/toast';

// Register services
register(ApiService);
register(AuthService);
register(ThemeService);
register(SocketService);
register(HomeService);
register(NotificationService);
register(UserService);
register(NoteService);

function RootLayoutInner() {
  const themeService = useService(ThemeService);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style={themeService.isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)/login" />
        <Stack.Screen name="(main)" />
      </Stack>
      <ToastInner />
    </GestureHandlerRootView>
  );
}

export default observer(RootLayoutInner);

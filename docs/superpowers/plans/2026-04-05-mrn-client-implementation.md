# Zen Send MRN Client Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a React Native (Expo) mobile client for Zen Send with login (email/password + QR code), file/text transfer, and real-time updates. Also implement server-side `POST /api/auth/pair-login` endpoint for QR code login.

**Architecture:** The app uses expo-router for file-based routing, @rabjs/react for state management with Service pattern, and socket.io-client for real-time communication. Existing services (ApiService, AuthService) will be extended; new services (ThemeService, SocketService, HomeService) will be created. The UI follows the Bottom Toolbar design with a single HomeScreen containing the transfer list. Server-side adds a new endpoint to exchange pair tokens from QR codes for auth tokens.

**Tech Stack:** React Native (Expo ~55), expo-router ~5.0, @rabjs/react ^9.0, socket.io-client ^4.8, expo-document-picker, expo-file-system, expo-camera, expo-notifications, expo-secure-store, expo-clipboard

---

## Chunk 0: Server - Pair Login Endpoint

### Overview
Add `POST /api/auth/pair-login` endpoint to exchange pair token (from QR code) for auth tokens. This allows mobile to login by scanning a QR code.

### Files to Create/Modify

- Create: `apps/server/src/validators/pair-login.validator.ts` - Validator for pair login
- Modify: `apps/server/src/controllers/auth.controller.ts` - Add pair-login endpoint
- Modify: `apps/server/src/services/auth.service.ts` - Add pair login method

### Steps

- [ ] **Step 1: Create pair-login validator**

Create: `apps/server/src/validators/pair-login.validator.ts`
```typescript
import { IsString, IsNotEmpty } from 'class-validator';

export class PairLoginDto {
  @IsString()
  @IsNotEmpty()
  token!: string;
}
```

- [ ] **Step 2: Add pairLogin method to AuthService**

Modify: `apps/server/src/services/auth.service.ts`

Add method:
```typescript
async pairLogin(token: string): Promise<AuthTokens> {
  // Verify the pair token using JWT_REFRESH_SECRET
  const jwt = require('jsonwebtoken');
  const { JWT_REFRESH_SECRET } = await import('../utils/jwt.js');

  const payload = jwt.verify(token, JWT_REFRESH_SECRET);
  if (!payload.userId) {
    throw new Error('Invalid pair token');
  }

  // Optionally register the device if not exists
  const deviceService = Container.get(DeviceService);
  const device = await deviceService.registerDevice({
    userId: payload.userId,
    name: payload.deviceName || 'Mobile Device',
    type: 'ios', // Mobile will pass actual type
  });

  // Return auth tokens
  return this.generateTokens({ userId: payload.userId });
}
```

- [ ] **Step 3: Add pair-login endpoint to AuthController**

Modify: `apps/server/src/controllers/auth.controller.ts`

Add imports:
```typescript
import { PairLoginDto } from '../validators/pair-login.validator.ts';
```

Add endpoint:
```typescript
@Post('/pair-login')
@HttpCode(200)
async pairLogin(@Body() dto: PairLoginDto) {
  try {
    const tokens = await this.authService.pairLogin(dto.token);
    return ResponseUtil.success(tokens);
  } catch (error) {
    throw new HttpError(401, 'Pair login failed');
  }
}
```

- [ ] **Step 4: Commit server changes**

```bash
cd apps/server
git add src/validators/pair-login.validator.ts src/controllers/auth.controller.ts src/services/auth.service.ts
git commit -m "feat(server): add POST /api/auth/pair-login endpoint for QR code login"
```

---

## Chunk 1: Project Setup & Navigation Foundation

### Overview
Set up the navigation structure with expo-router, install required dependencies, and create the basic screen layouts.

### Files to Create/Modify

- Modify: `apps/mobile/package.json` - Add required dependencies
- Create: `apps/mobile/src/main.tsx` - App entry point with Service registration
- Modify: `apps/mobile/app/_layout.tsx` - Root layout with ServiceProvider
- Create: `apps/mobile/app/(auth)/login.tsx` - Login screen
- Create: `apps/mobile/app/(auth)/_layout.tsx` - Auth navigator layout
- Create: `apps/mobile/app/(main)/_layout.tsx` - Main navigator layout
- Create: `apps/mobile/app/(main)/index.tsx` - Home screen
- Create: `apps/mobile/src/services/theme.service.ts` - Theme management
- Create: `apps/mobile/src/services/socket.service.ts` - Socket.io connection management
- Create: `apps/mobile/src/theme/tokens.ts` - Design tokens

### Steps

- [ ] **Step 1: Update package.json with dependencies**

Read current `apps/mobile/package.json` and add these dependencies:
```json
{
  "expo-document-picker": "~13.0.0",
  "expo-file-system": "~18.0.0",
  "expo-camera": "~16.0.0",
  "expo-notifications": "~0.29.0",
  "expo-secure-store": "~14.0.0",
  "expo-clipboard": "~7.0.0",
  "@react-navigation/native": "^7.0.0",
  "@react-navigation/native-stack": "^7.0.0"
}
```

Run: `cd apps/mobile && pnpm install`

**Note:** Using `expo-secure-store` for token storage as specified in requirements (not AsyncStorage).

- [ ] **Step 2: Create theme tokens**

Create: `apps/mobile/src/theme/tokens.ts`
```typescript
export const tokens = {
  colors: {
    light: {
      bgPrimary: '#F7F5F2',
      bgSurface: '#FFFFFF',
      bgElevated: '#F5F5F5',
      textPrimary: '#2C2C2C',
      textSecondary: '#9A958F',
      textMuted: '#B5AFA8',
      borderDefault: '#DDD8D0',
      borderSubtle: '#EDEBE7',
      accent: '#8B9A7D',
      accentSoft: '#8B9A7D20',
    },
    dark: {
      bgPrimary: '#1C1C1E',
      bgSurface: '#242426',
      bgElevated: '#2C2C2E',
      textPrimary: '#E5E2DC',
      textSecondary: '#8A8880',
      textMuted: '#6B6860',
      borderDefault: '#3A3A3C',
      borderSubtle: '#2E2E30',
      accent: '#8B9A7D',
      accentSoft: '#8B9A7D20',
    },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
  },
  typography: {
    title: { fontSize: 20, fontWeight: '500' as const },
    body: { fontSize: 14, fontWeight: '400' as const },
    caption: { fontSize: 12, fontWeight: '400' as const },
    small: { fontSize: 11, fontWeight: '400' as const },
  },
  radius: {
    sm: 6,
    md: 8,
    lg: 10,
    xl: 12,
    xxl: 14,
  },
};

export type ThemeMode = 'light' | 'dark';
```

- [ ] **Step 3: Create ThemeService**

Create: `apps/mobile/src/services/theme.service.ts`
```typescript
import { Service } from '@rabjs/react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { tokens, ThemeMode } from '../theme/tokens';

const THEME_KEY = 'zen_send_theme';

export class ThemeService extends Service {
  mode: ThemeMode = 'light';
  private listener: (() => void) | null = null;

  constructor() {
    super();
    this.loadTheme();
  }

  get colors() {
    return tokens.colors[this.mode];
  }

  get spacing() {
    return tokens.spacing;
  }

  get typography() {
    return tokens.typography;
  }

  get radius() {
    return tokens.radius;
  }

  get isDark() {
    return this.mode === 'dark';
  }

  private async loadTheme() {
    try {
      const stored = await AsyncStorage.getItem(THEME_KEY);
      if (stored === 'light' || stored === 'dark') {
        this.mode = stored;
      }
    } catch {
      // Use default
    }
  }

  async setMode(mode: ThemeMode) {
    this.mode = mode;
    await AsyncStorage.setItem(THEME_KEY, mode);
  }

  async toggleTheme() {
    await this.setMode(this.isDark ? 'light' : 'dark');
  }
}
```

- [ ] **Step 4: Create SocketService**

Create: `apps/mobile/src/services/socket.service.ts`
```typescript
import { Service } from '@rabjs/react';
import { io, Socket } from 'socket.io-client';
import { getSocketUrl } from '../lib/env';
import { AuthService } from './auth.service';

export class SocketService extends Service {
  socket: Socket | null = null;
  private deviceId: string | null = null;

  get isConnected() {
    return this.socket?.connected ?? false;
  }

  get authService() {
    return this.resolve(AuthService);
  }

  connect(deviceId: string, deviceName: string, deviceType: 'android' | 'ios') {
    if (this.socket?.connected) return;

    this.deviceId = deviceId;
    const token = this.authService.accessToken;

    // Pass JWT token for socket authentication
    this.socket = io(getSocketUrl(), {
      transports: ['websocket'],
      auth: {
        token, // Required by server: socket.handshake.auth.token
      },
    });

    this.socket.on('connect', () => {
      this.socket?.emit('device:register', {
        name: deviceName,
        type: deviceType,
      });
    });

    this.socket.on('transfer:new', (data: unknown) => {
      // Emit event for listeners
    });

    this.socket.on('transfer:progress', (data: unknown) => {
      // Emit event for listeners
    });

    this.socket.on('disconnect', () => {
      // Handle disconnect
    });

    // Set up heartbeat interval
    setInterval(() => this.sendHeartbeat(), 30000);
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  emitTransferNotify(sessionId: string, targetDeviceId?: string) {
    this.socket?.emit('transfer:notify', { sessionId, targetDeviceId });
  }

  emitTransferComplete(sessionId: string) {
    this.socket?.emit('transfer:complete', { sessionId });
  }

  sendHeartbeat() {
    if (this.deviceId && this.socket?.connected) {
      this.socket?.emit('device:heartbeat');
    }
  }
}
```

- [ ] **Step 5: Create root layout with ServiceProvider**

Create: `apps/mobile/app/_layout.tsx`
```tsx
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { register, Service, useService } from '@rabjs/react';
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

function RootLayoutInner() {
  const themeService = useService(ThemeService);

  return (
    <>
      <StatusBar style={themeService.isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)/login" />
        <Stack.Screen name="(main)" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return <RootLayoutInner />;
}
```

- [ ] **Step 6: Create auth layout**

Create: `apps/mobile/app/(auth)/_layout.tsx`
```tsx
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
    </Stack>
  );
}
```

- [ ] **Step 7: Create main layout**

Create: `apps/mobile/app/(main)/_layout.tsx`
```tsx
import { Stack } from 'expo-router';
import { useService, observer } from '@rabjs/react';
import { useEffect } from 'react';
import { AuthService } from '../../src/services/auth.service';
import { SocketService } from '../../src/services/socket.service';

function MainLayoutInner() {
  const authService = useService(AuthService);
  const socketService = useService(SocketService);

  useEffect(() => {
    if (authService.isAuthenticated && authService.user) {
      // Connect socket when authenticated
      const deviceId = 'mobile-' + Math.random().toString(36).slice(2);
      socketService.connect(deviceId, 'Mobile Device', 'ios');
    }
    return () => {
      socketService.disconnect();
    };
  }, [authService.isAuthenticated]);

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default observer(MainLayoutInner);
```

- [ ] **Step 8: Create basic LoginScreen**

Create: `apps/mobile/app/(auth)/login.tsx`
```tsx
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useService, observer } from '@rabjs/react';
import { AuthService } from '../../src/services/auth.service';
import { ThemeService } from '../../src/services/theme.service';

function LoginScreenInner() {
  const router = useRouter();
  const authService = useService(AuthService);
  const themeService = useService(ThemeService);
  const [serverUrl, setServerUrl] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password || !serverUrl) return;
    setLoading(true);
    setError('');
    try {
      await authService.login({ email, password }, serverUrl);
      router.replace('/(main)');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const colors = themeService.colors;

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Zen Send</Text>

      <View style={[styles.card, { backgroundColor: colors.bgSurface }]}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>SERVER</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.bgElevated, color: colors.textPrimary, borderColor: colors.borderDefault }]}
          value={serverUrl}
          onChangeText={setServerUrl}
          autoCapitalize="none"
          keyboardType="url"
          placeholder="https://zensend.example.com"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={[styles.label, { color: colors.textSecondary }]}>EMAIL</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.bgElevated, color: colors.textPrimary, borderColor: colors.borderDefault }]}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="your@email.com"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={[styles.label, { color: colors.textSecondary }]}>PASSWORD</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.bgElevated, color: colors.textPrimary, borderColor: colors.borderDefault }]}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
          placeholderTextColor={colors.textMuted}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.textPrimary }]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.bgPrimary} />
          ) : (
            <Text style={[styles.buttonText, { color: colors.bgPrimary }]}>SIGN IN</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.qrButton} onPress={() => setShowQrScanner(true)}>
          <Text style={[styles.qrButtonText, { color: colors.accent }]}>SCAN QR CODE</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 32,
  },
  card: {
    borderRadius: 16,
    padding: 24,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    height: 48,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 14,
    borderWidth: 1,
  },
  error: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 8,
  },
  button: {
    height: 46,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  qrButton: {
    height: 46,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  qrButtonText: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
});

export default observer(LoginScreenInner);
```

- [ ] **Step 9: Create basic HomeScreen**

Create: `apps/mobile/app/(main)/index.tsx`
```tsx
import { View, Text, StyleSheet } from 'react-native';
import { useService, observer } from '@rabjs/react';
import { ThemeService } from '../../src/services/theme.service';

function HomeScreenInner() {
  const themeService = useService(ThemeService);
  const colors = themeService.colors;

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      <View style={[styles.header, { backgroundColor: colors.bgSurface }]}>
        <Text style={[styles.logo, { color: colors.textPrimary }]}>ZEN_SEND</Text>
      </View>
      <View style={styles.content}>
        <Text style={{ color: colors.textSecondary }}>Transfer list will appear here</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#EDEBE7',
  },
  logo: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default observer(HomeScreenInner);
```

- [ ] **Step 10: Verify build**

Run: `cd apps/mobile && pnpm typecheck`
Expected: No TypeScript errors

---

## Chunk 2: Authentication & Login Screen

### Overview
Implement full login screen with email/password and QR code scanning functionality. Update AuthService to support QR code token login.

### Files to Create/Modify

- Modify: `apps/mobile/src/services/auth.service.ts` - Add QR token login
- Modify: `apps/mobile/app/(auth)/login.tsx` - Full implementation with QR scanning
- Create: `apps/mobile/src/components/header/index.tsx` - Header component
- Create: `apps/mobile/src/lib/qr-scanner.tsx` - QR scanner component

### Steps

- [ ] **Step 1: Update AuthService with QR token support**

Modify: `apps/mobile/src/services/auth.service.ts`

Add after login method:
```typescript
async loginWithQrToken(token: string, serverUrl?: string): Promise<void> {
  // Exchange pair token for auth tokens
  // If serverUrl provided, use it instead of default API URL
  if (serverUrl) {
    const apiService = this.resolve(ApiService);
    // Create a temporary fetch to the specific server
    const response = await fetch(`${serverUrl}/api/auth/pair-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    if (!response.ok) throw new Error('Pair login failed');
    const result = await response.json();
    await this.saveTokens(result.data);
  } else {
    const tokens = await this.apiService.post<AuthTokens>('/api/auth/pair-login', { token });
    await this.saveTokens(tokens);
  }
}
```

**Server Dependency:** `POST /api/auth/pair-login` endpoint (implemented in Chunk 0).

- [ ] **Step 2: Create Header component**

Create: `apps/mobile/src/components/header/index.tsx`
```tsx
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useService, observer } from '@rabjs/react';
import { ThemeService } from '../../services/theme.service';
import { AuthService } from '../../services/auth.service';

function HeaderInner() {
  const router = useRouter();
  const themeService = useService(ThemeService);
  const authService = useService(AuthService);
  const colors = themeService.colors;

  const handleThemeToggle = () => {
    themeService.toggleTheme();
  };

  const handleLogout = async () => {
    await authService.logout();
    router.replace('/(auth)/login');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bgSurface, borderBottomColor: colors.borderSubtle }]}>
      <Text style={[styles.logo, { color: colors.textPrimary }]}>ZEN_SEND</Text>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.iconButton} onPress={handleThemeToggle}>
          <Text style={{ fontSize: 18 }}>{themeService.isDark ? '☀️' : '🌙'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={handleLogout}>
          <Text style={{ fontSize: 18 }}>🚪</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  logo: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    padding: 8,
  },
});

export default observer(HeaderInner);
```

- [ ] **Step 3: Create QR Scanner component**

Create: `apps/mobile/src/components/qr-scanner/index.tsx`
```tsx
import { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useService, observer } from '@rabjs/react';
import { ThemeService } from '../../services/theme.service';

interface QrScannerProps {
  visible: boolean;
  onClose: () => void;
  onScan: (result: { token: string; serverUrl: string }) => void;
}

function QrScannerInner({ visible, onClose, onScan }: QrScannerProps) {
  const themeService = useService(ThemeService);
  const colors = themeService.colors;
  const [permission, requestPermission] = useCameraPermissions();

  const handleBarCodeScanned = (data: string) => {
    // Parse QR code: https://zensend.dev/pair?token={TOKEN}
    const url = new URL(data);
    const token = url.searchParams.get('token');
    // Extract server base URL (e.g., https://zensend.dev)
    const serverUrl = `${url.protocol}//${url.host}`;
    if (token) {
      onScan({ token, serverUrl });
    }
  };

  if (!permission) {
    return null;
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} onRequestClose={onClose}>
        <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
          <Text style={[styles.message, { color: colors.textPrimary }]}>Camera permission required</Text>
          <TouchableOpacity style={styles.button} onPress={requestPermission}>
            <Text style={styles.buttonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} onRequestClose={onClose}>
      <View style={styles.container}>
        <CameraView
          style={styles.camera}
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
          onBarcodeScanned={({ data }) => handleBarCodeScanned(data)}
        />
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
          <View style={styles.frame} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#8B9A7D',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontWeight: '500',
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    color: 'white',
    fontSize: 20,
  },
  frame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#8B9A7D',
    borderRadius: 16,
  },
});

export default observer(QrScannerInner);
```

- [ ] **Step 4: Update LoginScreen with full implementation**

Modify: `apps/mobile/app/(auth)/login.tsx`

Add state and handlers for QR scanner:
```tsx
const [showQrScanner, setShowQrScanner] = useState(false);

const handleQrScan = async ({ token, serverUrl }: { token: string; serverUrl: string }) => {
  setShowQrScanner(false);
  setLoading(true);
  setError('');
  try {
    await authService.loginWithQrToken(token, serverUrl);
    router.replace('/(main)');
  } catch (err) {
    setError(err instanceof Error ? err.message : 'QR login failed');
  } finally {
    setLoading(false);
  }
};
```

Add QR Scanner component before closing View:
```tsx
<QrScanner
  visible={showQrScanner}
  onClose={() => setShowQrScanner(false)}
  onScan={handleQrScan}
/>
```

Change QR button onPress:
```tsx
<TouchableOpacity style={styles.qrButton} onPress={() => setShowQrScanner(true)}>
```

- [ ] **Step 5: Run typecheck**

Run: `cd apps/mobile && pnpm typecheck`
Expected: No errors

---

## Chunk 3: HomeService & Transfer List

### Overview
Create HomeService for managing transfer list state and implement the transfer list UI with filtering.

### Files to Create/Modify

- Create: `apps/mobile/src/services/home.service.ts` - Transfer list state management
- Modify: `apps/mobile/app/(main)/index.tsx` - Integrate HomeService
- Create: `apps/mobile/src/components/transfer-list/index.tsx` - Transfer list component
- Create: `apps/mobile/src/components/transfer-item/index.tsx` - Individual transfer item
- Create: `apps/mobile/src/components/filter-tabs/index.tsx` - Filter tabs component

### Steps

- [ ] **Step 1: Create HomeService**

Create: `apps/mobile/src/services/home.service.ts`
```typescript
import { Service } from '@rabjs/react';
import * as Clipboard from 'expo-clipboard';
import { ApiService } from './api.service';
import { SocketService } from './socket.service';
import type { TransferSession } from '@zen-send/shared';

export type TransferFilter = 'all' | 'file' | 'text';

// Upload progress tracking
export interface UploadProgress {
  sessionId: string;
  fileName: string;
  progress: number; // 0-100
  speed: number; // bytes per second
  eta: number; // seconds remaining
  status: 'uploading' | 'completed' | 'failed' | 'cancelled';
}

export class HomeService extends Service {
  transfers: TransferSession[] = [];
  filter: TransferFilter = 'all';
  loading = false;
  loadingMore = false;
  offset = 0;
  hasMore = true;
  searchQuery = '';
  uploadProgress: UploadProgress[] = [];

  private readonly LIMIT = 50;
  private abortControllers: Map<string, AbortController> = new Map();

  constructor() {
    super();
    this.loadTransfers();
  }

  get apiService() {
    return this.resolve(ApiService);
  }

  get socketService() {
    return this.resolve(SocketService);
  }

  get filteredTransfers() {
    let result = this.transfers;

    // Apply type filter
    if (this.filter !== 'all') {
      result = result.filter((t) => t.type === this.filter);
    }

    // Apply search filter (client-side)
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      result = result.filter((t) =>
        t.items.some((item) => item.name?.toLowerCase().includes(query))
      );
    }

    return result;
  }

  async loadTransfers() {
    this.loading = true;
    try {
      const response = await this.apiService.get<{ transfers: TransferSession[] }>(
        `/api/transfers?limit=${this.LIMIT}&offset=0`
      );
      this.transfers = response.transfers;
      this.offset = this.transfers.length;
      this.hasMore = response.transfers.length === this.LIMIT;
    } catch (err) {
      console.error('Failed to load transfers:', err);
    } finally {
      this.loading = false;
    }
  }

  async loadMore() {
    if (this.loadingMore || !this.hasMore) return;
    this.loadingMore = true;
    try {
      const response = await this.apiService.get<{ transfers: TransferSession[] }>(
        `/api/transfers?limit=${this.LIMIT}&offset=${this.offset}`
      );
      this.transfers = [...this.transfers, ...response.transfers];
      this.offset += response.transfers.length;
      this.hasMore = response.transfers.length === this.LIMIT;
    } catch (err) {
      console.error('Failed to load more transfers:', err);
    } finally {
      this.loadingMore = false;
    }
  }

  setFilter(filter: TransferFilter) {
    this.filter = filter;
  }

  setSearchQuery(query: string) {
    this.searchQuery = query;
  }

  addTransfer(transfer: TransferSession) {
    this.transfers = [transfer, ...this.transfers];
  }

  updateTransfer(transfer: TransferSession) {
    const index = this.transfers.findIndex((t) => t.id === transfer.id);
    if (index !== -1) {
      this.transfers[index] = transfer;
    }
  }

  // Read clipboard content
  async readClipboard(): Promise<string | null> {
    const text = await Clipboard.getStringAsync();
    return text || null;
  }

  // Delete a transfer
  async deleteTransfer(sessionId: string): Promise<void> {
    await this.apiService.deleteTransfer(sessionId);
    this.transfers = this.transfers.filter((t) => t.id !== sessionId);
  }

  // Send text
  async sendText(text: string): Promise<void> {
    const apiService = this.resolve(ApiService);
    await apiService.post('/api/transfers/init', {
      type: 'text',
      content: text,
      totalSize: new TextEncoder().encode(text).length,
      contentType: 'text/plain',
      sourceDeviceId: 'mobile-device',
    });
  }

  // Upload files with progress, retry, and cancellation
  async uploadFiles(documents: DocumentPicker.DocumentPickerAsset[]): Promise<void> {
    const apiService = this.resolve(ApiService);
    const socketService = this.resolve(SocketService);

    for (const doc of documents) {
      const sessionId = 'upload-' + Math.random().toString(36).slice(2);
      const abortController = new AbortController();
      this.abortControllers.set(sessionId, abortController);

      // Initialize progress
      const progressEntry: UploadProgress = {
        sessionId,
        fileName: doc.name || 'Unknown',
        progress: 0,
        speed: 0,
        eta: 0,
        status: 'uploading',
      };
      this.uploadProgress = [...this.uploadProgress, progressEntry];

      try {
        // Get file info
        const response = await fetch(doc.uri);
        const blob = await response.blob();
        const size = blob.size;

        // For files <= 10KB, send as text inline
        if (size <= 10 * 1024) {
          const content = await blob.text();
          await apiService.post('/api/transfers/init', {
            type: 'text',
            content,
            totalSize: size,
            contentType: doc.mimeType || 'application/octet-stream',
            sourceDeviceId: 'mobile-device',
          });
          this.updateProgress(sessionId, 100, size, size, 'completed');
        } else {
          // Initialize transfer for S3 upload
          const initResponse = await apiService.post<{
            sessionId: string;
            presignedUrls: string[];
            chunkSize: number;
          }>('/api/transfers/init', {
            type: 'file',
            fileName: doc.name,
            totalSize: size,
            contentType: doc.mimeType || 'application/octet-stream',
            chunkCount: Math.ceil(size / (1024 * 1024)),
            sourceDeviceId: 'mobile-device',
          });

          // Upload chunks with parallelization and retry
          const chunkSize = initResponse.chunkSize || 1024 * 1024;
          const chunks: { index: number; blob: Blob }[] = [];

          let offset = 0;
          let chunkIndex = 0;
          while (offset < size) {
            chunks.push({
              index: chunkIndex,
              blob: blob.slice(offset, offset + chunkSize),
            });
            offset += chunkSize;
            chunkIndex++;
          }

          // Parallel upload with retry (max 3 attempts per chunk)
          const MAX_RETRIES = 3;
          const uploadedChunks: boolean[] = new Array(chunks.length).fill(false);
          let uploadedBytes = 0;
          const startTime = Date.now();

          await Promise.all(
            chunks.map(async (chunk, idx) => {
              let attempts = 0;
              while (attempts < MAX_RETRIES && !uploadedChunks[idx]) {
                try {
                  const presignedUrl = initResponse.presignedUrls[idx];

                  // PUT to S3 presigned URL with abort support
                  await fetch(presignedUrl, {
                    method: 'PUT',
                    body: chunk.blob,
                    signal: abortController.signal,
                  });

                  // Report chunk
                  await apiService.post(`/api/transfers/${initResponse.sessionId}/chunks`, {
                    chunkIndex: chunk.index,
                    etag: 'etag',
                  });

                  uploadedChunks[idx] = true;
                  uploadedBytes += chunk.blob.size;

                  // Update progress
                  const elapsed = (Date.now() - startTime) / 1000;
                  const speed = uploadedBytes / elapsed;
                  const remaining = size - uploadedBytes;
                  const eta = remaining / speed;
                  const progress = (uploadedBytes / size) * 100;

                  this.updateProgress(sessionId, progress, speed, eta, 'uploading');
                } catch (err) {
                  if (err instanceof Error && err.name === 'AbortError') {
                    throw err;
                  }
                  attempts++;
                  if (attempts >= MAX_RETRIES) {
                    throw new Error(`Chunk ${idx} failed after ${MAX_RETRIES} retries`);
                  }
                }
              }
            })
          );

          // Complete transfer
          await apiService.post(`/api/transfers/${initResponse.sessionId}/complete`);

          // Notify via socket
          socketService.emitTransferNotify(initResponse.sessionId);

          this.updateProgress(sessionId, 100, 0, 0, 'completed');
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          this.updateProgress(sessionId, 0, 0, 0, 'cancelled');
        } else {
          this.updateProgress(sessionId, 0, 0, 0, 'failed');
          console.error('Upload error:', err);
        }
      } finally {
        this.abortControllers.delete(sessionId);
      }
    }
  }

  private updateProgress(
    sessionId: string,
    progress: number,
    speed: number,
    eta: number,
    status: UploadProgress['status']
  ) {
    this.uploadProgress = this.uploadProgress.map((p) =>
      p.sessionId === sessionId ? { ...p, progress, speed, eta, status } : p
    );
  }

  // Cancel an upload
  cancelUpload(sessionId: string) {
    const abortController = this.abortControllers.get(sessionId);
    if (abortController) {
      abortController.abort();
      this.updateProgress(sessionId, 0, 0, 0, 'cancelled');
    }
  }

  // Download transfer
  async downloadTransfer(transfer: TransferSession): Promise<string | null> {
    const apiService = this.resolve(ApiService);

    for (const item of transfer.items) {
      if (item.storageType === 'db' && item.content) {
        return item.content;
      } else if (item.storageType === 's3') {
        const { downloadUrl } = await apiService.get<{ downloadUrl: string }>(
          `/api/transfers/${transfer.id}/download`
        );
        return downloadUrl;
      }
    }
    return null;
  }
}
```

**Key features implemented:**
- **Clipboard reading** via `expo-clipboard`
- **Parallel chunk uploads** with Promise.all
- **Chunk retry** (max 3 attempts per chunk)
- **Upload progress** with speed and ETA calculation
- **Cancel upload** via AbortController
- **Delete transfer** method
- **storageType-aware download**

- [ ] **Step 2: Create FilterTabs component**

Create: `apps/mobile/src/components/filter-tabs/index.tsx`
```tsx
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useService, observer } from '@rabjs/react';
import { ThemeService } from '../../services/theme.service';
import { HomeService, TransferFilter } from '../../services/home.service';

const FILTERS: { label: string; value: TransferFilter }[] = [
  { label: 'ALL', value: 'all' },
  { label: 'FILES', value: 'file' },
  { label: 'TEXT', value: 'text' },
];

function FilterTabsInner() {
  const themeService = useService(ThemeService);
  const homeService = useService(HomeService);
  const colors = themeService.colors;

  return (
    <View style={styles.container}>
      {FILTERS.map((f) => {
        const isActive = homeService.filter === f.value;
        return (
          <TouchableOpacity
            key={f.value}
            style={[
              styles.tab,
              { backgroundColor: isActive ? colors.accentSoft : colors.bgElevated },
            ]}
            onPress={() => homeService.setFilter(f.value)}
          >
            <Text
              style={[
                styles.tabText,
                { color: isActive ? colors.accent : colors.textSecondary },
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default observer(FilterTabsInner);
```

- [ ] **Step 3: Create TransferItem component**

Create: `apps/mobile/src/components/transfer-item/index.tsx`
```tsx
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { observer } from '@rabjs/react';
import { useService } from '@rabjs/react';
import { ThemeService } from '../../services/theme.service';
import type { TransferSession } from '@zen-send/shared';

interface TransferItemProps {
  transfer: TransferSession;
  onPress: () => void;
}

function TransferItemInner({ transfer, onPress }: TransferItemProps) {
  const themeService = useService(ThemeService);
  const colors = themeService.colors;

  const firstItem = transfer.items[0];
  const isText = transfer.type === 'text';
  const icon = isText ? '✏️' : '📎';
  const name = isText ? firstItem.content?.slice(0, 30) || 'Text' : firstItem.name || 'File';
  const size = isText ? 'Text' : formatSize(firstItem.size);

  const timeAgo = getRelativeTime(transfer.createdAt);

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.bgSurface }]}
      onPress={onPress}
    >
      <View style={[styles.iconContainer, { backgroundColor: colors.bgElevated }]}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <View style={styles.content}>
        <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
          {name}
        </Text>
        <Text style={[styles.meta, { color: colors.textSecondary }]}>
          {size} · {timeAgo}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'JUST_NOW';
  if (minutes < 60) return `${minutes}M_AGO`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}H_AGO`;
  const days = Math.floor(hours / 24);
  return `${days}D_AGO`;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 20,
  },
  content: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontSize: 14,
    fontWeight: '500',
  },
  meta: {
    fontSize: 12,
    marginTop: 2,
  },
});

export default observer(TransferItemInner);
```

- [ ] **Step 4: Create TransferList component**

Create: `apps/mobile/src/components/transfer-list/index.tsx`
```tsx
import { FlatList, Text, TouchableOpacity, StyleSheet, ActivityIndicator, View } from 'react-native';
import { useService, observer } from '@rabjs/react';
import { ThemeService } from '../../services/theme.service';
import { HomeService } from '../../services/home.service';
import TransferItem from '../transfer-item';
import type { TransferSession } from '@zen-send/shared';

interface TransferListProps {
  onItemPress: (transfer: TransferSession) => void;
}

function TransferListInner({ onItemPress }: TransferListProps) {
  const themeService = useService(ThemeService);
  const homeService = useService(HomeService);
  const colors = themeService.colors;

  const renderItem = ({ item }: { item: TransferSession }) => (
    <TransferItem transfer={item} onPress={() => onItemPress(item)} />
  );

  const renderFooter = () => {
    if (!homeService.loadingMore) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator color={colors.textSecondary} />
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>📭</Text>
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No transfers yet</Text>
    </View>
  );

  if (homeService.loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <FlatList
      data={homeService.filteredTransfers}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      ListFooterComponent={renderFooter}
      ListEmptyComponent={renderEmpty}
      onEndReached={() => homeService.loadMore()}
      onEndReachedThreshold={0.5}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    paddingVertical: 8,
    flexGrow: 1,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
  },
});

export default observer(TransferListInner);
```

- [ ] **Step 5: Update HomeScreen to use HomeService**

Modify: `apps/mobile/app/(main)/index.tsx`
```tsx
import { useEffect, useState } from 'react';
import { View, StyleSheet, Modal } from 'react-native';
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
```

---

## Chunk 4: BottomToolbar & File Upload

### Overview
Implement the BottomToolbar component with file selection, text input, and drag-and-drop upload support. Create the file upload service.

### Files to Create/Modify

- Create: `apps/mobile/src/components/bottom-toolbar/index.tsx` - Bottom toolbar with file/text input
- Create: `apps/mobile/src/components/selected-files/index.tsx` - Selected files with progress
- Modify: `apps/mobile/src/services/home.service.ts` - Add upload handling
- Modify: `apps/mobile/app/(main)/index.tsx` - Integrate BottomToolbar

### Steps

- [ ] **Step 1: Create BottomToolbar component**

Create: `apps/mobile/src/components/bottom-toolbar/index.tsx`
```tsx
import { View, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
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
      const result = await DocumentPicker.getDocumentsAsync({
        type: '*/*',
        multiple: true,
      });
      if (result.documents) {
        await homeService.uploadFiles(result.documents);
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
```

- [ ] **Step 2: Note on HomeService**

**HomeService with all upload methods (sendText, uploadFiles, readClipboard, deleteTransfer, downloadTransfer, cancelUpload) is already implemented in Chunk 3.** The BottomToolbar will use these methods directly.

- [ ] **Step 3: Update HomeScreen to include BottomToolbar**

Modify: `apps/mobile/app/(main)/index.tsx`

Add BottomToolbar import and render it:
```tsx
import BottomToolbar from '../../src/components/bottom-toolbar';

// In HomeContentInner return statement, before closing View:
<BottomToolbar />

// Add to styles:
bottomToolbar: {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
},
```

---

## Chunk 5: File Download & Preview

### Overview
Implement file download with storageType awareness (db vs s3) and create PreviewModal for viewing files.

### Files to Create/Modify

- Create: `apps/mobile/src/components/preview-modal/index.tsx` - Preview modal component
- Modify: `apps/mobile/app/(main)/index.tsx` - Integrate preview modal

### Steps

- [ ] **Step 1: Note on download method**

**downloadTransfer method is already implemented in HomeService (Chunk 3).**

- [ ] **Step 2: Create PreviewModal component**

Create: `apps/mobile/src/components/preview-modal/index.tsx`
```tsx
import { Modal, View, Text, TouchableOpacity, StyleSheet, Image, ScrollView } from 'react-native';
import { useService, observer } from '@rabjs/react';
import { ThemeService } from '../../services/theme.service';
import type { TransferSession } from '@zen-send/shared';

interface PreviewModalProps {
  transfer: TransferSession | null;
  onClose: () => void;
  onDownload: (transfer: TransferSession) => void;
}

function PreviewModalInner({ transfer, onClose, onDownload }: PreviewModalProps) {
  const themeService = useService(ThemeService);
  const colors = themeService.colors;

  if (!transfer) return null;

  const firstItem = transfer.items[0];
  const isText = transfer.type === 'text';
  const isImage = firstItem.mimeType?.startsWith('image/');

  return (
    <Modal visible={!!transfer} onRequestClose={onClose} animationType="slide" transparent>
      <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
        <View style={[styles.container, { backgroundColor: colors.bgSurface }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
              {isText ? firstItem.content?.slice(0, 50) : firstItem.name}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {isImage && firstItem.downloadUrl ? (
              <Image
                source={{ uri: firstItem.downloadUrl }}
                style={styles.image}
                resizeMode="contain"
              />
            ) : isText ? (
              <Text style={[styles.textContent, { color: colors.textPrimary }]}>
                {firstItem.content}
              </Text>
            ) : (
              <View style={styles.fileInfo}>
                <Text style={styles.fileIcon}>📎</Text>
                <Text style={[styles.fileName, { color: colors.textPrimary }]}>{firstItem.name}</Text>
                <Text style={[styles.fileSize, { color: colors.textSecondary }]}>
                  {formatSize(firstItem.size)}
                </Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.bgElevated }]}
              onPress={onClose}
            >
              <Text style={[styles.actionText, { color: colors.textPrimary }]}>CLOSE</Text>
            </TouchableOpacity>
            {!isText && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.accent }]}
                onPress={() => onDownload(transfer)}
              >
                <Text style={[styles.actionText, { color: colors.bgPrimary }]}>DOWNLOAD</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EDEBE7',
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  closeIcon: {
    fontSize: 20,
    padding: 4,
  },
  content: {
    padding: 16,
    maxHeight: 400,
  },
  image: {
    width: '100%',
    height: 300,
  },
  textContent: {
    fontSize: 14,
    lineHeight: 22,
  },
  fileInfo: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  fileIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  fileSize: {
    fontSize: 12,
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#EDEBE7',
  },
  actionButton: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '500',
  },
});

export default observer(PreviewModalInner);
```

- [ ] **Step 3: Update HomeScreen to handle preview and download**

Modify: `apps/mobile/app/(main)/index.tsx`

Add download handler:
```tsx
const handleDownload = async (transfer: TransferSession) => {
  setPreviewTransfer(null);
  const url = await homeService.downloadTransfer(transfer);
  if (url) {
    // Use Linking to open URL or share
    // For now just show alert
  }
};
```

Add PreviewModal to render:
```tsx
<PreviewModal
  transfer={previewTransfer}
  onClose={() => setPreviewTransfer(null)}
  onDownload={handleDownload}
/>
```

---

## Chunk 6: Search & Local Notifications

### Overview
Implement search functionality and local notifications for new transfers.

### Files to Create/Modify

- Create: `apps/mobile/src/components/search-modal/index.tsx` - Search modal
- Modify: `apps/mobile/src/components/bottom-toolbar/index.tsx` - Add search button
- Create: `apps/mobile/src/services/notification.service.ts` - Local notifications

### Steps

- [ ] **Step 1: Create SearchModal component**

Create: `apps/mobile/src/components/search-modal/index.tsx`
```tsx
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

  return (
    <Modal visible={visible} onRequestClose={onClose} animationType="slide">
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
          <TouchableOpacity onPress={onClose}>
            <Text style={[styles.cancel, { color: colors.accent }]}>取消</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={homeService.filteredTransfers}
          renderItem={({ item }) => <TransferItem transfer={item} onPress={onClose} />}
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
```

- [ ] **Step 2: Update BottomToolbar to include search button and trigger**

Modify: `apps/mobile/src/components/bottom-toolbar/index.tsx`

Add search icon and props:
```tsx
interface BottomToolbarProps {
  onSearchPress: () => void;
}

function BottomToolbarInner({ onSearchPress }: BottomToolbarProps) {
  // ... existing code
  <TouchableOpacity style={styles.iconButton} onPress={onSearchPress}>
    <Text style={styles.iconText}>🔍</Text>
  </TouchableOpacity>
  // ...
}
```

- [ ] **Step 3: Create NotificationService**

Create: `apps/mobile/src/services/notification.service.ts`
```typescript
import { Service } from '@rabjs/react';
import * as Notifications from 'expo-notifications';

export class NotificationService extends Service {
  async requestPermission(): Promise<boolean> {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  }

  async showTransferNotification(title: string, body: string) {
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: null,
    });
  }
}
```

- [ ] **Step 4: Update SocketService to show notifications**

Modify: `apps/mobile/src/services/socket.service.ts`

Add notification handling:
```typescript
import { NotificationService } from './notification.service';

connect(deviceId: string, deviceName: string, deviceType: 'android' | 'ios') {
  // ... existing code

  this.socket?.on('transfer:new', async (data: { session: TransferSession }) => {
    const notificationService = this.resolve(NotificationService);
    await notificationService.showTransferNotification(
      '新传输',
      `收到来自设备的消息`
    );
  });
}
```

---

## Chunk 7: Polish & Integration

### Overview
Final integration, theming consistency, and empty states.

### Files to Modify

- Modify: `apps/mobile/src/components/transfer-list/index.tsx` - Empty state
- Modify: `apps/mobile/src/theme/tokens.ts` - Ensure all tokens used consistently
- Modify: `apps/mobile/app/(main)/index.tsx` - Final integration
- Create: `apps/mobile/src/components/empty-state/index.tsx` - Reusable empty state

### Steps

- [ ] **Step 1: Create EmptyState component**

Create: `apps/mobile/src/components/empty-state/index.tsx`
```tsx
import { View, Text, StyleSheet } from 'react-native';
import { useService, observer } from '@rabjs/react';
import { ThemeService } from '../../services/theme.service';

interface EmptyStateProps {
  icon: string;
  message: string;
}

function EmptyStateInner({ icon, message }: EmptyStateProps) {
  const themeService = useService(ThemeService);
  const colors = themeService.colors;

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  icon: {
    fontSize: 48,
    marginBottom: 12,
  },
  message: {
    fontSize: 14,
  },
});

export default observer(EmptyStateInner);
```

- [ ] **Step 2: Final build verification**

Run: `cd apps/mobile && pnpm typecheck`
Expected: No TypeScript errors

Run: `cd apps/mobile && pnpm lint`
Expected: No lint errors

---

## Dependencies Between Chunks

1. **Chunk 0 (Server)** - Can be done independently, implements `POST /api/auth/pair-login`
2. **Chunk 1** must be completed first (navigation foundation)
3. **Chunk 2** depends on Chunk 1 (auth flow), also needs Chunk 0 server endpoint
4. **Chunk 3** depends on Chunk 1 (HomeService)
5. **Chunk 4** depends on Chunk 3 (BottomToolbar uses HomeService)
6. **Chunk 5** depends on Chunk 3 (download uses HomeService)
7. **Chunk 6** depends on Chunk 4 (search modal integration)
8. **Chunk 7** is final polish, depends on all previous chunks

**Note:** Server and mobile can be developed in parallel. Mobile needs server endpoint from Chunk 0 to test QR login.

## Notes for Engineer

- The existing `app/index.tsx` uses old expo-router format - it will be replaced by the new `app/(auth)/login.tsx` and `app/(main)/index.tsx` structure
- `@zen-send/shared` provides `TransferSession` type - verify it's properly exported
- The socket events (`transfer:new`, etc.) require server-side support - coordinate with backend team
- **QR login requires `POST /api/auth/pair-login`** - implemented in Chunk 0 server-side
- `storageType` field support requires server-side schema update
- Socket.io requires JWT token in `auth.token` - SocketService passes this on connection
- Upload uses parallel chunk uploads with retry (max 3), progress tracking with speed/ETA
- Cancel upload uses AbortController - DELETE /api/transfers/:id should be called after cancellation

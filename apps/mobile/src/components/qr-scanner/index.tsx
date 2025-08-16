import { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
    try {
      const url = new URL(data);
      const token = url.searchParams.get('token');
      // Extract server base URL (e.g., https://zensend.dev)
      const serverUrl = `${url.protocol}//${url.host}`;
      if (token) {
        onScan({ token, serverUrl });
      }
    } catch {
      // Invalid URL format
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
            <Ionicons name="close" size={24} color="white" />
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

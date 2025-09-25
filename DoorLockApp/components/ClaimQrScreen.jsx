import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import { CameraKitCameraScreen } from 'react-native-camera-kit';

export default function ClaimQrScreen({ navigation }) {
  const [granted, setGranted] = useState(Platform.OS !== 'android');

  const ask = useCallback(async () => {
    if (Platform.OS !== 'android') return;
    const r = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
    );
    setGranted(r === PermissionsAndroid.RESULTS.GRANTED);
  }, []);

  React.useEffect(() => {
    ask();
  }, [ask]);

  const onRead = evt => {
    try {
      const text = evt?.nativeEvent?.codeStringValue || '';
      // expected: lock:<LOCK_ID>;code:<CLAIM_CODE>
      const m = text.match(/lock:(\d+);code:([A-Za-z0-9\-]+)/i);
      if (!m) throw new Error('Unrecognized QR');
      const lockId = m[1];
      const claimCode = m[2];
      navigation.replace('ClaimLock', { lockId, claimCode }); // prefill and submit there if you want
    } catch (e) {
      Alert.alert('QR Error', String(e.message || e));
    }
  };

  if (!granted) {
    return (
      <View style={s.c}>
        <Text style={s.t}>Camera permission required.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <CameraKitCameraScreen
        scanBarcode
        onReadCode={onRead}
        showFrame
        offsetForScannerFrame
        colorForScannerFrame="white"
      />
    </View>
  );
}

const s = StyleSheet.create({
  c: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0b0b0f',
  },
  t: { color: 'white' },
});

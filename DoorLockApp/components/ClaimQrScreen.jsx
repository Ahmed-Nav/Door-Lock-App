// DoorLockApp/components/ClaimQrScreen.jsx
import React, { useCallback } from 'react';
import {
  View,
  Alert,
  StyleSheet,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import { CameraScreen } from 'react-native-camera-kit';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

function parseClaim(text = '') {
  const s = String(text).trim();
  const kv = /lock\s*:\s*(\d+)\s*;\s*code\s*:\s*([A-Za-z0-9\-_=+/]+)/i.exec(s);
  if (kv) return { lockId: kv[1], claimCode: kv[2] };
  const bar = /^LOCK-(\d+)\|(.+)$/.exec(s);
  if (bar) return { lockId: bar[1], claimCode: bar[2].trim() };
  try {
    const j = JSON.parse(s);
    if (j?.lockId && j?.claimCode)
      return { lockId: j.lockId, claimCode: j.claimCode };
  } catch {}
  return null;
}

export default function ClaimQrScreen() {
  const nav = useNavigation();

  useFocusEffect(
    useCallback(() => {
      (async () => {
        if (Platform.OS === 'android') {
          const g = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.CAMERA,
          );
          if (g !== PermissionsAndroid.RESULTS.GRANTED) {
            Alert.alert('Camera permission required');
            nav.goBack();
          }
        }
      })();
    }, [nav]),
  );

  const onReadCode = ({ nativeEvent }) => {
    const text = nativeEvent?.codeStringValue || '';
    const parsed = parseClaim(text);
    if (!parsed)
      return Alert.alert('Invalid QR', 'Expected "lock:<id>;code:<claim>"');
    nav.navigate('Claim', {
      lockId: String(parsed.lockId),
      claimCode: String(parsed.claimCode),
    });
  };

  return (
    <View style={s.c}>
      <CameraScreen
        style={{ flex: 1 }}
        scanBarcode
        onReadCode={onReadCode}
        showFrame
      />
    </View>
  );
}

const s = StyleSheet.create({ c: { flex: 1, backgroundColor: 'black' } });

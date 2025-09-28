import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { View, Alert, StyleSheet, Text } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  Camera,
  useCameraDevice,
  useCodeScanner,
} from 'react-native-vision-camera';

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
  const device = useCameraDevice('back');
  const [hasPermission, setHasPermission] = useState(false);
  const [handled, setHandled] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      const isOK = (s) => s === 'authorized' || s === 'granted' || s === 'limited';
      (async () => {
        let s = await Camera.getCameraPermissionStatus();
        if (!isOK(s)) {
          s = await Camera.requestCameraPermission();
        }
        if (!mounted) return;
        if (!isOK(s)) {
          Alert.alert('Camera permission required');
          nav.goBack();
          return;
        }
        try { await Camera.getAvailableCameraDevices(); } catch {}
        if (mounted) setHasPermission(true);
      })();
      return () => {
        mounted = false;
        setHandled(false);
      };
    }, [nav]),
  );

  const codeScanner = useCodeScanner({
    codeTypes: ['qr', 'data-matrix', 'ean-13', 'code-128'], // include what you need
    onCodeScanned: codes => {
      if (handled) return;
      const value = codes?.[0]?.value;
      if (!value) return;
      const parsed = parseClaim(value);
      setHandled(true);
      if (!parsed) {
        Alert.alert('Invalid QR', 'Expected "lock:<id>;code:<claim>"');
        return;
      }
      nav.navigate('ClaimLock', {
        lockId: String(parsed.lockId),
        claimCode: String(parsed.claimCode),
      });
    },
  });

useEffect(() => {
  console.log('VC device:', device?.id, device?.position, device?.name);
}, [device]);
useEffect(() => {
  (async () => {
    const s = await Camera.getCameraPermissionStatus();
    console.log('VC permission status:', s);
  })();
}, []);

if (!hasPermission || !device) {
  return (
    <View style={[s.c, s.center]}>
      <Text style={s.msg}>
        {!hasPermission ? 'Waiting for camera permission…' : 'Opening camera…'}
      </Text>
    </View>
  );
}

  return (
    <View style={s.c}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={!handled}
        codeScanner={codeScanner}
      />
      <View style={s.frame} />
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: 'black' },
  center: { alignItems: 'center', justifyContent: 'center' },
  msg: { color: 'white', fontSize: 16 },
  frame: {
    position: 'absolute',
    top: '25%',
    left: '10%',
    right: '10%',
    bottom: '25%',
    borderWidth: 2,
    borderColor: 'white',
    borderRadius: 8,
  },
});

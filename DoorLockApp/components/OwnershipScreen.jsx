// components/OwnershipScreen.jsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import RNAndroidLocationEnabler from 'react-native-android-location-enabler';
import { scanAndConnectForLockId, sendOwnershipSet } from '../ble/bleManager';
import { useAuth } from '../auth/AuthContext';
import { getAdminPub } from '../services/apiService';

export default function OwnershipScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { token } = useAuth();

  
  const initialLockId = useMemo(
    () => (route?.params?.lockId ? String(route.params.lockId) : '101'),
    [route?.params?.lockId],
  );
  const initialClaimCode = useMemo(
    () =>
      route?.params?.claimCode ? String(route.params.claimCode) : 'ABC-123-XYZ',
    [route?.params?.claimCode],
  );

  const [lockId, setLockId] = useState(initialLockId);
  const [claimCode, setClaimCode] = useState(initialClaimCode);
  const [adminPubB64, setAdminPubB64] = useState(''); 
  const [status, setStatus] = useState('Idle');
  const [busy, setBusy] = useState(false);

  
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) return;
      try {
        const r = await getAdminPub(token); 
        if (!cancelled && r?.ok && r?.pub) setAdminPubB64(r.pub.trim());
        if (!cancelled && (!r?.ok || !r?.pub)) {
          console.log('admin pub missing from server', r);
        }
      } catch (e) {
        console.log(
          'getAdminPub failed:',
          e?.response?.data || e?.message || e,
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function ensurePermissions() {
    if (Platform.OS !== 'android') return;
    const perms = [
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    ];
    if (Platform.Version < 31) {
      perms.push(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
    }
    for (const p of perms) {
      const result = await PermissionsAndroid.request(p);
      if (result !== PermissionsAndroid.RESULTS.GRANTED) {
        throw new Error(`Missing permission: ${p}`);
      }
    }
    try {
      await RNAndroidLocationEnabler.promptForEnableLocationIfNeeded({
        interval: 10000,
        fastInterval: 5000,
      });
    } catch {
      
    }
  }

  const onSend = async () => {
    if (!lockId || !claimCode || !adminPubB64) {
      return Alert.alert(
        'Missing data',
        'Lock ID, Claim Code and Admin Pub are required.',
      );
    }
    setBusy(true);
    setStatus('Scanning…');
    let device = null;
    try {
      await ensurePermissions();
      device = await scanAndConnectForLockId(Number(lockId));
      setStatus('Sending ownership…');
      await sendOwnershipSet(device, {
        lockId: Number(lockId),
        adminPubB64: adminPubB64.trim(),
        claimCode: claimCode.trim(),
      });
      setStatus('Sent');
      Alert.alert(
        'Ownership OK',
        'Ownership sent. Check lock Serial for [OWNERSHIP_OK].',
        [
          {
            text: 'Next: Rebuild ACL',
            onPress: () =>
              navigation.navigate('RebuildACL', { lockId: String(lockId) }),
          },
          { text: 'Stay here' },
        ],
      );
    } catch (e) {
      setStatus('Error');
      Alert.alert('Error', String(e?.message || e));
    } finally {
      try {
        if (device) await device.cancelConnection();
      } catch {}
      setBusy(false);
    }
  };

  return (
    <View style={s.c}>
      <Text style={s.t}>Ownership</Text>
      <Text style={s.sub}>
        Program admin public key into Lock #{lockId || '?'}
      </Text>

      <TextInput
        style={s.in}
        value={lockId}
        onChangeText={setLockId}
        placeholder="Lock ID "
        keyboardType="numeric"
      />
      <TextInput
        style={s.in}
        value={claimCode}
        onChangeText={setClaimCode}
        placeholder="Claim Code "
        autoCapitalize="characters"
      />
      <TextInput
        style={[s.in, { height: 120, textAlignVertical: 'top' }]}
        multiline
        value={adminPubB64}
        onChangeText={setAdminPubB64}
        placeholder="Admin key"
      />

      <TouchableOpacity
        style={[s.btn, busy && s.btndis]}
        onPress={busy ? null : onSend}
      >
        <Text style={s.btxt}>{busy ? 'Working…' : 'Send Ownership'}</Text>
      </TouchableOpacity>

      <Text style={s.status}>Status: {status}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, padding: 16, gap: 12, backgroundColor: '#0b0b0f' },
  t: { color: 'white', fontSize: 22, fontWeight: '700' },
  sub: { color: '#bbb', marginBottom: 4 },
  in: {
    backgroundColor: '#1d1d25',
    color: 'white',
    borderRadius: 8,
    padding: 12,
  },
  btn: {
    backgroundColor: '#7B1FA2',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  btndis: { opacity: 0.6 },
  btxt: { color: 'white', fontWeight: '600' },
  status: { color: '#bbb', marginTop: 12 },
});

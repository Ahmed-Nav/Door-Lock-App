import React, { useState } from 'react';
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
import { scanAndConnectForLockId, sendOwnershipSet } from '../ble/bleManager';
import { Buffer } from 'buffer';
import RNAndroidLocationEnabler from 'react-native-android-location-enabler'; // optional if you have it

export default function OwnershipScreen() {
  const [lockId, setLockId] = useState('101');
  const [claimCode, setClaimCode] = useState('ABC-123-XYZ');
  const [adminPubB64, setAdminPubB64] = useState(
    'BGdSS9A48Td04b6ktXGn/oFXGn7TT7xT3PhxaPGBhC7Llmsd3CrVWv5io70m06DJkk74Ysgze4gWi+xt7T9WpPA=',
  ); 
  const [status, setStatus] = useState('Idle');

  async function ensurePermissions() {
    if (Platform.OS !== 'android') return;
    // Android 12+ BT runtime
    const perms = [
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    ];
    if (Platform.Version < 31) {
      perms.push(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
    }
    for (const p of perms) {
      const g = await PermissionsAndroid.request(p);
      if (g !== PermissionsAndroid.RESULTS.GRANTED)
        throw new Error('Missing permission: ' + p);
    }
    // Optional: enforce Location ON (some phones require it for BLE scan)
    try {
      await RNAndroidLocationEnabler.promptForEnableLocationIfNeeded({
        interval: 10000,
        fastInterval: 5000,
      });
    } catch {}
  }

  const onSend = async () => {
    try {
      setStatus('Scanning…');
      await ensurePermissions();
      const device = await scanAndConnectForLockId(Number(lockId));
      setStatus('Sending ownership…');
      await sendOwnershipSet(device, {
        lockId: Number(lockId),
        adminPubB64: adminPubB64.trim(),
        claimCode: claimCode.trim(),
      });
      setStatus('Sent. Watch Serial for [OWNERSHIP_OK]');
      Alert.alert(
        'OK',
        'Ownership sent. Check lock Serial for [OWNERSHIP_OK].',
      );
      await device.cancelConnection();
    } catch (e) {
      console.log(e);
      setStatus('Error');
      Alert.alert('Error', String(e?.message || e));
    }
  };

  return (
    <View style={s.c}>
      <Text style={s.t}>Send Ownership</Text>
      <TextInput
        style={s.in}
        value={lockId}
        onChangeText={setLockId}
        placeholder="Lock ID (e.g. 101)"
        keyboardType="numeric"
      />
      <TextInput
        style={s.in}
        value={claimCode}
        onChangeText={setClaimCode}
        placeholder="Claim Code (e.g. ABC-123-XYZ)"
      />
      <TextInput
        style={[s.in, { height: 120, textAlignVertical: 'top' }]}
        multiline
        value={adminPubB64}
        onChangeText={setAdminPubB64}
        placeholder="Paste ADMIN_PUB_RAW.b64 contents here"
      />
      <TouchableOpacity style={s.btn} onPress={onSend}>
        <Text style={s.btxt}>Send Ownership</Text>
      </TouchableOpacity>
      <Text style={s.status}>Status: {status}</Text>
    </View>
  );
}
const s = StyleSheet.create({
  c: { flex: 1, padding: 16, gap: 12, backgroundColor: '#0b0b0f' },
  t: { color: 'white', fontSize: 20, fontWeight: '700' },
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
  btxt: { color: 'white', fontWeight: '600' },
  status: { color: '#bbb', marginTop: 12 },
});

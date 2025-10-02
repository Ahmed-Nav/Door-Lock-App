// components/UnlockScreen.jsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import {
  scanAndConnectForLockId,
  getChallengeOnce,
  waitAuthResult,
  sendAuthResponse,
  safeDisconnect,
} from '../ble/bleManager';
import { signChallengeB64, getOrCreateDeviceKey } from '../lib/keys';
import { Buffer } from 'buffer';


const LOCK_ID = 101;



export default function UnlockScreen() {
  const [status, setStatus] = useState('Idle');

  async function ensurePerms() {
    if (Platform.OS !== 'android') return;
    const perms = [
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    ];
    if (Platform.Version < 31)
      perms.push(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
    for (const p of perms) {
      const g = await PermissionsAndroid.request(p);
      if (g !== PermissionsAndroid.RESULTS.GRANTED)
        throw new Error('Missing permission: ' + p);
    }
  }

  const go = async () => {
    let device;
    try {
      setStatus('Scanning…');
      await ensurePerms();
      device = await scanAndConnectForLockId(LOCK_ID);

      
      const resultP = waitAuthResult(device);

      
      setStatus('Waiting challenge…');
      const challenge = await getChallengeOnce(device);
      console.log(
        'challenge len=',
        challenge.length,
        ' hex=',
        Buffer.from(challenge).toString('hex'),
      );

      const { kid } = await getOrCreateDeviceKey();
      
      const sigB64 = await signChallengeB64(challenge);

      
      setStatus('Sending response…');
      await sendAuthResponse(device, kid, sigB64);

      const res = await resultP; 
      if (!res?.ok)
        throw new Error('Lock rejected: ' + (res?.err || 'unknown'));

      setStatus('UNLOCKED (20s)');
      Alert.alert('OK', 'Unlocked (20s). Watch Serial for [AUTH_OK].');
    } catch (e) {
      console.log('Unlock error:', e);
      setStatus('Error');
      Alert.alert('Error', String(e?.message || e));
    } finally {
      if (device) await safeDisconnect(device);
    }
  };

  return (
    <View style={s.c}>
      <Text style={s.t}>BLE Unlock</Text>
      <TouchableOpacity style={s.btn} onPress={go}>
        <Text style={s.btxt}>Unlock</Text>
      </TouchableOpacity>
      <Text style={s.status}>Status: {status}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, padding: 16, gap: 12, backgroundColor: '#0b0b0f' },
  t: { color: 'white', fontSize: 20, fontWeight: '700' },
  btn: {
    backgroundColor: '#7B1FA2',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  btxt: { color: 'white', fontWeight: '600' },
  status: { color: '#bbb', marginTop: 12 },
});

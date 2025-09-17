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
import { signRaw64 } from '../crypto/signP256';
import { Buffer } from 'buffer';

const LOCK_ID = 101;
const KID = 'naveed'; // must exist in ACL
const USER_PRIV_HEX =
  'a9c9c793ba0388e129c3467ed863e5d4e0eae83a7ea14b945bc6450d134c79d4'; // from user_priv.hex

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

      // Subscribe for AUTH_RESULT before we send anything
      const resultP = waitAuthResult(device);

      // Get the challenge robustly (read first, then monitor)
      setStatus('Waiting challenge…');
      const challenge = await getChallengeOnce(device); // Buffer length 20
      // Optional log for debugging
      console.log(
        'challenge len=',
        challenge.length,
        ' hex=',
        Buffer.from(challenge).toString('hex'),
      );

      if (
        !globalThis.crypto ||
        typeof globalThis.crypto.getRandomValues !== 'function'
      ) {
        throw new Error(
          'crypto.getRandomValues is missing. Did you import react-native-get-random-values in index.js?',
        );
      }
      console.log('Challenge hex:', Buffer.from(challenge).toString('hex'));
      const sigB64 = signRaw64(USER_PRIV_HEX, challenge);
      console.log('sig b64 len:', sigB64.length); // should print 88

      // Send response WITH response
      setStatus('Sending response…');
      await sendAuthResponse(device, KID, sigB64);

      // Wait for lock to reply on 0xA003
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

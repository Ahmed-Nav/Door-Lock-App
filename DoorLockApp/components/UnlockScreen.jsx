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
import { signRaw64, pubFromPrivB64, verifyLocal } from '../crypto/signP256';
import { Buffer } from 'buffer';

// ==== CONFIG ====
const LOCK_ID = 101;
const KID = 'naveed'; // must exist in ACL

// Your user private key (32-byte hex) generated in doorlock-keys/user_priv.hex:
const USER_PRIV_HEX =
  'a9c9c793ba0388e129c3467ed863e5d4e0eae83a7ea14b945bc6450d134c79d4';

// The *exact* base64 pub from ACL for kid "naveed":
const ACL_PUB_B64 =
  'BLHyCuPXq9hEJ/2dowQ/YZdis0NbftROqVOFU3MXFPyIiTuh4iO5+8QbFlzjW3uJ5jONmMK8ItJmU4FHq6KnnMY=';

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

      // Arm AUTH_RESULT monitor first
      const resultP = waitAuthResult(device);

      // Read one challenge (20 bytes: 16B nonce + 4B lockId BE)
      setStatus('Waiting challenge…');
      const challenge = await getChallengeOnce(device);
      console.log(
        'challenge len=',
        challenge.length,
        ' hex=',
        Buffer.from(challenge).toString('hex'),
      );

      // Sanity checks: key ↔ ACL must match, and local verify must pass
      const derivedPubB64 = pubFromPrivB64(USER_PRIV_HEX);
      console.log('derived PUB_B64:', derivedPubB64);
      console.log('ACL     PUB_B64:', ACL_PUB_B64);
      if (derivedPubB64 !== ACL_PUB_B64) {
        throw new Error('App user key does NOT match ACL pub for kid=' + KID);
      }

      const sigB64 = signRaw64(USER_PRIV_HEX, challenge);
      console.log('sig b64 len:', sigB64.length); // should be 88
      const okLocal = verifyLocal(sigB64, challenge, ACL_PUB_B64);
      console.log('local verify:', okLocal);
      if (!okLocal) throw new Error('Local ECDSA verify failed');

      // Send response and wait for lock verdict
      setStatus('Sending response…');
      await sendAuthResponse(device, KID, sigB64);

      const res = await resultP; // {ok:true}|{ok:false,err:"verify"}
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

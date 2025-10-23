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

import Toast from 'react-native-toast-message';
import { useRoute } from '@react-navigation/native';
import { useAuth } from '../auth/AuthContext';

export default function UnlockScreen() {
  const { role, signOut } = useAuth();
  const route = useRoute();
  const ctxLockId = route.params?.lockId ? String(route.params.lockId) : '101';

  const [status, setStatus] = useState('Idle');
  const [lockId, setLockId] = useState(ctxLockId);

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

      device = await scanAndConnectForLockId(Number(lockId));

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

      Toast.show({
        type: 'success',
        text1: 'Unlocked',
        text2: 'Door Unlocked Successfully',
      });
    } catch (e) {
      console.log('Unlock error:', e);

      setStatus('Error');

      Toast.show({
        type: 'error',
        text1: 'Invalid Code',
        text2: String(e?.message || e),
      });
    } finally {
      await safeDisconnect(device);
    }
  };

  return (
    <View style={s.c}>
      <Text style={s.t}>BLE Unlock</Text>

      <TouchableOpacity style={s.btn} onPress={go}>
        <Text style={s.btxt}>Unlock</Text>
      </TouchableOpacity>

      <Text style={s.status}>Status: {status}</Text>
      {role === 'user' && ( 
        <TouchableOpacity style={s.signOutBtn} onPress={signOut}>
          <Text style={s.signOutTxt}>Sign Out</Text>
        </TouchableOpacity>
      )}
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

  signOutBtn: { 
    backgroundColor: '#8B0000',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 40,
  },
  signOutTxt: {
    color: 'white',
    fontWeight: '600',
  },
});

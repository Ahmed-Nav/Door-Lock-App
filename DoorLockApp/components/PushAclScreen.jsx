// DoorLockApp/components/PushAclScreen.jsx

import React, { useEffect, useState } from 'react';

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  PermissionsAndroid,
  Platform,
} from 'react-native';

import { Buffer } from 'buffer';

import Toast from 'react-native-toast-message';

import { useRoute } from '@react-navigation/native';

import { useAuth } from '../auth/AuthContext';

import { scanAndConnectForLockId, sendAcl, safeDisconnect } from '../ble/bleManager';

import { fetchLatestAcl } from '../services/apiService';

export default function PushAclScreen() {
  const { token, role } = useAuth();

  const route = useRoute();

  const ctxLockId = route.params?.lockId ? String(route.params.lockId) : '101';

  const preEnvelope = route.params?.envelope || null;

  const [lockId, setLockId] = useState(ctxLockId);

  const [text, setText] = useState('');

  const [status, setStatus] = useState('Idle');

  async function ensurePermissions() {
    if (Platform.OS !== 'android') return;

    const perms = [
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,

      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
    ];

    if (Platform.Version < 31) {
      perms.push(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
    }

    for (const p of perms) {
      const g = await PermissionsAndroid.request(p);

      if (g !== PermissionsAndroid.RESULTS.GRANTED) {
        throw new Error(`Missing permission: ${p}`);
      }
    }
  }

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setStatus('Preparing ACL…');

        if (preEnvelope) {
          if (!alive) return;

          setText(JSON.stringify(preEnvelope, null, 2));

          setStatus('Ready');

          return;
        }

        if (!token) throw new Error('No token');

        const data = await fetchLatestAcl(token, Number(ctxLockId));

        if (!alive) return;

        if (!data?.ok || !data?.envelope) throw new Error('no-acl');

        setText(JSON.stringify(data.envelope, null, 2));

        setStatus('Ready');
      } catch (e) {
        setStatus('Download failed');

        const err =
          e?.response?.data?.err || e?.response?.data?.error || e?.message;

        if (err === 'no-acl') {
          Toast.show({
            type: 'info',
            text1: 'No ACL',
            text2: 'Build access first from the Groups screen.',
          });
        } else {
          Toast.show({ type: 'error', text1: 'Error', text2: String(err) });
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [ctxLockId, token, preEnvelope]);

  const push = async () => {
    try {
      if (role !== 'admin') {
        Toast.show({
          type: 'error',
          text1: 'Forbidden',
          text2: 'Only Admins can push ACLs.',
        });

        return;
      }

      if (!text.trim()) {
        Toast.show({
          type: 'error',
          text1: 'No ACL',
          text2: 'There is no ACL to send.',
        });

        return;
      }

      const envelope = JSON.parse(text);

      const payloadLockId = Number(envelope?.payload?.lockId);

      if (payloadLockId !== Number(lockId)) {
        Toast.show({
          type: 'error',
          text1: 'Invalid ACL',
          text2: `payload.lockId (${payloadLockId}) !== input (${lockId})`,
        });

        return;
      }

      const sigBytes = Buffer.from(
        String(envelope?.sig || ''),

        'base64',
      ).length;

      const jsonStr = JSON.stringify(envelope);

      console.log('[ACL] sig bytes:', sigBytes, 'json bytes:', jsonStr.length);

      for (const u of envelope?.payload?.users || []) {
        const pb = Buffer.from(String(u?.pub || ''), 'base64');

        console.log(`kid ${u?.kid}: pub bytes=${pb.length} first=${pb[0]}`);
      }

      setStatus('Scanning…');

      await ensurePermissions();

      const device = await scanAndConnectForLockId(Number(lockId));

      setStatus('Sending ACL…');

      await sendAcl(device, envelope);

      setStatus('ACL Sent');

      Toast.show({
        type: 'success',
        text1: 'Done',
        text2: 'ACL sent to the lock.',
      });
    } catch (error) {
      console.log(error);

      setStatus('ACL Failed');

      Toast.show({
        type: 'error',
        text1: 'ACL Failed',
        text2: String(error?.message || error),
      });
    } finally {
      await safeDisconnect(device);
    }
  };

  return (
    <View style={s.c}>
      <Text style={s.t}>Push ACL</Text>

      <TextInput
        style={s.in}
        value={lockId}
        editable={false}
        placeholder="Lock ID"
        keyboardType="numeric"
      />

      <TouchableOpacity
        style={[s.btn, { backgroundColor: '#7B1FA2' }]}
        onPress={push}
      >
        <Text style={s.btxt}>Send to Lock</Text>
      </TouchableOpacity>

      <TextInput
        style={s.box}
        value={text}
        editable={false}
        placeholder="ACL_envelope.json"
        multiline
      />

      <Text style={s.status}>
        Status: {status}
        {'\n'}Envelope bytes: {text?.length || 0}
      </Text>
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

  box: {
    backgroundColor: '#1d1d25',

    color: 'white',

    borderRadius: 8,

    padding: 12,

    height: 220,

    textAlignVertical: 'top',
  },

  btn: {
    padding: 14,

    borderRadius: 10,

    alignItems: 'center',

    backgroundColor: '#444',
  },

  btxt: { color: 'white', fontWeight: '600' },

  status: { color: '#bbb', marginTop: 12 },
});

// components/PushAclScreen.jsx
import React, { useEffect, useState } from 'react';
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
import * as Keychain from 'react-native-keychain';
import { Buffer } from 'buffer';
import { scanAndConnectForLockId, sendAcl } from '../ble/bleManager';
import { fetchLatestAcl } from '../services/apiService';

// Strip whitespace inside base64 strings
const stripWS = s => (typeof s === 'string' ? s.replace(/\s+/g, '') : s);
const sanitizeEnvelope = env => {
  const out = JSON.parse(JSON.stringify(env));
  out.sig = stripWS(out.sig);
  if (out?.payload?.users?.length) {
    out.payload.users = out.payload.users.map(u => ({
      ...u,
      pub: stripWS(u.pub),
    }));
  }
  return out;
};

// Quick validation before BLE
const validateEnvelope = env => {
  try {
    const sigLen = Buffer.from(env.sig || '', 'base64').length;
    if (sigLen !== 64) return 'sig must be 64 bytes base64 (r||s).';
    for (const u of env?.payload?.users || []) {
      const pb = Buffer.from(u.pub || '', 'base64');
      if (pb.length !== 65 || pb[0] !== 0x04) {
        return `pub for kid "${u.kid}" must be uncompressed (0x04 + 64 = 65 bytes).`;
      }
    }
    return null;
  } catch {
    return 'Invalid base64 in sig/pub.';
  }
};

export default function PushAclScreen() {
  const [lockId, setLockId] = useState('101');
  const [text, setText] = useState('');
  const [status, setStatus] = useState('Idle');
  const [token, setToken] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const creds = await Keychain.getGenericPassword();
        if (!creds) return;
        const auth = JSON.parse(creds.password);
        const raw =
          auth.idToken ||
          auth.accessToken ||
          auth.id_token ||
          auth.access_token;
        setToken(raw || null);
      } catch {}
    })();
  }, []);

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
      if (g !== PermissionsAndroid.RESULTS.GRANTED)
        throw new Error(`Missing permission: ${p}`);
    }
  }

  const getFromServer = async () => {
    try {
      if (!token)
        return Alert.alert('Not signed in', 'Sign in as admin first.');
      setStatus('Downloading ACL…');
      const data = await fetchLatestAcl(token, Number(lockId));
      if (!data?.ok || !data?.envelope) throw new Error(data?.err || 'no-acl');
      setText(JSON.stringify(data.envelope, null, 2));
      setStatus('Downloaded');
      Alert.alert('OK', 'Latest ACL downloaded from server.');
    } catch (e) {
      setStatus('Download failed');
      const msg = String(e?.response?.data?.err || e?.message || e);
      Alert.alert('Error', msg === 'forbidden' ? 'Admins only.' : msg);
    }
  };

  const push = async () => {
    try {
      if (!text.trim()) return Alert.alert('Paste or fetch ACL envelope first');
      await ensurePermissions();

      // Parse + sanitize + validate
      const env = sanitizeEnvelope(JSON.parse(text));
      const payloadLockId = Number(env?.payload?.lockId);
      if (payloadLockId !== Number(lockId)) {
        return Alert.alert(
          'Invalid ACL',
          `payload.lockId (${payloadLockId}) does not match input (${lockId}).`,
        );
      }
      const vErr = validateEnvelope(env);
      if (vErr) return Alert.alert('Invalid ACL', vErr);

      // Helpful dev prints
      console.log('sig bytes:', Buffer.from(env.sig, 'base64').length);
      for (const u of env.payload.users || []) {
        const pb = Buffer.from(u.pub, 'base64');
        console.log(`kid ${u.kid}: pub bytes=${pb.length} first=${pb[0]}`);
      }

      setStatus('Scanning…');
      const device = await scanAndConnectForLockId(Number(lockId));

      setStatus('Sending ACL…');
      await sendAcl(device, env);

      await device.cancelConnection();
      setStatus('ACL Sent');
      Alert.alert('ACL Sent');
    } catch (error) {
      console.log(error);
      setStatus('ACL Failed');
      Alert.alert('ACL Failed', String(error?.message || error));
    }
  };

  return (
    <View style={s.c}>
      <Text style={s.t}>Push ACL (Admin only)</Text>
      <TextInput
        style={s.in}
        value={lockId}
        onChangeText={setLockId}
        placeholder="Lock ID"
        keyboardType="numeric"
      />

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity style={[s.btn, { flex: 1 }]} onPress={getFromServer}>
          <Text style={s.btxt}>Get Latest From Server</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.btn, { backgroundColor: '#7B1FA2', flex: 1 }]}
          onPress={push}
        >
          <Text style={s.btxt}>Send to Lock</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={s.box}
        value={text}
        onChangeText={setText}
        placeholder="ACL_envelope.json"
        multiline
      />
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
  box: {
    backgroundColor: '#1d1d25',
    color: 'white',
    borderRadius: 8,
    padding: 12,
    height: 220,
    textAlignVertical: 'top',
  },
  btn: {
    backgroundColor: '#444',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  btxt: { color: 'white', fontWeight: '600' },
  status: { color: '#bbb', marginTop: 12 },
});

// components/PushAclScreen.jsx
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
import { scanAndConnectForLockId, sendAcl } from '../ble/bleManager';
import { fetchLatestAcl } from '../services/apiService';
import { Buffer } from 'buffer';

// Remove all whitespace from base64 fields
function sanitizeEnvelope(env) {
  const out = JSON.parse(JSON.stringify(env)); // deep clone
  const strip = s => (typeof s === 'string' ? s.replace(/\s+/g, '') : s);

  out.sig = strip(out.sig);
  if (out.payload?.users?.length) {
    out.payload.users = out.payload.users.map(u => ({
      ...u,
      pub: strip(u.pub),
    }));
  }
  return out;
}

// Validate sizes: sig=64 bytes, pub=65 bytes starting with 0x04
function validateEnvelope(env) {
  try {
    const sigLen = Buffer.from(env.sig, 'base64').length;
    if (sigLen !== 64) return 'sig must be 64 bytes (base64 length 88).';

    for (const u of env.payload?.users || []) {
      const pb = Buffer.from(u.pub, 'base64');
      if (pb.length !== 65 || pb[0] !== 0x04) {
        return `pub for kid="${u.kid}" must be uncompressed (0x04 + 64 = 65 bytes).`;
      }
    }
  } catch {
    return 'Invalid base64 in sig/pub.';
  }
  return null;
}


export default function PushAclScreen() {
  const [lockId, setLockId] = useState('101');
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
      if (g !== PermissionsAndroid.RESULTS.GRANTED)
        throw new Error(`Missing permission: ${p}`);
    }
  }

  const getFromServer = async () => {
    try {
      setStatus('Downloading ACL…');
      const data = await fetchLatestAcl(Number(lockId));
      if (!data?.ok || !data?.envelope) throw new Error('no-acl');
      setText(JSON.stringify(data.envelope, null, 2));
      setStatus('Downloaded');
      Alert.alert('OK', 'Latest ACL downloaded from server.');
    } catch (e) {
      setStatus('Download failed');
      Alert.alert('Error', String(e?.message || e));
    }
  };

  const push = async () => {
    try {
      if (!text.trim()) {
        Alert.alert('Paste or fetch ACL envelope first');
        return;
      }
      setStatus('Scanning…');
      await ensurePermissions();

      const envelope = JSON.parse(text);
      const payloadLockId = Number(envelope?.payload?.lockId);
      if (payloadLockId !== Number(lockId)) {
        Alert.alert(
          'Invalid ACL',
          `payload.lockId (${payloadLockId}) does not match input (${lockId}).`,
        );
        return;
      }

      // (Optional) quick, helpful prints while iterating
      console.log(
        'sig bytes:',
        Buffer.from(String(envelope?.sig || ''), 'base64').length,
      );
      for (const u of envelope?.payload?.users || []) {
        const pub = Buffer.from(String(u?.pub || ''), 'base64');
        console.log(`kid ${u?.kid}: pub bytes=${pub.length} first=${pub[0]}`);
      }

      const device = await scanAndConnectForLockId(Number(lockId));
      setStatus('Sending ACL…');
      await sendAcl(device, envelope);
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
      <Text style={s.t}>Push ACL</Text>
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

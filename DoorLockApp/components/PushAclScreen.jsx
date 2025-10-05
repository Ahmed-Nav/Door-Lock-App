// DoorLockApp/components/PushAclScreen.jsx
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
import { Buffer } from 'buffer';
import { useRoute } from '@react-navigation/native';
import { useAuth } from '../auth/AuthContext';
import { scanAndConnectForLockId, sendAcl } from '../ble/bleManager';
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
          Alert.alert('No ACL', 'Build access first from the Groups screen.');
        } else {
          Alert.alert('Error', String(err));
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
        Alert.alert('Forbidden', 'Only Admins can push ACLs.');
        return;
      }
      if (!text.trim()) {
        Alert.alert('No ACL', 'There is no ACL to send.');
        return;
      }

      const envelope = JSON.parse(text);
      const payloadLockId = Number(envelope?.payload?.lockId);
      if (payloadLockId !== Number(lockId)) {
        Alert.alert(
          'Invalid ACL',
          `payload.lockId (${payloadLockId}) !== input (${lockId})`,
        );
        return;
      }

      
      console.log(
        'sig bytes:',
        Buffer.from(String(envelope?.sig || ''), 'base64').length,
      );
      for (const u of envelope?.payload?.users || []) {
        const pb = Buffer.from(String(u?.pub || ''), 'base64');
        console.log(`kid ${u?.kid}: pub bytes=${pb.length} first=${pb[0]}`);
      }

      setStatus('Scanning…');
      await ensurePermissions();
      const device = await scanAndConnectForLockId(Number(lockId));

      setStatus('Sending ACL…');
      await sendAcl(device, envelope);
      await device.cancelConnection();

      setStatus('ACL Sent');
      Alert.alert('Done', 'ACL sent to the lock.');
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

      <TouchableOpacity
        style={[s.btn, { backgroundColor: '#7B1FA2' }]}
        onPress={push}
      >
        <Text style={s.btxt}>Send to Lock</Text>
      </TouchableOpacity>

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
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#444',
  },
  btxt: { color: 'white', fontWeight: '600' },
  status: { color: '#bbb', marginTop: 12 },
});

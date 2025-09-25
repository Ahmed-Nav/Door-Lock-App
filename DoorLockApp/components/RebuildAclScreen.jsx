import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { Buffer } from 'buffer';
import Clipboard from '@react-native-clipboard/clipboard';
import { useAuth } from '../auth/AuthContext';
import { rebuildAcl } from '../services/apiService';

export default function RebuildAclScreen() {
  const { token, role } = useAuth();
  const [lockId, setLockId] = useState('101');
  const [status, setStatus] = useState('Idle');
  const [result, setResult] = useState(null);

  const go = async () => {
    try {
      if (role !== 'admin') return Alert.alert('Forbidden', 'Admin only.');
      setStatus('Rebuilding…');
      const res = await rebuildAcl(token, Number(lockId));
      if (!res?.ok) throw new Error(res?.err || 'rebuild-failed');
      setResult(res);
      setStatus('Done');
    } catch (e) {
      setStatus('Failed');
      Alert.alert(
        'Rebuild failed',
        String(e?.response?.data?.err || e?.message || e),
      );
    }
  };

  const copyJson = () => {
    try {
      if (!result?.envelope) return;
      Clipboard.setString(JSON.stringify(result.envelope, null, 2));
      Alert.alert('Copied', 'ACL envelope copied to clipboard');
    } catch {}
  };

  const sigLen = result?.envelope?.sig
    ? Buffer.from(result.envelope.sig, 'base64').length
    : 0;
  const users = result?.envelope?.payload?.users || [];
  const version = result?.envelope?.payload?.version;

  return (
    <View style={s.c}>
      <Text style={s.t}>Rebuild ACL</Text>
      <TextInput
        style={s.in}
        value={lockId}
        onChangeText={setLockId}
        keyboardType="numeric"
        placeholder="Lock ID"
      />
      <TouchableOpacity style={s.btn} onPress={go}>
        <Text style={s.bt}>Rebuild on Server</Text>
      </TouchableOpacity>
      <Text style={s.status}>Status: {status}</Text>

      {result && (
        <ScrollView style={s.card}>
          <Text style={s.h}>Summary</Text>
          <Text style={s.p}>version: {version}</Text>
          <Text style={s.p}>sig bytes: {sigLen}</Text>
          <Text style={s.h}>Users ({users.length})</Text>
          {users.map((u, i) => (
            <Text key={i} style={s.p}>
              - {u.kid}
              {u.email ? ` (${u.email})` : ''}
            </Text>
          ))}

          <TouchableOpacity
            style={[s.btn, { marginTop: 12 }]}
            onPress={copyJson}
          >
            <Text style={s.bt}>Copy JSON</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
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
  bt: { color: 'white', fontWeight: '600' },
  status: { color: '#bbb', marginTop: 12 },
  card: {
    backgroundColor: '#14141c',
    borderRadius: 10,
    padding: 12,
    maxHeight: 280,
  },
  h: { color: '#fff', fontWeight: '700', marginTop: 6 },
  p: { color: '#ccc', marginTop: 4 },
});

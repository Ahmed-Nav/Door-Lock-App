// DoorLockApp/components/ClaimLockScreen.jsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { claimLockOnServer } from '../services/apiService';

export default function ClaimLockScreen() {
  const { token, role, email } = useAuth();
  const [lockId, setLockId] = useState('101');
  const [claimCode, setClaimCode] = useState('ABC-123-XYZ');
  const [status, setStatus] = useState('Idle');

  const doClaim = async () => {
    try {
      if (role !== 'admin') {
        Alert.alert('Forbidden', 'Only Admins can claim locks.');
        return;
      }
      setStatus('Claiming on server…');
      const res = await claimLockOnServer(token, {
        lockId: Number(lockId),
        claimCode,
      });
      if (!res?.ok) throw new Error(res?.err || 'claim-failed');
      setStatus('Claimed');
      Alert.alert('Claimed', `Lock ${lockId} claimed on server.`);
    } catch (e) {
      setStatus('Claim Failed');
      const err = e?.response?.data?.err || e?.message;
      if (err === 'already-claimed') {
        Alert.alert('Already claimed', 'This lock has already been claimed.');
      } else if (err === 'bad-claim') {
        Alert.alert('Invalid code', 'The claim code is incorrect.');
      } else {
        Alert.alert('Claim failed', String(err));
      }
    }
  };

  return (
    <View style={s.c}>
      <Text style={s.t}>Claim a Lock</Text>
      <Text style={s.label}>
        {email ? `Signed in as ${email} (${role})` : 'Not signed in'}
      </Text>

      <TextInput
        style={s.in}
        placeholder="Lock ID"
        keyboardType="numeric"
        value={lockId}
        onChangeText={setLockId}
      />
      <TextInput
        style={s.in}
        placeholder="Claim Code"
        value={claimCode}
        onChangeText={setClaimCode}
      />

      <TouchableOpacity
        style={[s.btn, { backgroundColor: '#7B1FA2' }]}
        onPress={doClaim}
      >
        <Text style={s.bt}>Claim</Text>
      </TouchableOpacity>

      <Text style={s.status}>Status: {status}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, padding: 16, gap: 12, backgroundColor: '#0b0b0f' },
  t: { color: 'white', fontSize: 20, fontWeight: '700' },
  label: { color: 'white' },
  in: {
    backgroundColor: '#1d1d25',
    color: 'white',
    borderRadius: 8,
    padding: 12,
  },
  btn: {
    backgroundColor: '#444',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  bt: { color: 'white', fontWeight: '600' },
  status: { color: '#bbb', marginTop: 12 },
});

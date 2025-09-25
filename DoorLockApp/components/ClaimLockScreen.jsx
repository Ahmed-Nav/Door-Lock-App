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
import { claimLockOnServer /* , getAdminPub */ } from '../services/apiService';

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
      if (!token) {
        Alert.alert('Please sign in again');
        return;
      }
      if (!lockId.trim() || !claimCode.trim()) {
        Alert.alert('Missing data', 'Enter Lock ID and Claim Code.');
        return;
      }

      setStatus('Claiming on server…');

      // --- If your firmware needs adminPub at claim time (optional) ---
      // const pubRes = await getAdminPub(token);
      // if (!pubRes?.ok || !pubRes?.pub) throw new Error('no-admin-pub');
      // const adminPubB64 = pubRes.pub;
      // (send adminPubB64 via BLE owner-write if your on-device claim requires it)

      const res = await claimLockOnServer(token, {
        lockId: Number(lockId),
        claimCode,
      });

      if (!res?.ok) {
        const err = res?.err || 'claim-failed';
        throw new Error(err);
      }

      setStatus('Claimed');
      Alert.alert('Claimed', `Lock ${lockId} claimed on server.`);
    } catch (e) {
      setStatus('Claim Failed');
      const err = e?.response?.data?.err || e?.message;

      // Friendly messages for common cases
      if (err === 'already-claimed') {
        Alert.alert('Already claimed', 'This lock has already been claimed.');
      } else if (err === 'bad-claim') {
        Alert.alert('Invalid code', 'The claim code is incorrect.');
      } else if (err === 'lock-not-found') {
        Alert.alert('Not found', 'This lock is not registered on server.');
      } else if (err === 'missing-fields' || err === 'bad-lockId') {
        Alert.alert('Invalid input', 'Check Lock ID and claim code.');
      } else if (err === 'Unauthorized' || err === 'No token') {
        Alert.alert('Sign in again', 'Your session expired.');
      } else if (err === 'forbidden') {
        Alert.alert('Forbidden', 'Admin access required.');
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

// DoorLockApp/components/ClaimLockScreen.jsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { useRoute, useNavigation } from '@react-navigation/native'; // <-- add
import { claimLockOnServer } from '../services/apiService';

export default function ClaimLockScreen() {
  const { token, role, email } = useAuth();
  const route = useRoute(); // <-- add
  const navigation = useNavigation(); // <-- add

  const [lockId, setLockId] = useState('');
  const [claimCode, setClaimCode] = useState('');
  const [status, setStatus] = useState('Idle');

  // Prefill when returning from scanner
  useEffect(() => {
    const p = route?.params || {};
    if (p?.lockId) setLockId(String(p.lockId));
    if (p?.claimCode) setClaimCode(String(p.claimCode));
  }, [route?.params]);

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
      if (err === 'already-claimed')
        Alert.alert('Already claimed', 'This lock has already been claimed.');
      else if (err === 'bad-claim')
        Alert.alert('Invalid code', 'The claim code is incorrect.');
      else Alert.alert('Claim failed', String(err));
    }
  };

  return (
    <View style={s.c}>
      <Text style={s.t}>Claim a lock</Text>
      <Text style={s.label}>
        {email ? `Signed in as ${email} (${role})` : 'Not signed in'}
      </Text>

      {/* NEW: Scan button */}
      <TouchableOpacity
        style={[s.btn, { backgroundColor: '#7B1FA2' }]}
        onPress={() => navigation.navigate('ClaimQR')}
      >
        <Text style={s.bt}>Scan QR</Text>
      </TouchableOpacity>

      <TextInput
        style={s.in}
        placeholder="Lock ID"
        keyboardType="numeric"
        value={lockId}
        onChangeText={setLockId}
        placeholderTextColor="#888"
      />
      <TextInput
        style={s.in}
        placeholder="Claim Code"
        value={claimCode}
        onChangeText={setClaimCode}
        placeholderTextColor="#888"
      />

      <TouchableOpacity style={s.btn} onPress={doClaim}>
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
    borderRadius: 10,
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

// DoorLockApp/components/ClaimLockScreen.jsx
import React, { useEffect, useState } from 'react';
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

export default function ClaimLockScreen({ navigation, route }) {
  const { token, role, email } = useAuth();

  // Pre-fill from QR (or defaults)
  const [lockId, setLockId] = useState(String(route?.params?.lockId ?? '101'));
  const [claimCode, setClaimCode] = useState(
    String(route?.params?.claimCode ?? 'ABC-123-XYZ'),
  );
  const [status, setStatus] = useState('Idle');

  // Update fields if new params arrive (e.g., after scanning another QR)
  useEffect(() => {
    if (route?.params?.lockId != null) {
      setLockId(String(route.params.lockId));
    }
    if (route?.params?.claimCode != null) {
      setClaimCode(String(route.params.claimCode));
    }
  }, [route?.params?.lockId, route?.params?.claimCode]);

  const scanQr = () => {
    navigation.navigate('ClaimQr');
  };

  const doClaim = async () => {
    try {
      if (role !== 'admin') {
        Alert.alert('Forbidden', 'Only admins can claim locks.');
        return;
      }
      if (!token) {
        Alert.alert('Not signed in', 'Please sign in again.');
        return;
      }
      const lid = Number(lockId);
      if (!lid || Number.isNaN(lid)) {
        Alert.alert('Invalid Lock ID', 'Please enter a valid number.');
        return;
      }
      if (!claimCode.trim()) {
        Alert.alert('Missing Claim Code', 'Please enter the claim code.');
        return;
      }

      setStatus('Claiming…');
      const res = await claimLockOnServer(
        { lockId: lid, claimCode: claimCode.trim() },
        token,
      );

      if (res?.ok) {
        setStatus('Claimed');
        Alert.alert('Success', `Lock ${lid} claimed on server.`);
        return;
      }

      // If backend returned ok:false but 200 (unlikely), handle here:
      throw new Error(res?.err || 'claim-failed');
    } catch (e) {
      setStatus('Claim Failed');
      // Friendly error mapping
      const err = e?.response?.data?.err || e?.message || e;
      if (err === 'already-claimed' || e?.response?.status === 409) {
        Alert.alert('Already Claimed', 'This lock is already claimed.');
      } else if (err === 'bad-claim' || e?.response?.status === 403) {
        Alert.alert('Invalid Code', 'The claim code is incorrect.');
      } else if (err === 'lock-not-found' || e?.response?.status === 404) {
        Alert.alert('Not Found', 'No lock with that ID exists.');
      } else if (err === 'forbidden') {
        Alert.alert('Forbidden', 'Admin access is required.');
      } else if (
        err === 'Unauthorized' ||
        err === 'No token' ||
        e?.response?.status === 401
      ) {
        Alert.alert('Sign in again', 'Your session expired.');
      } else {
        Alert.alert('Claim Error', String(err));
      }
    }
  };

  return (
    <View style={s.c}>
      <Text style={s.t}>Claim a Lock</Text>
      <Text style={s.label}>
        {email ? `Signed in as ${email}` : 'Signed in'}
      </Text>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity style={[s.btn, { flex: 1 }]} onPress={scanQr}>
          <Text style={s.bt}>Scan QR</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.btn, { backgroundColor: '#7B1FA2', flex: 1 }]}
          onPress={doClaim}
        >
          <Text style={s.bt}>Claim</Text>
        </TouchableOpacity>
      </View>

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
        autoCapitalize="characters"
      />

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

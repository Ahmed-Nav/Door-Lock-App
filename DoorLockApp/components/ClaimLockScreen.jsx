// components/ClaimLockScreen.jsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { authorize } from 'react-native-app-auth';
import * as Keychain from 'react-native-keychain';
import jwtDecode from 'jwt-decode';
import { syncUserToBackend, claimLockOnServer } from '../services/apiService';

const OAUTH_CONFIG = {
  clientId: '2JbPx2I2fknWbmf8',
  redirectUrl: 'com.doorlockapp://callback',
  scopes: ['openid', 'email', 'profile'],
  serviceConfiguration: {
    authorizationEndpoint:
      'https://moving-ferret-78.clerk.accounts.dev/oauth/authorize',
    tokenEndpoint: 'https://moving-ferret-78.clerk.accounts.dev/oauth/token',
  },
};

export default function ClaimLockScreen() {
  const [email, setEmail] = useState(null);
  const [tokens, setTokens] = useState(null);
  const [lockId, setLockId] = useState('101');
  const [claimCode, setClaimCode] = useState('ABC-123-XYZ');
  const [status, setStatus] = useState('Idle');

  useEffect(() => {
    (async () => {
      try {
        const creds = await Keychain.getGenericPassword();
        if (!creds) return;
        const auth = JSON.parse(creds.password);
        setTokens(auth);
        const raw =
          auth.idToken ||
          auth.accessToken ||
          auth.id_token ||
          auth.access_token;
        if (raw) {
          const d = jwtDecode(raw);
          setEmail(d?.email || null);
        }
      } catch {}
    })();
  }, []);

  const signIn = async () => {
    try {
      const auth = await authorize(OAUTH_CONFIG);
      setTokens(auth);
      await Keychain.setGenericPassword('clerk', JSON.stringify(auth));
      const raw =
        auth.idToken || auth.accessToken || auth.id_token || auth.access_token;
      const d = raw ? jwtDecode(raw) : null;
      setEmail(d?.email || null);

      // Optional, only if your backend still needs it
      try {
        if (raw) await syncUserToBackend(raw);
      } catch {}
      Alert.alert('Signed In', `Welcome ${d?.email || ''}`);
    } catch (error) {
      Alert.alert('Sign In Error', String(error?.message || error));
    }
  };

  const doClaim = async () => {
    try {
      setStatus('Claiming on server…');
      const res = await claimLockOnServer({
        lockId: Number(lockId),
        claimCode,
      });
      if (!res?.ok) throw new Error(res?.err || 'claim-failed');
      setStatus('Claimed');
      Alert.alert('Claimed', `Lock ${lockId} claimed on server.`);
      // From here you can switch to your Ownership BLE flow if you want to do it right away.
    } catch (error) {
      setStatus('Claim Failed');
      const st = error?.response?.status;
      const err = error?.response?.data?.err;
      const msg = st === 409 ? 'This lock is already claimed.' : st === 403 ? 'Wrong claim code.' : st === 404 ? 'Lock not found.' : st === 400 ? 'Missing fields.' : err || error?.message || 'Something went wrong.';
      Alert.alert('Claim Failed', msg);
    }
  };

  return (
    <View style={s.c}>
      <Text style={s.t}>Claim a Lock</Text>
      <Text style={s.label}>
        {email ? `Signed in as ${email}` : 'Not signed in'}
      </Text>
      <TouchableOpacity style={s.btn} onPress={signIn}>
        <Text style={s.bt}>Sign In</Text>
      </TouchableOpacity>

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

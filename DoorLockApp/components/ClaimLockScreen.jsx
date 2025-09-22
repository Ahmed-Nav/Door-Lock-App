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

const OAUTH_USER = {
  clientId: 'USER_CLIENT_ID_HERE', // <-- put your USER clientId
  redirectUrl: 'com.doorlockapp://callback',
  scopes: ['openid', 'email', 'profile'],
  serviceConfiguration: {
    authorizationEndpoint:
      'https://moving-ferret-78.clerk.accounts.dev/oauth/authorize',
    tokenEndpoint: 'https://moving-ferret-78.clerk.accounts.dev/oauth/token',
  },
};

const OAUTH_ADMIN = {
  clientId: 'ADMIN_CLIENT_ID_HERE', // <-- put your ADMIN clientId
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

  const signInAdmin = async () => {
    try {
      const auth = await authorize(OAUTH_ADMIN);
      setTokens(auth);
      await Keychain.setGenericPassword('clerk', JSON.stringify(auth));
      const raw =
        auth.idToken || auth.accessToken || auth.id_token || auth.access_token;
      const d = raw ? jwtDecode(raw) : null;
      setEmail(d?.email || null);
      try {
        if (raw) await syncUserToBackend(raw);
      } catch {}
      Alert.alert('Signed In', `Admin: ${d?.email || ''}`);
    } catch (e) {
      Alert.alert('Sign In Error', String(e?.message || e));
    }
  };

  const signInUser = async () => {
    try {
      const auth = await authorize(OAUTH_USER);
      setTokens(auth);
      await Keychain.setGenericPassword('clerk', JSON.stringify(auth));
      const raw =
        auth.idToken || auth.accessToken || auth.id_token || auth.access_token;
      const d = raw ? jwtDecode(raw) : null;
      setEmail(d?.email || null);
      try {
        if (raw) await syncUserToBackend(raw);
      } catch {}
      Alert.alert('Signed In', `User: ${d?.email || ''}`);
    } catch (e) {
      Alert.alert('Sign In Error', String(e?.message || e));
    }
  };

  const doClaim = async () => {
    try {
      const raw =
        tokens?.idToken ||
        tokens?.accessToken ||
        tokens?.id_token ||
        tokens?.access_token;
      if (!raw) return Alert.alert('Not signed in', 'Sign in as admin.');
      setStatus('Claiming on server…');

      const res = await claimLockOnServer(raw, {
        lockId: Number(lockId),
        claimCode,
      });

      if (!res?.ok) throw new Error(res?.err || 'claim-failed');
      setStatus('Claimed');
      Alert.alert('Claimed', `Lock ${lockId} claimed.`);
    } catch (error) {
      setStatus('Claim Failed');
      const err = String(error?.response?.data?.err || error?.message || error);
      const friendly =
        err === 'already-claimed'
          ? 'This lock is already claimed.'
          : err === 'bad-claim'
          ? 'Claim code is incorrect.'
          : err === 'lock-not-found'
          ? 'Lock not found.'
          : err === 'forbidden'
          ? 'Admins only.'
          : err;
      Alert.alert('Claim Error', friendly);
    }
  };

  return (
    <View style={s.c}>
      <Text style={s.t}>Claim a Lock (Admin only)</Text>
      <Text style={s.label}>
        {email ? `Signed in as ${email}` : 'Not signed in'}
      </Text>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity style={[s.btn, { flex: 1 }]} onPress={signInUser}>
          <Text style={s.bt}>Sign In (User)</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.btn, { flex: 1 }]} onPress={signInAdmin}>
          <Text style={s.bt}>Sign In (Admin)</Text>
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

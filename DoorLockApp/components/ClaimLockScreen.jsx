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
import { syncUserToBackend, claimLock } from '../services/apiService';

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
      const creds = await Keychain.getGenericPassword();
      if(!creds) return;
      const auth = JSON.parse(creds.password);
      setTokens(auth);
      const raw = auth.idToken || auth.accessToken || auth.id_token || auth.access_token;
      if (raw) {
        const d = jwtDecode(raw);
        setEmail(d?.email || null);
      }
    })();
  }, []);

  const signIn = async () => {
    try {
      const auth = await authorize(OAUTH_CONFIG);
      setTokens(auth);
      await Keychain.setGenericPassword('clerk', JSON.stringify(auth));
      const raw = auth.idToken || auth.accessToken || auth.id_token || auth.access_token;
      const d = raw ? jwtDecode(raw) : null;
      setEmail(d?.email || null);
      await syncUserToBackend(raw);
      Alert.alert('Signed In', `Welcome ${d?.email || ''}`);
    } catch (error) {
      Alert.alert('Sign In Error', String(error?.message || error));
    }
  };

  const doClaim = async () => {
    try {
      if(!tokens) return Alert.alert('Sign In First');
      const raw = tokens.idToken || tokens.accessToken || tokens.id_token || tokens.access_token;
      setStatus('Claiming…');
      const res = await claimLock(raw, { lockId: Number(lockId), claimCode });
      setStatus('Claimed');
      Alert.alert('Claim Result', JSON.stringify(res));
    } catch (error) {
      setStatus('Claim Failed');
      Alert.alert('Claim Error', String(error?.response?.data?.error ||error?.message || error));
    }
  };

  return (
    <View style={s.c}>
      <Text style={s.t}>Claim a Lock</Text>
      <Text style={s.label}>{email ? `Signed in as ${email}` : 'Not signed in'}</Text>
      <TouchableOpacity style={s.btn} onPress={signIn}><Text style={s.bt}>Sign In</Text></TouchableOpacity>

      <TextInput style={s.in} placeholder="Lock ID" keyboardType="numeric" value={lockId} onChangeText={setLockId} />
      <TextInput style={s.in} placeholder="Claim Code" value={claimCode} onChangeText={setClaimCode} />
      <TouchableOpacity style={[s.btn, { backgroundColor: '#7B1FA2' }]} onPress={doClaim}>
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
  in: { backgroundColor: '#1d1d25', color: 'white', borderRadius: 8, padding: 12 },
  btn: { backgroundColor: '#444', padding: 14, borderRadius: 10, alignItems: 'center' },
  bt: { color: 'white', fontWeight: '600' },
  status: { color: '#bbb', marginTop: 12 },
});
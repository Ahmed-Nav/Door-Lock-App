import React from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { authorize } from 'react-native-app-auth';
import * as Keychain from 'react-native-keychain';
import { useAuth } from './AuthContext';
import { syncUserToBackend } from '../services/apiService';

const OAUTH_CONFIGS = {
  user: {
    clientId: '<<CLERK_USER_CLIENT_ID>>',
    redirectUrl: 'com.doorlockapp://callback',
    scopes: ['openid', 'email', 'profile'],
    serviceConfiguration: {
      authorizationEndpoint:
        'https://moving-ferret-78.clerk.accounts.dev/oauth/authorize',
      tokenEndpoint: 'https://moving-ferret-78.clerk.accounts.dev/oauth/token',
    },
  },
  admin: {
    clientId: '<<CLERK_ADMIN_CLIENT_ID>>',
    redirectUrl: 'com.doorlockapp://callback',
    scopes: ['openid', 'email', 'profile'],
    serviceConfiguration: {
      authorizationEndpoint:
        'https://moving-ferret-78.clerk.accounts.dev/oauth/authorize',
      tokenEndpoint: 'https://moving-ferret-78.clerk.accounts.dev/oauth/token',
    },
  },
};

export default function SignInScreen({ route, navigation }) {
  const chosen = route.params?.role || 'user';
  const { setToken, refreshMe } = useAuth();

  const onSignIn = async () => {
    try {
      const auth = await authorize(OAUTH_CONFIGS[chosen]);
      const raw =
        auth.idToken || auth.accessToken || auth.id_token || auth.access_token;
      if (!raw) throw new Error('No token from provider');

      await Keychain.setGenericPassword('clerk', JSON.stringify(auth));
      await setToken(raw);

      // backend derives role from token (client id)
      await syncUserToBackend(raw);

      const me = await refreshMe(); // { user:{ role } }
      if (!me?.user) throw new Error('No user record after sync');

      if (me.user.role === 'admin')
        navigation.reset({ index: 0, routes: [{ name: 'AdminHome' }] });
      else navigation.reset({ index: 0, routes: [{ name: 'UserHome' }] });
    } catch (e) {
      Alert.alert('Sign In Error', String(e?.message || e));
    }
  };

  return (
    <View style={s.c}>
      <Text style={s.t}>Sign in as {chosen.toUpperCase()}</Text>
      <TouchableOpacity style={s.btn} onPress={onSignIn}>
        <Text style={s.bt}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
}
const s = StyleSheet.create({
  c: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#0b0b0f',
    padding: 24,
  },
  t: { color: '#fff', fontSize: 20, fontWeight: '800' },
  btn: {
    backgroundColor: '#7B1FA2',
    padding: 16,
    borderRadius: 12,
    width: '80%',
    alignItems: 'center',
  },
  bt: { color: '#fff', fontWeight: '700' },
});

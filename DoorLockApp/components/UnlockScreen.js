import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Alert, TouchableOpacity, StyleSheet } from 'react-native';
import { getUnlockToken, syncUserToBackend } from '../services/apiService';
import { advertiseTokenBase64, stopAdvertising } from '../ble/bleManager';
import jwt_Decode from 'jwt-decode';
import { authorize } from 'react-native-app-auth';
import * as Keychain from 'react-native-keychain';
import LinearGradient from 'react-native-linear-gradient';

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

// Pick the lock you want to unlock from this screen
const LOCK_ID = 101;

const UnlockScreen = () => {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [tokens, setTokens] = useState<any>(null);
  const [status, setStatus] = useState('');
  const busyRef = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const creds = await Keychain.getGenericPassword();
        if (!creds) return;
        const authState = JSON.parse(creds.password);
        setTokens(authState);

        const rawToken =
          authState.idToken ||
          authState.accessToken ||
          authState.id_token ||
          authState.access_token;

        if (rawToken) {
          const decoded: any = jwt_Decode(rawToken);
          const email = decoded?.email;
          if (email) setUserEmail(email);
        }
      } catch (e) {
        console.warn('No Tokens Found', e);
      }
    })();
  }, []);

  const signIn = async () => {
    try {
      const authState = await authorize(OAUTH_CONFIG);
      setTokens(authState);
      await Keychain.setGenericPassword('clerk', JSON.stringify(authState));

      const rawToken =
        authState.idToken ||
        authState.accessToken ||
        authState.id_token ||
        authState.access_token;

      const decoded: any = rawToken ? jwt_Decode(rawToken) : {};
      const email = decoded?.email;
      if (email) setUserEmail(email);

      // Ensure the user exists in your DB
      await syncUserToBackend(rawToken);
      Alert.alert('Signed In', `Welcome ${email ?? ''}`);
    } catch (error: any) {
      console.error('Sign In Error', error);
      Alert.alert('Sign In Error', error?.message ?? String(error));
    }
  };

  const signOut = async () => {
    try {
      await Keychain.resetGenericPassword();
      setTokens(null);
      setUserEmail(null);
      setStatus('');
      await stopAdvertising();
      Alert.alert('Signed Out');
    } catch (e) {
      console.warn('Sign Out Error', e);
    }
  };

  const handleUnlock = async () => {
    if (busyRef.current) return;
    busyRef.current = true;

    try {
      setStatus('Sending Unlock Request...');
      if (!tokens) {
        Alert.alert('Please Sign In First');
        return;
      }

      const token =
        tokens.idToken ||
        tokens.accessToken ||
        tokens.id_token ||
        tokens.access_token;

      if (!token) {
        Alert.alert('Please Sign In First');
        return;
      }

      // 🔴 IMPORTANT: pass the lockId so the backend mints a token for that lock
      const base64 = await getUnlockToken(token, LOCK_ID);

      setStatus('Advertising Unlock Request...');
      // burst 5 frames (each call advertises ~dwellMs and stops)
      for (let i = 0; i < 5; i++) {
        await advertiseTokenBase64(base64, 200);
      }
      setStatus('Unlock Request Sent (5 frames)');
    } catch (error) {
      console.log(error);
      setStatus('Error Sending Unlock Request');
    } finally {
      try {
        await stopAdvertising();
        setStatus('Advertising stopped');
      } catch (e) {
        console.warn('Stop Advertising Failed', e);
      }
      busyRef.current = false;
    }
  };

  return (
    <LinearGradient
      colors={['#2E0249', '#570A57', '#A91079']}
      style={styles.container}
    >
      <View style={styles.card}>
        <Text style={styles.headerText}>
          {userEmail ? `Signed in as:\n${userEmail}` : 'Not signed in'}
        </Text>

        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: userEmail ? '#7B1FA2' : '#9E9E9E' },
          ]}
          onPress={handleUnlock}
          disabled={!userEmail || busyRef.current}
        >
          <Text style={styles.buttonText}>
            {busyRef.current ? 'Working…' : 'Unlock'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#9C27B0' }]}
          onPress={userEmail ? signOut : signIn}
        >
          <Text style={styles.buttonText}>
            {userEmail ? 'Sign Out' : 'Sign In with Clerk'}
          </Text>
        </TouchableOpacity>

        <View style={styles.statusContainer}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: userEmail ? 'limegreen' : 'red' },
            ]}
          />
          <Text style={styles.statusText}>{status || 'Idle'}</Text>
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    width: '90%',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  headerText: { color: 'white', fontSize: 18, marginBottom: 20, textAlign: 'center' },
  button: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 12,
    marginVertical: 8,
    alignItems: 'center',
  },
  buttonText: { color: 'white', fontWeight: '600', fontSize: 16 },
  statusContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
  statusDot: { width: 10, height: 10, borderRadius: 50, marginRight: 8 },
  statusText: { color: 'white' },
});

export default UnlockScreen;

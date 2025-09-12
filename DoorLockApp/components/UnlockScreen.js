import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Alert, TouchableOpacity, StyleSheet } from 'react-native';
import * as Ble from '../ble/bleManager'; // Phase II BLE functions + UUIDS
import jwtDecode from 'jwt-decode';
import { authorize } from 'react-native-app-auth';
import * as Keychain from 'react-native-keychain';
import LinearGradient from 'react-native-linear-gradient';
import axios from 'axios';

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

// --- Phase II: choose a target lock ID you want to unlock from this screen
const LOCK_ID = 101;

// --- Your backend base URL (Phase II: we use it ONLY to sign the challenge in dev)
const API_URL = 'https://door-lock-app.onrender.com/api';

/**
 * TEMP DEV SIGNING (Phase II scaffolding):
 * Signs the challenge (20 bytes nonce||lockId) with the user's private key.
 * In production you will sign ON-DEVICE using the user's key in secure enclave/keystore.
 * For now, we call a dev endpoint so you can complete end-to-end flow.
 *
 * Backend should expose:
 *   POST /api/ble/sign
 *   headers: Authorization: Bearer <token>
 *   body: { kid: string, msgB64: string }  // msgB64 = base64 of 20-byte challenge
 *   returns: { sigB64: string }            // base64 of raw (r||s) 64 bytes
 */
async function signWithBackend(token, kid, msgUint8Array) {
  const msgB64 = Buffer.from(msgUint8Array).toString('base64');
  const res = await axios.post(
    `${API_URL}/ble/sign`,
    { kid, msgB64 },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    },
  );
  return res.data.sigB64; // must be base64 of 64B r||s
}

const UnlockScreen = () => {
  const [userEmail, setUserEmail] = useState(null);
  const [tokens, setTokens] = useState(null);
  const [status, setStatus] = useState('');
  const busyRef = useRef(false);
  const subRef = useRef(null);
  const deviceRef = useRef(null);

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
          const decoded = jwtDecode(rawToken);
          const email = decoded && decoded.email;
          if (email) setUserEmail(email);
        }
      } catch (e) {
        console.warn('No Tokens Found', e);
      }
    })();

    // cleanup on unmount
    return () => {
      if (subRef.current) {
        try {
          subRef.current.remove();
        } catch {}
        subRef.current = null;
      }
      if (deviceRef.current) {
        deviceRef.current.cancelConnection().catch(() => {});
        deviceRef.current = null;
      }
    };
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
      console.log(rawToken);

      const decoded = rawToken ? jwtDecode(rawToken) : {};
      const email = decoded && decoded.email;
      if (email) setUserEmail(email);

      Alert.alert('Signed In', `Welcome ${email || ''}`);
    } catch (error) {
      console.error('Sign In Error', error);
      Alert.alert('Sign In Error', error?.message || String(error));
    }
  };

  const signOut = async () => {
    try {
      // tear down BLE if connected
      if (subRef.current) {
        try {
          subRef.current.remove();
        } catch {}
        subRef.current = null;
      }
      if (deviceRef.current) {
        await deviceRef.current.cancelConnection().catch(() => {});
        deviceRef.current = null;
      }

      await Keychain.resetGenericPassword();
      setTokens(null);
      setUserEmail(null);
      setStatus('');
      Alert.alert('Signed Out');
    } catch (e) {
      console.warn('Sign Out Error', e);
    }
  };

  const handleUnlock = async () => {
    if (busyRef.current) return;
    busyRef.current = true;

    try {
      setStatus('Preparing…');
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
      if (!userEmail) {
        Alert.alert('Missing user identity');
        return;
      }

      // 1) Scan & connect to the specific lockId
      setStatus('Scanning for lock…');
      const device = await Ble.scanAndConnectForLockId(LOCK_ID, 10_000);
      deviceRef.current = device;

      // 2) Subscribe to AUTH_RESULT to show result (ok/error)
      if (subRef.current) {
        try {
          subRef.current.remove();
        } catch {}
      }
      subRef.current = device.monitorCharacteristicForService(
        Ble.UUIDS.AUTH_SERVICE,
        Ble.UUIDS.AUTH_RESULT,
        (error, characteristic) => {
          if (error) {
            setStatus(`Auth result error: ${String(error)}`);
            return;
          }
          if (characteristic?.value) {
            try {
              const js = JSON.parse(
                Buffer.from(characteristic.value, 'base64').toString('utf8'),
              );
              if (js.ok) {
                setStatus('✅ Unlock success');
              } else {
                setStatus(`❌ Unlock failed: ${js.err || 'unknown'}`);
              }
            } catch (e) {
              setStatus('Auth result parse error');
            }
          }
        },
      );

      // 3) Perform challenge–response
      setStatus('Exchanging challenge…');
      await Ble.doUnlock(device, {
        kid: userEmail, // Phase II early: we use email as kid (must match ACL)
        signFn: async msgUint8Array => {
          // TEMP: dev-mode: ask backend to sign with user key (so you can demo end-to-end)
          // Replace this later with on-device signing using secure keystore.
          return await signWithBackend(token, userEmail, msgUint8Array);
        },
      });

      setStatus('Waiting for lock decision…');
    } catch (error) {
      console.log(error);
      setStatus('Error during unlock');
      Alert.alert('Unlock Error', error?.message || String(error));
    } finally {
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
  headerText: {
    color: 'white',
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 12,
    marginVertical: 8,
    alignItems: 'center',
  },
  buttonText: { color: 'white', fontWeight: '600', fontSize: 16 },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  statusDot: { width: 10, height: 10, borderRadius: 50, marginRight: 8 },
  statusText: { color: 'white' },
});

export default UnlockScreen;

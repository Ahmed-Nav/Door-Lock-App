import React, { useEffect, useState } from "react";
import { View, Button, Text, Alert } from "react-native";
import { getPayload, syncUserToBackend } from "../services/apiService";
import { advertiseBeacon, stopAdvertising } from "../ble/bleManager";
import { toHex } from "../ble/bleEncoding";
import  jwt_Decode  from "jwt-decode";
import { authorize } from "react-native-app-auth";
import * as Keychain from 'react-native-keychain';

const OAUTH_CONFIG = {
  clientId: '2JbPx2I2fknWbmf8',
  redirectUrl: 'com.doorlockapp://callback', // same as Clerk redirect
  scopes: ['openid', 'email', 'profile'],
  serviceConfiguration: {
    authorizationEndpoint:
      'https://moving-ferret-78.clerk.accounts.dev/oauth/authorize',
    tokenEndpoint: 'https://moving-ferret-78.clerk.accounts.dev/oauth/token',
  },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const UnlockScreen = () => {
  const [userEmail, setUserEmail] = useState(null);
  const [tokens, setTokens] = useState(null);
  const [status, setStatus] = useState('');
  const [lastFrameHex, setLastFrameHex] = useState("");
  const [frames, setFrames] = useState([]);

  useEffect(() => {
    // on mount, load stored tokens
    (async () => {
      try {
        const creds = await Keychain.getGenericPassword();
        if (creds) {
          const authState = JSON.parse(creds.password);
          setTokens(authState);
          // decode idToken first, fallback to accessToken
          const rawToken =
            authState.idToken ||
            authState.accessToken ||
            authState.id_token ||
            authState.access_token;
          if (rawToken) {
            const decoded = jwt_Decode(rawToken);
            const email = decoded.email || decoded?.email;
            if (email) setUserEmail(email);
          }
        }
      } catch (error) {
        console.warn('No Tokens Found', error);
      }
    })();
  }, []);

//sign in with clerk
  const signIn = async () => {
    try {
      const authState = await authorize(OAUTH_CONFIG);
      // authState: { accessToken, idToken, refreshToken, accessTokenExpirationDate}
      setTokens(authState);
      await Keychain.setGenericPassword('clerk', JSON.stringify(authState));
      const rawToken = authState.idToken || authState.accessToken || authState.id_token || authState.access_token;
      const decoded = rawToken ? jwt_Decode(rawToken) : {};
      const email = decoded.email || (decoded?.email);
      if (email) setUserEmail(email);

      // send token to backend to create/save user record
      await syncUserToBackend(rawToken);
      Alert.alert('Signed In', `Welcome ${email}`);
    } catch (error) {
      console.error('Sign In Error', error);
      Alert.alert('Sign In Error', error.message) || String(error);
    }
  };

  // clerk sign out
  const signOut = async () => {
    try {
      await Keychain.resetGenericPassword();
      setTokens(null);
      setUserEmail(null);
      Alert.alert('Signed Out');
      setFrames([]);
      setLastFrameHex('');
    } catch (error) {
      console.warn('Sign Out Error', error);
    }
  };

  const handleUnlock = async () => {
    setStatus('Sending Unlock Request...');
    if (!tokens) {
      Alert.alert('Please Sign In First');
      return;
    }

    const token = tokens.idToken || tokens.accessToken || tokens.id_token || tokens.access_token;
    if (!token) {
      Alert.alert('Please Sign In First');
      return;
    }


    try {
      const payload = await getPayload(token);
      if (!payload) throw new Error("Error getting payload from backend");

      setStatus('Advertising Unlock Request...');
      const sentFrames = [];

      for (let i = 0; i < 5; i++) {
        const frame = await advertiseBeacon(payload);
        const hex = frame ? toHex(frame) : `frame-${i+1}`;
        sentFrames.push(hex);
        setLastFrameHex(hex);
        // Wait for a short period before advertising the next frame
        await sleep(1000);
      }
      setFrames(sentFrames);
      setStatus('Unlock Request Sent (5 frames)');
    } catch (error) {
      setStatus('Error Sending Unlock Request');
      console.log(error);
    } finally {
      try {
        await stopAdvertising();
        setStatus('Advertising stopped');
      } catch (error) {
        console.warn('Stop Advertising Failed', error);
      }
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ marginBottom: 8 }}>
        {userEmail ? `Signed in as: ${userEmail}` : 'Not signed in'}
      </Text>

      <Button
        title={userEmail ? 'Sign in again' : 'Sign in with Clerk'}
        onPress={signIn}
      />

      <View style={{ height: 12 }} />

      <Button
        title="Unlock (broadcast 5 frames)"
        onPress={handleUnlock}
        disabled={!userEmail}
      />

      <View style={{ height: 12 }} />

      <Button title="Sign out" onPress={signOut} />

      <View style={{ height: 16 }} />
      <Text>Status: {status}</Text>

      {lastFrameHex ? (
        <View style={{ marginTop: 8 }}>
          <Text>Last frame (hex):</Text>
          <Text selectable>{lastFrameHex}</Text>
        </View>
      ) : null}
    </View>
  );
}

export default UnlockScreen;
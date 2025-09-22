// App.tsx
import 'react-native-gesture-handler';
import 'react-native-get-random-values';
import { Buffer } from 'buffer';
global.Buffer = global.Buffer || Buffer;

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import RoleSelectScreen from './components/RoleSelectScreen';
import SignInScreen from './components/SignInScreen';
import ClaimLockScreen from './components/ClaimLockScreen';
import PushAclScreen from './components/PushAclScreen';
import UnlockScreen from './components/UnlockScreen';

import { getMe } from './services/apiService';
import jwtDecode from 'jwt-decode';
import * as Keychain from 'react-native-keychain';

type RootStackParamList = {
  RoleSelect: undefined;
  SignIn: { role: 'admin' | 'user' };
  AdminHome: undefined;
  ClaimLock: undefined;
  PushACL: undefined;
  UserHome: undefined;
  Unlock: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function Loading() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0b0b0f' }}>
      <ActivityIndicator size="large" />
    </View>
  );
}

export default function App() {
  const [booting, setBooting] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<'admin' | 'user' | null>(null);

  // On boot: try restore token → fetch /auth/me → set role
  useEffect(() => {
    (async () => {
      try {
        const creds = await Keychain.getGenericPassword();
        if (!creds) { setBooting(false); return; }
        const auth = JSON.parse(creds.password || '{}');
        const raw: string | undefined =
          auth.idToken || auth.id_token || auth.accessToken || auth.access_token;

        if (!raw) { setBooting(false); return; }

        setToken(raw);
        // This upserts user (so you see a user doc in DB) and gives us role
        const me = await getMe(raw);
        const r = me?.user?.role === 'admin' ? 'admin' : 'user';
        setRole(r);
      } catch (e) {
        console.warn('Boot getMe failed:', e?.response?.data || String(e));
      } finally {
        setBooting(false);
      }
    })();
  }, []);

  if (booting) return <Loading />;

  return (
    <NavigationContainer>
      {!token ? (
        // Not signed in: Auth flow
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="RoleSelect" component={RoleSelectScreen} />
          <Stack.Screen name="SignIn" component={SignInScreen} />
        </Stack.Navigator>
      ) : role === 'admin' ? (
        // Admin flow
        <Stack.Navigator>
          {/* Make ClaimLock the admin landing or create a dedicated AdminHome screen */}
          <Stack.Screen name="ClaimLock" component={ClaimLockScreen} options={{ title: 'Claim a Lock' }} />
          <Stack.Screen name="PushACL" component={PushAclScreen} options={{ title: 'Push ACL' }} />
          {/* add Groups, etc. here later */}
        </Stack.Navigator>
      ) : (
        // User flow
        <Stack.Navigator>
          <Stack.Screen name="Unlock" component={UnlockScreen} options={{ title: 'Unlock' }} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}

// App.tsx
import React from 'react';
import 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AuthProvider, useAuthContext } from './auth/AuthContext';
import RoleSelectScreen from './components/RoleSelectScreen';          // keep if you still use it anywhere
import AdminHomeScreen from './components/AdminHomeScreen';
import ClaimLockScreen from './components/ClaimLockScreen';
import PushAclScreen from './components/PushAclScreen';
import UnlockScreen from './components/UnlockScreen';
import RebuildAclScreen from './components/RebuildAclScreen';
import GroupsScreen from './components/GroupsScreen';
import GroupDetail from './components/GroupDetail';
import ClaimQrScreen from './components/ClaimQrScreen';
import SignInScreen from './components/SignInScreen';

const Stack = createNativeStackNavigator();

function Router() {
  const { isSignedIn, accountRole, loadTokensFromStore } = useAuthContext();
  const [booted, setBooted] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      await loadTokensFromStore();
      setBooted(true);
    })();
  }, []);

  if (!booted) return null;

  if (!isSignedIn) {
    // Only a sign-in screen stack
    return (
      <Stack.Navigator>
        <Stack.Screen name="SignIn" component={SignInScreen} options={{ title: 'Sign in' }} />
      </Stack.Navigator>
    );
  }

  if (accountRole === 'admin') {
    return (
      <Stack.Navigator>
        <Stack.Screen name="AdminHome" component={AdminHomeScreen} options={{ title: 'Admin' }} />
        <Stack.Screen name="ClaimLock" component={ClaimLockScreen} options={{ title: 'Claim Lock' }} />
        <Stack.Screen name="ClaimQr" component={ClaimQrScreen} options={{ title: 'Scan Claim QR' }} />
        <Stack.Screen name="PushAcl" component={PushAclScreen} options={{ title: 'Push ACL' }} />
        <Stack.Screen name="RebuildAcl" component={RebuildAclScreen} options={{ title: 'Rebuild ACL' }} />
        <Stack.Screen name="Groups" component={GroupsScreen} options={{ title: 'Groups' }} />
        <Stack.Screen name="GroupDetail" component={GroupDetail} options={{ title: 'Group Detail' }} />
        <Stack.Screen name="Unlock" component={UnlockScreen} options={{ title: 'Unlock' }} />
      </Stack.Navigator>
    );
  }

  // Regular user
  return (
    <Stack.Navigator>
      <Stack.Screen name="Unlock" component={UnlockScreen} options={{ title: 'Unlock' }} />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <Router />
      </NavigationContainer>
    </AuthProvider>
  );
}

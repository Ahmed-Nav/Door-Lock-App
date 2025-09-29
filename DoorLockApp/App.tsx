// App.tsx
import React from 'react';
import 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, useAuth } from './auth/AuthContext';
import RoleSelectScreen from './components/RoleSelectScreen';
import AdminHomeScreen from './components/AdminHomeScreen';
import ClaimLockScreen from './components/ClaimLockScreen';
import PushAclScreen from './components/PushAclScreen';
import UnlockScreen from './components/UnlockScreen';
import RebuildAclScreen from './components/RebuildAclScreen';  // NEW
import GroupsScreen from './components/GroupsScreen';
import GroupDetail from './components/GroupDetail';          // NEW
import ClaimQrScreen from './components/ClaimQrScreen';        // NEW (used from Claim)

const Stack = createNativeStackNavigator();

function Router() {
  const { role, loading } = useAuth();
  if (loading) return null;

  if (!role) {
    return (
      <Stack.Navigator>
        <Stack.Screen name="RoleSelect" component={RoleSelectScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
    );
  }

  if (role === 'admin') {
    return (
      <Stack.Navigator>
        <Stack.Screen name="AdminHome" component={AdminHomeScreen} options={{ title: 'Admin' }} />
        <Stack.Screen name="ClaimLock" component={ClaimLockScreen} options={{ title: 'Claim Lock' }} />
        <Stack.Screen name="ClaimQr" component={ClaimQrScreen} options={{ title: 'Scan Claim QR' }} />
        <Stack.Screen name="PushAcl" component={PushAclScreen} options={{ title: 'Push ACL' }} />
        <Stack.Screen name="RebuildAcl" component={RebuildAclScreen} options={{ title: 'Rebuild ACL' }} />
        <Stack.Screen name="Groups" component={GroupsScreen} options={{ title: 'Groups' }} />
        <Stack.Screen name="GroupDetail" component={GroupDetail} options={{ title: 'Group Detail' }} />
      </Stack.Navigator>
    );
  }

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

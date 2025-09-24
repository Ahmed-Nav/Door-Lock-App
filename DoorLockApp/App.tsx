// DoorLockApp/App.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, useAuth } from './auth/AuthContext';
import AdminHome from './components/AdminHome';
import GroupsList from './components/GroupsList';
import GroupDetail from './components/GroupDetail';
import RoleSelectScreen from './components/RoleSelectScreen';
import ClaimLockScreen from './components/ClaimLockScreen';
import PushAclScreen from './components/PushAclScreen';
import UnlockScreen from './components/UnlockScreen';
import { View, Text } from 'react-native';

const Stack = createNativeStackNavigator();


function Shell() {
  const { token, role, loading } = useAuth();
  console.log('SHELL state:', { token: !!token, role, loading });

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0b0b0f', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: 'white' }}>Loading…</Text>
      </View>
    );
  }

  if (!token || !role) {
    return (
      <Stack.Navigator>
        <Stack.Screen name="RoleSelect" component={RoleSelectScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
    );
  }

  if (role === 'admin') {
  return (
    <Stack.Navigator>
      <Stack.Screen name="AdminHome" component={AdminHome} options={{ headerShown: false }} />
      <Stack.Screen name="Claim" component={ClaimLockScreen} options={{ title: 'Claim a Lock' }} />
      <Stack.Screen name="Groups" component={GroupsList} options={{ title: 'Groups' }} />
      <Stack.Screen name="GroupDetail" component={GroupDetail} options={{ title: 'Group' }} />
      <Stack.Screen name="PushACL" component={PushAclScreen} options={{ title: 'Push ACL' }} />
    </Stack.Navigator>
  );
}

  return (
    <Stack.Navigator>
      <Stack.Screen name="UnlockScreen" component={UnlockScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <Shell />
      </NavigationContainer>
    </AuthProvider>
  );
}

// DoorLockApp/App.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, useAuth } from './context/AuthContext';
import RoleSelectScreen from './screens/RoleSelectScreen';
import ClaimLockScreen from './components/ClaimLockScreen';
import PushAclScreen from './components/PushAclScreen';
import { View, Text } from 'react-native';

// Minimal user home (replace with your Unlock screen)
function UserHome() {
  return (
    <View style={{ flex: 1, backgroundColor: '#0b0b0f', justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: 'white' }}>User Home (Unlock screen here)</Text>
    </View>
  );
}

const Stack = createNativeStackNavigator();

function Shell() {
  const { token, role, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0b0b0f', justifyContent: 'center', alignItems: 'center' }}>
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
        <Stack.Screen name="Claim" component={ClaimLockScreen} options={{ title: 'Claim a Lock' }} />
        <Stack.Screen name="PushACL" component={PushAclScreen} options={{ title: 'Push ACL' }} />
      </Stack.Navigator>
    );
  }

  // role === 'user'
  return (
    <Stack.Navigator>
      <Stack.Screen name="UserHome" component={UserHome} options={{ headerShown: false }} />
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

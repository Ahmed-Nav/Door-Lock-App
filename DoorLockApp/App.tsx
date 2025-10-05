// App.tsx
import React from 'react';
import 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AuthProvider, useAuth } from './auth/AuthContext';


import RoleSelectScreen from './components/RoleSelectScreen';
import UnlockScreen from './components/UnlockScreen';


import AdminHomeScreen from './components/AdminHomeScreen';      
import GroupsScreen from './components/GroupsScreen';
import GroupDetail from './components/GroupDetail';
import PushAclScreen from './components/PushAclScreen';
import ClaimLockScreen from './components/ClaimLockScreen';
import ClaimQrScreen from './components/ClaimQrScreen';
import RebuildAclScreen from './components/RebuildAclScreen';
import OwnershipScreen from './components/OwnershipScreen';


export type RootStackParamList = {
  
  RoleSelect: undefined;

  
  Unlock: undefined;


  AdminHome: undefined;
  ClaimLock: undefined;
  ClaimQr: undefined;

  
  Groups: { lockId: number; lockName?: string } | undefined;

  GroupDetail: { groupId: string };

  
  PushAcl: { lockId: number; envelope?: any };

  RebuildAcl: undefined; 
  Ownership: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function Router() {
  const { role, loading } = useAuth();
  if (loading) return null;


  if (!role) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="RoleSelect" component={RoleSelectScreen} />
      </Stack.Navigator>
    );
  }


  if (role === 'admin') {
    return (
      <Stack.Navigator>
        <Stack.Screen
          name="AdminHome"
          component={AdminHomeScreen}
          options={{ title: 'My Locks' }}
        />
        <Stack.Screen
          name="ClaimLock"
          component={ClaimLockScreen}
          options={{ title: 'Claim Lock' }}
        />
        <Stack.Screen
          name="ClaimQr"
          component={ClaimQrScreen}
          options={{ title: 'Scan Claim QR' }}
        />
        <Stack.Screen
          name="Groups"
          component={GroupsScreen}
          options={{ title: 'Groups' }}
        />
        <Stack.Screen
          name="GroupDetail"
          component={GroupDetail}
          options={{ title: 'Group Detail' }}
        />
        <Stack.Screen
          name="PushAcl"
          component={PushAclScreen}
          options={{ title: 'Push ACL' }}
        />
        <Stack.Screen
          name="RebuildAcl"
          component={RebuildAclScreen}
          options={{ title: 'Rebuild ACL' }}
        />
        <Stack.Screen
          name="Ownership"
          component={OwnershipScreen}
          options={{ title: 'Ownership' }}
        />
        <Stack.Screen
          name="Unlock"
          component={UnlockScreen}
          options={{ title: 'Unlock' }}
        />
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

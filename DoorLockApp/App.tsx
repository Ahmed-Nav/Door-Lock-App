// App.tsx

import React from 'react';

import 'react-native-gesture-handler';

import { NavigationContainer } from '@react-navigation/native';

import { createNativeStackNavigator } from '@react-navigation/native-stack';

import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';

import * as Sentry from '@sentry/react-native';

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

import LocksHomeScreen from './components/LocksHomeScreen';

import EditLockModal from './components/EditLockModal';

import UserManagementScreen from './components/UserManagementScreen';

export type RootStackParamList = {
  AdminHome: undefined;

  RoleSelect: undefined;

  Unlock: undefined;

  LocksHome: undefined;

  UserManagement: undefined;

  EditLock: { lockId: number; name?: string };

  ClaimLock: undefined;

  ClaimQr: undefined;

  Groups: { lockId: number; lockName?: string } | undefined;

  GroupDetail: { groupId: string };

  PushAcl: { lockId: number; envelope?: any };

  RebuildAcl: undefined;

  Ownership: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const toastConfig = {
  success: props => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: '#69C779',
        width: '90%',
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 15,
        fontWeight: '400',
      }}
    />
  ),

  error: props => (
    <ErrorToast
      {...props}
      style={{
        borderLeftColor: '#FE6301',
        width: '90%',
      }}
      text1Style={{
        fontSize: 17,
      }}
      text2Style={{
        fontSize: 15,
      }}
    />
  ),
};

function Router() {
  const { role, loading, token, activeWorkspace } = useAuth();

  if (loading) {
    return null; 
  }


  if (!token) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
   
        <Stack.Screen name="RoleSelect" component={RoleSelectScreen} />
      </Stack.Navigator>
    );
  }


  if (!activeWorkspace) {
    return (
      <Stack.Navigator>
        <Stack.Screen
          name="ClaimLock"
          component={ClaimLockScreen}
          options={{ title: 'Claim Your First Lock' }}
        />
        <Stack.Screen
          name="ClaimQr"
          component={ClaimQrScreen}
          options={{ title: 'Scan Claim QR' }}
        />

        <Stack.Screen
          name="Ownership"
          component={OwnershipScreen}
          options={{ title: 'Ownership' }}
        />
      </Stack.Navigator>
    );
  }

  if (role === 'admin' || role === 'owner') {
    return (
      <Stack.Navigator>
        <Stack.Screen name="AdminHome" component={AdminHomeScreen} />
        <Stack.Screen name="LocksHome" component={LocksHomeScreen} />
        <Stack.Screen name="UserManagement" component={UserManagementScreen} />
        <Stack.Screen name="RenameLock" component={EditLockModal} />
        <Stack.Screen name="ClaimLock" component={ClaimLockScreen} />
        <Stack.Screen name="ClaimQr" component={ClaimQrScreen} />
        <Stack.Screen name="GlobalGroups" component={GlobalGroupsScreen} />
        <Stack.Screen
          name="ManageLockAccess"
          component={ManageLockAccessScreen}
        />
        <Stack.Screen name="GroupDetail" component={GroupDetail} />
        <Stack.Screen name="Ownership" component={OwnershipScreen} />
        <Stack.Screen name="Unlock" component={UnlockScreen} />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator>
      <Stack.Screen
        name="LocksHome"
        component={LocksHomeScreen}
        options={{ title: 'My Locks' }}
      />
      <Stack.Screen
        name="Unlock"
        component={UnlockScreen}
        options={{ title: 'Unlock' }}
      />
    </Stack.Navigator>
  );
}

Sentry.init({
  dsn: 'https://49ab8207598b32992f60b0987ea96578@o4510216465940480.ingest.us.sentry.io/4510216467120128',

  tracesSampleRate: 1.0,
});

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <Router />
      </NavigationContainer>

      <Toast config={toastConfig} position="bottom" />
    </AuthProvider>
  );
}

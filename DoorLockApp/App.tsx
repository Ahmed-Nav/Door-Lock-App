import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, useAuth } from './auth/AuthContext';
import RoleSelectScreen from './components/RoleSelectScreen';
import SignInScreen from './components/SignInScreen';

// Your existing screens
import ClaimLockScreen from './components/ClaimLockScreen';
import PushAclScreen from './components/PushAclScreen';

const Stack = createNativeStackNavigator();

function AdminHome() {
  // add admin tabs later; for now show Push ACL here
  return <PushAclScreen />;
}
function UserHome() {
  // show user features (claim/unlock)
  return <ClaimLockScreen />;
}

function Root() {
  const { token, refreshMe } = useAuth();

  // Optional “remember me”: if token exists from previous run, fetch me and auto-route.
  useEffect(() => { if (token) refreshMe(); }, [token, refreshMe]);

  return (
    <Stack.Navigator screenOptions={{ headerShown:false }}>
      {/* Auth flow (always start here) */}
      <Stack.Screen name="RoleSelect" component={RoleSelectScreen} />
      <Stack.Screen name="SignIn" component={SignInScreen} />

      {/* After login, we reset to one of these */}
      <Stack.Screen name="AdminHome" component={AdminHome} />
      <Stack.Screen name="UserHome" component={UserHome} />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <Root />
      </NavigationContainer>
    </AuthProvider>
  );
}

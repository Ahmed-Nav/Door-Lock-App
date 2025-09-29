// DoorLockApp/components/SignInScreen.jsx
import React from 'react';
import { View, Button } from 'react-native';
import { useAuthContext } from '../auth/AuthContext';

export default function SignInScreen() {
  const { signIn, switchAccount, isSignedIn } = useAuthContext();

  return (
    <View style={{ padding: 16 }}>
      <Button title={isSignedIn ? 'Re-authenticate' : 'Sign in'} onPress={signIn} />
      <View style={{ height: 12 }} />
      <Button title="Use a different account" onPress={async () => {
        await switchAccount();
        await signIn();
      }} />
    </View>
  );
}

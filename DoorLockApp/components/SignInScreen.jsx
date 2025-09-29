// DoorLockApp/components/SignInScreen.jsx
import React, { useState } from 'react';
import { View, Button, Alert } from 'react-native';
import { useAuthContext } from '../auth/AuthContext';

export default function SignInScreen() {
  const { signIn, switchAccount, isSignedIn } = useAuthContext();
  const [loading, setLoading] = useState(false);

  const onSignIn = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await signIn(); // opens browser, returns tokens, hydrates /auth/me
    } catch (e) {
      console.error('Sign-in failed:', e);
      Alert.alert('Sign-in failed', String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  const onUseDifferent = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await switchAccount(); // revoke + clear local
      await signIn(); // immediately re-open with clean session
    } catch (e) {
      console.error('Switch account failed:', e);
      Alert.alert('Switch account failed', String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ padding: 16, gap: 12 }}>
      <Button
        title={isSignedIn ? 'Re-authenticate' : 'Sign in'}
        onPress={onSignIn}
        disabled={loading}
      />
      <Button
        title="Use a different account"
        onPress={onUseDifferent}
        disabled={loading}
      />
    </View>
  );
}

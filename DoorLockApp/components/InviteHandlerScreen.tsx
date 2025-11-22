// DoorLockApp/components/InviteHandlerScreen.tsx
import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { useRoute, useNavigation } from '@react-navigation/native';
import { acceptInvite } from '../services/apiService';
import Toast from 'react-native-toast-message';

import AsyncStorage from '@react-native-async-storage/async-storage';

export default function InviteHandlerScreen() {
  const { token, refreshUser } = useAuth();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();

  useEffect(() => {
    const handleAccept = async () => {
      const inviteToken = route.params?.token;
      if (!inviteToken) {
        Toast.show({ type: 'error', text1: 'Invalid invite link' });
        navigation.replace('AdminHome');
        return;
      }

      // V2: User is NOT logged in. Store token and prompt for sign-in.
      if (!token) {
        await AsyncStorage.setItem('pendingInviteToken', inviteToken);
        Toast.show({
          type: 'info',
          text1: 'Please sign in',
          text2: 'Sign in to accept your workspace invitation.',
        });
        navigation.replace('RoleSelect'); // Go to sign-in
        return;
      }

      // V2: User IS logged in. Accept invite directly.
      try {
        await acceptInvite(token, inviteToken);
        Toast.show({
          type: 'success',
          text1: 'Success!',
          text2: 'You have joined the workspace.',
        });

        await refreshUser();

        navigation.replace('AdminHome');
      } catch (anyErr) {
        const err = anyErr as any;
        Toast.show({
          type: 'error',
          text1: 'Invite Failed',
          text2: err?.response?.data?.message || 'Could not accept invite.',
        });
        navigation.replace('AdminHome');
      }
    };

    handleAccept();
  }, [token, route.params, navigation, refreshUser]);

  return (
    <View style={s.container}>
      <ActivityIndicator size="large" color="#7B1FA2" />
      <Text style={s.text}>Processing invite...</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0b0f',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#aaa',
    marginTop: 10,
  },
});

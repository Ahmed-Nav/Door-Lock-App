import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from '../App';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

const PENDING_INVITE_KEY = 'pendingInviteToken';

type ResolveAuthNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'ResolveAuth'
>;

export default function ResolveAuthScreen() {
  const { activeWorkspace, role } = useAuth();
  const navigation = useNavigation<ResolveAuthNavigationProp>();

  useEffect(() => {
    const resolveRoute = async () => {
      // Check for a pending invite first
      const pendingInviteToken = await AsyncStorage.getItem(PENDING_INVITE_KEY);

      if (pendingInviteToken) {
        // If we have an invite, go to the handler.
        // The handler is now responsible for clearing the token.
        navigation.replace('InviteHandler', { token: pendingInviteToken });
        return;
      }

      // If no invite, proceed with normal logic
      if (!activeWorkspace) {
        navigation.replace('LocksHome'); // Default screen for users without a workspace
        return;
      }

      if (role === 'admin' || role === 'owner') {
        navigation.replace('AdminHome');
      } else {
        navigation.replace('LocksHome');
      }
    };

    resolveRoute();
  }, [activeWorkspace, role, navigation]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0b0b0f',
  },
});

// DoorLockApp/screens/SignInScreen.jsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { signInWithClient } from '../services/auth';
import { ADMIN_CLIENT_ID, USER_CLIENT_ID } from '../services/oidc';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';

export default function SignInScreen() {
  const nav = useNavigation();

  const go = async clientId => {
    try {
      const { me } = await signInWithClient(clientId);
      const role = me?.user?.role;
      nav.reset({
        index: 0,
        routes: [{ name: role === 'admin' ? 'AdminHome' : 'Unlock' }],
      });
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Sign in failed', text2: String(e?.response?.data?.error || e?.message || e) })
    }
  };

  return (
    <View style={s.c}>
      <Text style={s.t}>Door Lock</Text>

      <TouchableOpacity
        style={[s.btn, { backgroundColor: '#7B1FA2' }]}
        onPress={() => go(ADMIN_CLIENT_ID)}
      >
        <Text style={s.bt}>Sign in as Admin</Text>
      </TouchableOpacity>

      <TouchableOpacity style={s.btn} onPress={() => go(USER_CLIENT_ID)}>
        <Text style={s.bt}>Sign in as User</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  c: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0b0b0f',
    gap: 16,
    padding: 24,
  },
  t: { color: 'white', fontSize: 22, fontWeight: '700', marginBottom: 16 },
  btn: {
    backgroundColor: '#444',
    padding: 14,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
  },
  bt: { color: 'white', fontWeight: '600' },
});

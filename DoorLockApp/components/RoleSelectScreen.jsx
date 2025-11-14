import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth } from '../auth/AuthContext';

export default function RoleSelectScreen() {
  const { signIn, loading } = useAuth();

  return (
    <View style={s.c}>
      <Text style={s.t}>Welcome to Smart Unlock</Text>
      <Text style={s.sub}>Your key to a secure and seamless life.</Text>

      <TouchableOpacity
        style={[s.btn, { backgroundColor: '#7B1FA2' }]}
        onPress={signIn}
        disabled={loading}
      >
        <Text style={s.bt}>{loading ? 'Loading...' : 'Sign In / Sign Up'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  c: {
    flex: 1,
    gap: 12,
    padding: 16,
    backgroundColor: '#0b0b0f',
    justifyContent: 'center',
  },
  t: {
    color: 'white',
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  sub: {
    color: '#aaa',
    fontSize: 16,
    fontWeight: '400',
    marginBottom: 20,
    textAlign: 'center',
  },
  btn: {
    backgroundColor: '#444',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  bt: { color: 'white', fontWeight: '600', fontSize: 16 },
});

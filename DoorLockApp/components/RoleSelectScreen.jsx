// DoorLockApp/screens/RoleSelectScreen.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function RoleSelectScreen() {
  const { signInAdmin, signInUser } = useAuth();

  return (
    <View style={s.c}>
      <Text style={s.t}>Sign in as</Text>
      <TouchableOpacity
        style={[s.btn, { backgroundColor: '#7B1FA2' }]}
        onPress={signInAdmin}
      >
        <Text style={s.bt}>Admin</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.btn} onPress={signInUser}>
        <Text style={s.bt}>User</Text>
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
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  btn: {
    backgroundColor: '#444',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  bt: { color: 'white', fontWeight: '600' },
});

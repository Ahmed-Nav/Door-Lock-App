import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function RoleSelectScreen({ navigation }) {
  return (
    <View style={s.c}>
      <Text style={s.t}>Sign in as…</Text>
      <TouchableOpacity
        style={s.btn}
        onPress={() => navigation.navigate('SignIn', { role: 'user' })}
      >
        <Text style={s.bt}>User</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[s.btn, { backgroundColor: '#7B1FA2' }]}
        onPress={() => navigation.navigate('SignIn', { role: 'admin' })}
      >
        <Text style={s.bt}>Admin</Text>
      </TouchableOpacity>
    </View>
  );
}
const s = StyleSheet.create({
  c: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#0b0b0f',
    padding: 24,
  },
  t: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 8 },
  btn: {
    backgroundColor: '#444',
    padding: 16,
    borderRadius: 12,
    width: '80%',
    alignItems: 'center',
  },
  bt: { color: '#fff', fontWeight: '700' },
});

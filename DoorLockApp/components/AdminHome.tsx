// DoorLockApp/components/AdminHome.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../auth/AuthContext';

export default function AdminHome() {
  const nav = useNavigation<any>();
  const { email, signOut } = useAuth();

  return (
    <View style={s.c}>
      <Text style={s.t}>Admin Home</Text>
      {email ? <Text style={s.sub}>Signed in as {email}</Text> : null}

      <TouchableOpacity style={s.btn} onPress={() => nav.navigate('Claim')}>
        <Text style={s.bt}>Claim a Lock</Text>
      </TouchableOpacity>

      <TouchableOpacity style={s.btn} onPress={() => nav.navigate('Groups')}>
        <Text style={s.bt}>Manage Groups</Text>
      </TouchableOpacity>

      <TouchableOpacity style={s.btn} onPress={() => nav.navigate('PushACL')}>
        <Text style={s.bt}>Push ACL</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[s.btn, { backgroundColor: '#a33' }]} onPress={signOut}>
        <Text style={s.bt}>Sign out</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, gap: 12, padding: 16, backgroundColor: '#0b0b0f' },
  t: { color: 'white', fontSize: 22, fontWeight: '700' },
  sub: { color: '#bbb', marginBottom: 8 },
  btn: { backgroundColor: '#444', padding: 14, borderRadius: 10, alignItems: 'center' },
  bt: { color: 'white', fontWeight: '600' },
});

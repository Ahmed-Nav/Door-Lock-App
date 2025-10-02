import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth } from '../auth/AuthContext';

export default function AdminHomeScreen({ navigation }) {
  const { email, signOut } = useAuth();

  return (
    <View style={s.c}>
      <Text style={s.title}>Admin Home</Text>
      <Text style={s.sub}>Signed in as {email || 'admin'}</Text>

      <TouchableOpacity
        style={s.btn}
        onPress={() => navigation.navigate('ClaimLock')}
      >
        <Text style={s.bt}>Claim Lock</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={s.btn}
        onPress={() => navigation.navigate('PushAcl')}
      >
        <Text style={s.bt}>Push ACL</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={s.btn}
        onPress={() => navigation.navigate('RebuildAcl')}
      >
        <Text style={s.bt}>Rebuild ACL</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={s.btn}
        onPress={() => navigation.navigate('Groups')}
      >
        <Text style={s.bt}>Groups</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={s.btn}
        onPress={() => navigation.navigate('Unlock')}
      >
        <Text style={s.bt}>Unlock</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[s.btn, { backgroundColor: '#8B0000', marginTop: 24 }]}
        onPress={signOut}
      >
        <Text style={s.bt}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, padding: 16, gap: 12, backgroundColor: '#0b0b0f' },
  title: { color: 'white', fontSize: 22, fontWeight: '800' },
  sub: { color: '#bbb', marginBottom: 12 },
  btn: {
    backgroundColor: '#7B1FA2',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  bt: { color: 'white', fontWeight: '600' },
});

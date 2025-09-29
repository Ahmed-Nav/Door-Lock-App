// components/AdminHomeScreen.jsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch } from 'react-native';
import { useAuthContext } from '../auth/AuthContext';

export default function AdminHomeScreen({ navigation }) {
  const {
    email,
    accountRole,
    persona,
    setPersona,
    switchAccount,
    clearSession,
    signIn,
  } = useAuthContext();

  return (
    <View style={s.c}>
      <Text style={s.title}>Admin Home</Text>
      <Text style={s.sub}>Signed in as {email || 'admin'}</Text>

      {accountRole === 'admin' && (
        <View style={{ marginBottom: 8 }}>
          <Text style={[s.sub, { marginBottom: 6 }]}>
            Act as user for unlocking
          </Text>
          <Switch
            value={persona === 'user'}
            onValueChange={v => setPersona(v ? 'user' : 'admin')}
          />
        </View>
      )}

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

      {/* Optional: go to Unlock even from admin */}
      <TouchableOpacity
        style={s.btn}
        onPress={() => navigation.navigate('Unlock')}
      >
        <Text style={s.bt}>Open Unlock</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[s.btn, { backgroundColor: '#8B0000', marginTop: 24 }]}
        onPress={clearSession}
      >
        <Text style={s.bt}>Sign Out (local)</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[s.btn, { backgroundColor: '#7B68EE' }]}
        onPress={async () => {
          await switchAccount();
          await signIn();
        }}
      >
        <Text style={s.bt}>Switch Account</Text>
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

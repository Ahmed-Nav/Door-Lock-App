// components/AdminHomeScreen.tsx (very small demo)
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';

type Nav = NativeStackNavigationProp<RootStackParamList, 'AdminHome'>;

export default function AdminHomeScreen() {
  const nav = useNavigation<Nav>();

  // Example lock
  const lock = { id: 101, name: 'Front Door' };

  return (
    <View style={s.c}>
      <View style={s.card}>
        <Text style={s.title}>{lock.name}</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          <TouchableOpacity
            style={s.btn}
            onPress={() => nav.navigate('Groups', { lockId: lock.id, lockName: lock.name })}
          >
            <Text style={s.bt}>Manage Access</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.btn} onPress={() => nav.navigate('Unlock')}>
            <Text style={s.bt}>Unlock</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={[s.btn, { backgroundColor: '#7B1FA2', marginTop: 16 }]}
        onPress={() => nav.navigate('ClaimLock')}
      >
        <Text style={s.bt}>Claim a new lock</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, padding: 16, backgroundColor: '#0b0b0f' },
  card: { borderWidth: 1, borderColor: '#2a2a33', borderRadius: 10, padding: 12 },
  title: { color: '#fff', fontWeight: '700' },
  btn: { backgroundColor: '#1d1d25', padding: 12, borderRadius: 8 },
  bt: { color: '#fff', fontWeight: '600' },
});

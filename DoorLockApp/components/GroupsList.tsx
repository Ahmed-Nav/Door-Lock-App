// DoorLockApp/components/GroupsList.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Alert, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../auth/AuthContext';
import { listGroups, createGroup } from '../services/apiService';

export default function GroupsList() {
  const { token } = useAuth();
  const nav = useNavigation<any>();
  const [groups, setGroups] = useState<any[]>([]);
  const [name, setName] = useState('');

  async function load() {
    try {
      const r = await listGroups(token!);
      setGroups(r.groups || []);
    } catch (e) {
      Alert.alert('Error', 'Failed to load groups');
    }
  }

  useEffect(() => { load(); }, []);

  async function onCreate() {
    try {
      if (!name.trim()) return;
      await createGroup(token!, name.trim());
      setName('');
      await load();
    } catch {
      Alert.alert('Error', 'Create failed');
    }
  }

  return (
    <View style={s.c}>
      <Text style={s.t}>Groups</Text>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput style={[s.in, { flex: 1 }]} value={name} onChangeText={setName} placeholder="New group name" />
        <TouchableOpacity style={s.btn} onPress={onCreate}><Text style={s.bt}>Create</Text></TouchableOpacity>
      </View>

      <ScrollView style={{ marginTop: 12 }}>
        {groups.map(g => (
          <TouchableOpacity key={g._id} style={s.item} onPress={() => nav.navigate('GroupDetail', { id: g._id, name: g.name })}>
            <Text style={s.itemt}>{g.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, padding: 16, gap: 12, backgroundColor: '#0b0b0f' },
  t: { color: 'white', fontSize: 20, fontWeight: '700' },
  in: { backgroundColor: '#1d1d25', color: 'white', borderRadius: 8, padding: 12 },
  btn: { backgroundColor: '#444', padding: 14, borderRadius: 10, alignItems: 'center' },
  bt: { color: 'white', fontWeight: '600' },
  item: { backgroundColor: '#15151d', padding: 14, borderRadius: 8, marginBottom: 8 },
  itemt: { color: 'white' },
});

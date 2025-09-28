// DoorLockApp/components/GroupsScreen.jsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../auth/AuthContext';
import { listGroups, createGroup } from '../services/apiService';

export default function GroupsScreen() {
  const { token, role } = useAuth();
  const nav = useNavigation();
  const [groups, setGroups] = useState([]);
  const [name, setName] = useState('');

  async function load() {
    try {
      if (role !== 'admin') return;
      const res = await listGroups(token); // ✅ correct API for list
      setGroups(res?.groups || []);
    } catch (e) {
      Alert.alert('Error', String(e?.response?.data?.err || e?.message || e));
    }
  }

  useEffect(() => {
    load();
  }, []);

  const onCreate = async () => {
    if (!name.trim()) return;
    try {
      await createGroup(token, name.trim());
      setName('');
      await load();
    } catch (e) {
      Alert.alert(
        'Create failed',
        String(e?.response?.data?.err || e?.message || e),
      );
    }
  };

  return (
    <View style={s.c}>
      <Text style={s.t}>Groups</Text>

      <View style={s.row}>
        <TextInput
          style={[s.in, { flex: 1 }]}
          placeholder="New group name"
          placeholderTextColor="#888"
          value={name}
          onChangeText={setName}
        />
        <TouchableOpacity style={s.btn} onPress={onCreate}>
          <Text style={s.bt}>Create</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={groups}
        keyExtractor={g => g._id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={s.card}
            onPress={() => nav.navigate('GroupDetail', { groupId: item._id })} // ➜ manage members here
          >
            <Text style={s.cardTitle}>{item.name}</Text>
            <Text style={s.cardMeta}>
              users: {item.userCount ?? item.userIds?.length ?? 0} • locks:{' '}
              {item.lockCount ?? item.lockIds?.length ?? 0}
            </Text>
          </TouchableOpacity>
        )}
        style={{ marginTop: 12 }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, padding: 16, backgroundColor: '#0b0b0f' },
  t: { color: 'white', fontSize: 20, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 10 },
  in: {
    backgroundColor: '#1d1d25',
    color: 'white',
    borderRadius: 8,
    padding: 12,
  },
  btn: {
    backgroundColor: '#7B1FA2',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  bt: { color: 'white', fontWeight: '600' },
  card: {
    borderWidth: 1,
    borderColor: '#2a2a33',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  cardTitle: { color: '#fff', fontWeight: '700' },
  cardMeta: { color: '#aaa', marginTop: 4 },
});

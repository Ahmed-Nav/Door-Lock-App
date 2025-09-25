// DoorLockApp/components/GroupsList.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../auth/AuthContext';
import { listGroups, createGroup } from '../services/apiService';
import { RootStackParamList } from '../App';

export default function GroupsList() {
  const { token } = useAuth();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [groups, setGroups] = useState<any[]>([]);
  const [name, setName] = useState('');

  async function load() {
    try {
      const r = await listGroups(token);
      setGroups(r.groups || []);
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
      load();
    } catch (e) {
      Alert.alert('Error', String(e?.response?.data?.err || e?.message || e));
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={s.card} onPress={() => nav.navigate('GroupDetail', { groupId: item._id })}>
      <Text style={s.title}>{item.name}</Text>
      <Text style={s.sub}>
        users: {item.userCount ?? item.userIds?.length ?? 0} • locks: {item.lockCount ?? item.lockIds?.length ?? 0}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={s.c}>
      <Text style={s.h}>Groups</Text>

      <View style={s.row}>
        <TextInput style={s.in} placeholder="New group name" placeholderTextColor="#888" value={name} onChangeText={setName} />
        <TouchableOpacity style={s.btn} onPress={onCreate}>
          <Text style={s.bt}>Create</Text>
        </TouchableOpacity>
      </View>

      <FlatList data={groups} keyExtractor={(g) => g._id} renderItem={renderItem} />
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: '#0b0b0f', padding: 16 },
  h: { color: 'white', fontSize: 20, fontWeight: '700', marginBottom: 12 },
  row: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  in: { flex: 1, backgroundColor: '#1d1d25', color: 'white', borderRadius: 10, padding: 12 },
  btn: { backgroundColor: '#7B1FA2', paddingHorizontal: 16, justifyContent: 'center', borderRadius: 10 },
  bt: { color: 'white', fontWeight: '700' },
  card: { backgroundColor: '#1d1d25', padding: 14, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#6d28d9' },
  title: { color: 'white', fontWeight: '700', marginBottom: 4 },
  sub: { color: '#aaa' },
});

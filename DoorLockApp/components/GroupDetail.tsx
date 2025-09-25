// components/GroupDetail.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, Alert, StyleSheet } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAuth } from '../auth/AuthContext';
import {
  getGroup,
  removeUserFromGroup,
  unassignLockFromGroup,
  deleteGroup,
} from '../services/apiService';

export default function GroupDetail() {
  const { token } = useAuth();
  const route = useRoute<any>();
  const nav = useNavigation();
  const groupId = route.params?.groupId;
  const [g, setG] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const d = await getGroup(token, groupId);
      setG(d.group);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [groupId]);

  const doRemoveUser = async (email: string) => {
    try {
      await removeUserFromGroup(token, groupId, email);
      await load();
    } catch (e) {
      Alert.alert('Error', String(e?.response?.data?.err || e?.message || e));
    }
  };

  const doUnassignLock = async (lockId: number) => {
    try {
      await unassignLockFromGroup(token, groupId, lockId);
      await load();
    } catch (e) {
      Alert.alert('Error', String(e?.response?.data?.err || e?.message || e));
    }
  };

  const doDeleteGroup = async () => {
    Alert.alert('Delete group?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteGroup(token, groupId);
            nav.goBack();
          } catch (e) {
            Alert.alert('Error', String(e?.response?.data?.err || e?.message || e));
          }
        },
      },
    ]);
  };

  if (loading || !g) {
    return (
      <View style={s.c}>
        <Text style={s.t}>Loading…</Text>
      </View>
    );
  }

  return (
    <View style={s.c}>
      <Text style={s.h}>Group: {g.name}</Text>

      <Text style={s.t2}>Users</Text>
      <FlatList
        data={g.users}
        keyExtractor={(u) => u.id}
        renderItem={({ item }) => (
          <View style={s.row}>
            <Text style={s.rowText}>{item.email}</Text>
            <TouchableOpacity style={[s.btn, { backgroundColor: '#9b1c1c' }]} onPress={() => doRemoveUser(item.email)}>
              <Text style={s.btnText}>Remove</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={<Text style={s.empty}>No users</Text>}
      />

      <Text style={[s.t2, { marginTop: 12 }]}>Locks</Text>
      <FlatList
        data={g.lockIds}
        keyExtractor={(id) => String(id)}
        renderItem={({ item }) => (
          <View style={s.row}>
            <Text style={s.rowText}>Lock #{item}</Text>
            <TouchableOpacity style={[s.btn, { backgroundColor: '#9b1c1c' }]} onPress={() => doUnassignLock(item)}>
              <Text style={s.btnText}>Unassign</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={<Text style={s.empty}>No locks</Text>}
      />

      <TouchableOpacity style={[s.btn, { backgroundColor: '#7B1FA2', marginTop: 16 }]} onPress={load}>
        <Text style={s.btnText}>Refresh</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[s.btn, { backgroundColor: '#6b21a8', marginTop: 8 }]} onPress={doDeleteGroup}>
        <Text style={s.btnText}>Delete Group</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: '#0b0b0f', padding: 16 },
  h: { color: 'white', fontSize: 20, fontWeight: '700', marginBottom: 8 },
  t: { color: 'white' },
  t2: { color: '#ddd', fontWeight: '700', marginTop: 6, marginBottom: 6 },
  row: {
    backgroundColor: '#1d1d25',
    padding: 12,
    marginBottom: 8,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowText: { color: 'white' },
  btn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  btnText: { color: 'white', fontWeight: '600' },
  empty: { color: '#888', marginBottom: 8 },
});

// DoorLockApp/components/GroupDetail.tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, Alert, StyleSheet, TextInput,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAuth } from '../auth/AuthContext';
import {
  getGroup,
  addUserToGroup,
  assignLockToGroup,
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
  const [email, setEmail] = useState('');
  const [lockId, setLockId] = useState('');

  async function load() {
    setLoading(true);
    try {
      const d = await getGroup(token, groupId);
      setG(d.group);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [groupId]);

  // ---- add / assign (moved here) ----
  const doAddUser = async () => {
    if (!email.trim()) return;
    try {
      await addUserToGroup(token, groupId, email.trim());
      setEmail('');
      await load();
    } catch (e) {
      Alert.alert('Add user failed', String(e?.response?.data?.err || e?.message || e));
    }
  };

  const doAssignLock = async () => {
    if (!lockId.trim()) return;
    try {
      await assignLockToGroup(token, groupId, Number(lockId));
      setLockId('');
      await load();
    } catch (e) {
      Alert.alert('Assign lock failed', String(e?.response?.data?.err || e?.message || e));
    }
  };

  // ---- existing remove / unassign / delete ----
  const doRemoveUser = async (userEmail: string) => {
    try {
      await removeUserFromGroup(token, groupId, userEmail);
      await load();
    } catch (e) {
      Alert.alert('Error', String(e?.response?.data?.err || e?.message || e));
    }
  };

  const doUnassignLock = async (id: number) => {
    try {
      await unassignLockFromGroup(token, groupId, id);
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

      {/* Add user / assign lock */}
      <View style={s.row}>
        <TextInput
          style={[s.in, { flex: 1 }]}
          placeholder="user email"
          placeholderTextColor="#888"
          value={email}
          onChangeText={setEmail}
        />
        <TouchableOpacity style={[s.btn, { backgroundColor: '#7B1FA2' }]} onPress={doAddUser}>
          <Text style={s.btnText}>Add user</Text>
        </TouchableOpacity>
      </View>

      <View style={s.row}>
        <TextInput
          style={[s.in, { flex: 1 }]}
          placeholder="lock id"
          placeholderTextColor="#888"
          keyboardType="numeric"
          value={lockId}
          onChangeText={setLockId}
        />
        <TouchableOpacity style={[s.btn, { backgroundColor: '#7B1FA2' }]} onPress={doAssignLock}>
          <Text style={s.btnText}>Assign lock</Text>
        </TouchableOpacity>
      </View>

      <Text style={s.t2}>Users</Text>
      <FlatList
        data={g.users}
        keyExtractor={(u) => u.id}
        renderItem={({ item }) => (
          <View style={s.rowItem}>
            <Text style={s.rowText}>{item.email}</Text>
            <TouchableOpacity
              style={[s.btn, { backgroundColor: '#9b1c1c' }]}
              onPress={() => doRemoveUser(item.email)}
            >
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
          <View style={s.rowItem}>
            <Text style={s.rowText}>Lock #{item}</Text>
            <TouchableOpacity
              style={[s.btn, { backgroundColor: '#9b1c1c' }]}
              onPress={() => doUnassignLock(item)}
            >
              <Text style={s.btnText}>Unassign</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={<Text style={s.empty}>No locks</Text>}
      />

      <TouchableOpacity style={[s.btn, { backgroundColor: '#6b21a8', marginTop: 16 }]} onPress={doDeleteGroup}>
        <Text style={s.btnText}>Delete Group</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: '#0b0b0f', padding: 16 },
  h: { color: 'white', fontSize: 20, fontWeight: '700', marginBottom: 8 },
  t: { color: 'white' },
  t2: { color: '#ddd', fontWeight: '700', marginTop: 12, marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  in: { backgroundColor: '#1d1d25', color: 'white', borderRadius: 10, padding: 12 },
  btn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 },
  btnText: { color: 'white', fontWeight: '700' },
  rowItem: {
    backgroundColor: '#1d1d25',
    padding: 12,
    marginBottom: 8,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowText: { color: 'white' },
  empty: { color: '#888', marginBottom: 8 },
});

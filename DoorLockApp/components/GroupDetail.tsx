// DoorLockApp/components/GroupDetail.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, ScrollView } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAuth } from '../auth/AuthContext';
import { addUserToGroup, assignLockToGroup, rebuildAcl, listGroups } from '../services/apiService';

export default function GroupDetail() {
  const route = useRoute<any>();
  const nav = useNavigation<any>();
  const { token } = useAuth();
  const { id, name } = route.params;

  // For simplicity we reload the list and pick the current group to show members/locks
  const [group, setGroup] = useState<any>(null);
  const [userEmail, setUserEmail] = useState('');
  const [lockId, setLockId] = useState('');

  async function load() {
    try {
      const r = await listGroups(token!);
      const g = (r.groups || []).find((x: any) => x._id === id);
      setGroup(g || null);
    } catch {
      Alert.alert('Error', 'Failed to load group');
    }
  }
  useEffect(() => { load(); }, []);

  async function onAddUser() {
    try {
      if (!userEmail.trim()) return;
      await addUserToGroup(token!, id, userEmail.trim());
      setUserEmail('');
      await load();
    } catch { Alert.alert('Error', 'Add user failed'); }
  }

  async function onAddLock() {
    try {
      const n = Number(lockId);
      if (!n) return;
      await assignLockToGroup(token!, id, n);
      setLockId('');
      await load();
    } catch { Alert.alert('Error', 'Add lock failed'); }
  }

  async function onRebuild(lockIdNum: number) {
    try {
      const r = await rebuildAcl(token!, lockIdNum);
      Alert.alert('ACL', `Built v${r.version || '?'} for lock ${lockIdNum}`, [
        { text: 'Push now', onPress: () => nav.navigate('PushACL', { lockId: String(lockIdNum) }) },
        { text: 'OK' }
      ]);
    } catch { Alert.alert('Error', 'Rebuild failed'); }
  }

  return (
    <View style={s.c}>
      <Text style={s.t}>Group: {name}</Text>

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
        <TextInput style={[s.in, { flex: 1 }]} value={userEmail} onChangeText={setUserEmail} placeholder="user@domain.com" />
        <TouchableOpacity style={s.btn} onPress={onAddUser}><Text style={s.bt}>Add user</Text></TouchableOpacity>
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
        <TextInput style={[s.in, { flex: 1 }]} value={lockId} onChangeText={setLockId} placeholder="Lock ID" keyboardType="numeric" />
        <TouchableOpacity style={s.btn} onPress={onAddLock}><Text style={s.bt}>Add lock</Text></TouchableOpacity>
      </View>

      <ScrollView style={{ marginTop: 16 }}>
        <Text style={s.h}>Users</Text>
        {(group?.userIds || []).map((u: any) => (
          <View key={u} style={s.pill}><Text style={s.pillt}>{u}</Text></View>
        ))}

        <Text style={[s.h, { marginTop: 12 }]}>Locks</Text>
        {(group?.lockIds || []).map((lid: number) => (
          <View key={lid} style={s.lockRow}>
            <Text style={s.lockTxt}>Lock {lid}</Text>
            <TouchableOpacity style={[s.btn, { paddingVertical: 8 }]} onPress={() => onRebuild(lid)}>
              <Text style={s.bt}>Rebuild ACL</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, padding: 16, backgroundColor: '#0b0b0f' },
  t: { color: 'white', fontSize: 20, fontWeight: '700' },
  h: { color: '#bbb', marginTop: 4, marginBottom: 6 },
  in: { backgroundColor: '#1d1d25', color: 'white', borderRadius: 8, padding: 12 },
  btn: { backgroundColor: '#444', padding: 14, borderRadius: 10, alignItems: 'center' },
  bt: { color: 'white', fontWeight: '600' },
  pill: { backgroundColor: '#15151d', padding: 8, borderRadius: 8, marginBottom: 6 },
  pillt: { color: '#ddd' },
  lockRow: { backgroundColor: '#15151d', padding: 12, borderRadius: 8, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lockTxt: { color: '#fff' },
});

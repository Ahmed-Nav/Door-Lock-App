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
import { useNavigation, useRoute } from '@react-navigation/native'; 
import { useAuth } from '../auth/AuthContext';
import {
  listGroups,
  createGroup,
  rebuildAcl, 
} from '../services/apiService';

export default function GroupsScreen() {
  const { token, role } = useAuth();
  const nav = useNavigation();
  const route = useRoute();
  const ctxLockId = route.params?.lockId ?? null; 
  const ctxLockName = route.params?.lockName ?? null; 
  const [groups, setGroups] = useState([]);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false); 

  async function load() {
    try {
      if (role !== 'admin') return;
      const res = await listGroups(token);
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

  
  const onUpdateAccess = async () => {
    if (busy) return;
    if (!ctxLockId) {
      Alert.alert(
        'Pick a lock',
        'Open this screen via “Manage Access” on a lock.',
      );
      return;
    }
    try {
      setBusy(true);
      const res = await rebuildAcl(token, Number(ctxLockId));
      if (!res?.ok) {
        if (res?.err === 'missing-userpubs') {
          const missingList = (res.missing || [])
            .map(m => m.email || m.id)
            .join('\n• ');
          return Alert.alert(
            'Missing device keys',
            `Some users don’t have device keys yet:\n\n• ${missingList}`,
          );
        }
        throw new Error(res?.err || 'rebuild-failed');
      }

      Alert.alert(
        'Access updated',
        `ACL v${res.envelope?.payload?.version} built for Lock #${ctxLockId}.`,
        [
          {
            text: 'Send to Lock',
            onPress: () =>
              nav.navigate('PushAcl', {
                lockId: Number(ctxLockId),
                envelope: res.envelope, 
              }),
          },
          { text: 'Close' },
        ],
      );
    } catch (e) {
      Alert.alert('Error', String(e?.response?.data?.err || e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={s.c}>
      <Text style={s.t}>Groups</Text>

      
      {ctxLockId ? (
        <Text style={{ color: '#bbb', marginBottom: 6 }}>
          Managing access for Lock #{ctxLockId}
          {ctxLockName ? ` (${ctxLockName})` : ''}
        </Text>
      ) : null}

     
      {ctxLockId ? (
        <TouchableOpacity
          style={[s.btn, { backgroundColor: '#7B1FA2', marginBottom: 6 }]}
          onPress={onUpdateAccess}
          disabled={busy}
        >
          <Text style={s.bt}>
            {busy
              ? 'Building ACL…'
              : `Update user access for Lock #${ctxLockId}`}
          </Text>
        </TouchableOpacity>
      ) : null}

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
            onPress={() => nav.navigate('GroupDetail', { groupId: item._id })}
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
    backgroundColor: '#1d1d25',
    padding: 12,
    borderRadius: 8,
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

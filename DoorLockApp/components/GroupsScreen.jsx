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
import { useAuth } from '../auth/AuthContext';
import {
  getGroup,
  createGroup,
  addUserToGroup,
  assignLockToGroup,
} from '../services/apiService';
import { useRoute,useNavigation } from '@react-navigation/native';


export default function GroupsScreen() {
  const { token, role } = useAuth();
  const [groups, setGroups] = useState([]);
  const [name, setName] = useState('');
  const [selected, setSelected] = useState(null);
  const [userEmail, setUserEmail] = useState('');
  const [lockId, setLockId] = useState('');
  const navigation = useNavigation();

  const load = async () => {
    try {
      if (role !== 'admin') return;
      const res = await getGroup(token);
      setGroups(res?.groups || []);
    } catch (e) {
      Alert.alert('Error', String(e?.response?.data?.err || e?.message || e));
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onCreate = async () => {
    try {
      if (!name.trim()) return;
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

  const onAddUser = async () => {
    try {
      if (!selected || !userEmail.trim()) return;
      await addUserToGroup(token, selected._id, userEmail.trim());
      setUserEmail('');
      await load();
    } catch (e) {
      Alert.alert(
        'Add user failed',
        String(e?.response?.data?.err || e?.message || e),
      );
    }
  };

  const onAssignLock = async () => {
    try {
      if (!selected || !lockId.trim()) return;
      await assignLockToGroup(token, selected._id, Number(lockId));
      setLockId('');
      await load();
    } catch (e) {
      Alert.alert(
        'Assign lock failed',
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
            style={[
              s.card,
              selected?._id === item._id && { borderColor: '#7B1FA2' },
            ]}
            onPress={() =>
              navigation.navigate('GroupDetail', { groupId: item._id })
            }
          >
            <Text style={s.cardTitle}>{item.name}</Text>
            <Text style={s.cardMeta}>
              users: {item.userIds?.length || 0} • locks:{' '}
              {item.lockIds?.length || 0}
            </Text>
          </TouchableOpacity>
        )}
        style={{ marginTop: 12 }}
      />

      {selected && (
        <View style={{ marginTop: 16, gap: 10 }}>
          <Text style={s.sub}>Selected: {selected.name}</Text>
          <View style={s.row}>
            <TextInput
              style={[s.in, { flex: 1 }]}
              placeholder="user email"
              value={userEmail}
              onChangeText={setUserEmail}
            />
            <TouchableOpacity style={s.btn} onPress={onAddUser}>
              <Text style={s.bt}>Add User</Text>
            </TouchableOpacity>
          </View>
          <View style={s.row}>
            <TextInput
              style={[s.in, { flex: 1 }]}
              placeholder="lock id"
              keyboardType="numeric"
              value={lockId}
              onChangeText={setLockId}
            />
            <TouchableOpacity style={s.btn} onPress={onAssignLock}>
              <Text style={s.bt}>Assign Lock</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, padding: 16, backgroundColor: '#0b0b0f' },
  t: { color: 'white', fontSize: 20, fontWeight: '700' },
  sub: { color: '#bbb' },
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

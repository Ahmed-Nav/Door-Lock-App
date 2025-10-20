// DoorLockApp/components/GroupDetail.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAuth } from '../auth/AuthContext';
import {
  getGroup,
  addUserToGroup,
  assignLockToGroup,
  removeUserFromGroup,
  unassignLockFromGroup,
  deleteGroup,
  listUsers,
  listLocks,
} from '../services/apiService';
import Toast from 'react-native-toast-message';

export default function GroupDetail() {
  const { token } = useAuth();
  const route = useRoute<any>();
  const nav = useNavigation();
  const groupId = route.params?.groupId;

  const [g, setG] = useState<any>(null);
  const [loading, setLoading] = useState(true);


  const [userOpen, setUserOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [userOptions, setUserOptions] = useState<{ label: string; value: string }[]>([]);

  const [lockOpen, setLockOpen] = useState(false);
  const [selectedLock, setSelectedLock] = useState<number | null>(null);
  const [lockOptions, setLockOptions] = useState<{ label: string; value: number }[]>([]);

  
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await getGroup(token, groupId);
      setG(d.group);
    } finally {
      setLoading(false);
    }
  }, [token, groupId]);

  useEffect(() => {
    load();
  }, [load]);

  
  const loadDropdowns = useCallback(async () => {
  try {
    const [usersRes, locksRes] = await Promise.all([
      listUsers(token),
      listLocks(token),
    ]);

    const groupUsers = g?.users?.map((u: any) => u.email) || [];
    const groupLocks = g?.lockIds || [];

    const usersArray = Array.isArray(usersRes)
      ? usersRes
      : usersRes?.users || [];
    const locksArray = Array.isArray(locksRes)
      ? locksRes
      : locksRes?.locks || [];

    console.log('Dropdown → users:', usersArray);
    console.log('Dropdown → locks:', locksArray);

    const filteredUsers = usersArray
      .filter((u: any) => !groupUsers.includes(u.email))
      .map((u: any) => ({ label: u.email, value: u.email }));

    const filteredLocks = locksArray
  .filter((l: any) => !groupLocks.includes(l.lockId))
  .map((l: any) => ({
    label: `Lock #${l.lockId}${l.name ? ` (${l.name})` : ''}`,
    value: l.lockId,
  }));

    setUserOptions(filteredUsers);
    setLockOptions(filteredLocks);
  } catch (e) {
    console.warn('Dropdown load failed', e);
  }
}, [token, g]);

  useEffect(() => {
    if (g) loadDropdowns();
  }, [g, loadDropdowns]);

  
  const doAddUser = async () => {
    if (!selectedUser) return Toast.show({ type: 'info', text1: 'Select a user first' }) 
    try {
      await addUserToGroup(token, groupId, selectedUser);
      setSelectedUser(null);
      await load();
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Add user failed', text2: String(e?.response?.data?.err || e?.message || e) })
    }
  };

  const doAssignLock = async () => {
    if (!selectedLock) return Toast.show({ type: 'info', text1: 'Select a lock first' }) 
    try {
      await assignLockToGroup(token, groupId, selectedLock);
      setSelectedLock(null);
      await load();
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Assign lock failed', text2: String(e?.response?.data?.err || e?.message || e) })
    }
  };

  const doRemoveUser = async (userEmail: string) => {
    try {
      await removeUserFromGroup(token, groupId, userEmail);
      await load();
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Error', text2: String(e?.response?.data?.err || e?.message || e) })
    }
  };

  const doUnassignLock = async (id: number) => {
    try {
      await unassignLockFromGroup(token, groupId, id);
      await load();
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Error', text2: String(e?.response?.data?.err || e?.message || e) })
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
            Toast.show({ type: 'error', text1: 'Error', text2: String(e?.response?.data?.err || e?.message || e) })
          }
        },
      },
    ]);
  };

  if (loading || !g) {
    return (
      <View style={s.center}>
        <ActivityIndicator color="#7B1FA2" />
        <Text style={s.loadingText}>Loading…</Text>
      </View>
    );
  }

  return (
    <View style={s.c}>
      <Text style={s.h}>Group: {g.name}</Text>

      <Text style={s.sub}>Add User</Text>
      <View
        style={{
          zIndex: userOpen ? 2000 : 1000,
          elevation: userOpen ? 2000 : 1000,
        }}
      >
        <DropDownPicker
          open={userOpen}
          value={selectedUser}
          items={userOptions}
          setOpen={setUserOpen}
          setValue={setSelectedUser}
          setItems={setUserOptions}
          placeholder="Select user"
          style={s.dropdown}
          textStyle={{ color: 'white' }}
          dropDownContainerStyle={s.dropdownContainer}
          placeholderStyle={{ color: '#888' }}
          onOpen={() => setLockOpen(false)}
        />
      </View>
      <TouchableOpacity
        style={[s.btn, { backgroundColor: '#7B1FA2' }]}
        onPress={doAddUser}
      >
        <Text style={s.btnText}>Add user</Text>
      </TouchableOpacity>

      <Text style={[s.sub, { marginTop: 12 }]}>Assign Lock</Text>
      <View
        style={{
          zIndex: lockOpen ? 2000 : 1000,
          elevation: lockOpen ? 2000 : 1000,
        }}
      >
        <DropDownPicker
          open={lockOpen}
          value={selectedLock}
          items={lockOptions}
          setOpen={setLockOpen}
          setValue={setSelectedLock}
          setItems={setLockOptions}
          placeholder="Select lock"
          style={s.dropdown}
          textStyle={{ color: 'white' }}
          dropDownContainerStyle={s.dropdownContainer}
          placeholderStyle={{ color: '#888' }}
          // 👇 closes user dropdown safely
          onOpen={() => setUserOpen(false)}
        />
      </View>
      <TouchableOpacity
        style={[s.btn, { backgroundColor: '#7B1FA2' }]}
        onPress={doAssignLock}
      >
        <Text style={s.btnText}>Assign lock</Text>
      </TouchableOpacity>

      <Text style={s.t2}>Users</Text>
      <FlatList
        data={g.users}
        keyExtractor={u => u.id}
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
        keyExtractor={id => String(id)}
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

      <TouchableOpacity
        style={[s.btn, { backgroundColor: '#6b21a8', marginTop: 16 }]}
        onPress={doDeleteGroup}
      >
        <Text style={s.btnText}>Delete Group</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: '#0b0b0f', padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0b0b0f' },
  loadingText: { color: '#bbb', marginTop: 8 },
  h: { color: 'white', fontSize: 20, fontWeight: '700', marginBottom: 8 },
  sub: { color: '#ddd', fontWeight: '700', marginTop: 8, marginBottom: 4 },
  t2: { color: '#ddd', fontWeight: '700', marginTop: 16, marginBottom: 6 },
  dropdown: {
    backgroundColor: '#1d1d25',
    borderColor: '#2a2a33',
    marginBottom: 8,
  },
  dropdownContainer: {
    backgroundColor: '#1d1d25',
    borderColor: '#2a2a33',
  },
  btn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, marginBottom: 6 },
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

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
  removeUserFromGroup,
  deleteGroup,
  listUsers
} from '../services/apiService';
import Toast from 'react-native-toast-message';

export default function GroupDetail() {
  const { token, activeWorkspace } = useAuth();
  const route = useRoute<any>();
  const nav = useNavigation();
  const groupId = route.params?.groupId;
  console.log('GroupDetail: route.params:', route.params);

  const [g, setG] = useState<any>(null);
  const [loading, setLoading] = useState(true);


  const [userOpen, setUserOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [userOptions, setUserOptions] = useState<{ label: string; value: string }[]>([]);
 
  const load = useCallback(async () => {
    console.log('GroupDetail: load start');
    if (!token || !activeWorkspace || !groupId) {
      setLoading(false);
      console.log('GroupDetail: load end (no token/workspace/groupId)');
      return;
    }
    setLoading(true);
    try {
      const d = await getGroup(token, activeWorkspace.workspace_id, groupId);
      console.log('GroupDetail: getGroup response', d);
      setG(d.group);
    } catch (e) {
      console.error('GroupDetail: getGroup failed', e);
    } finally {
      setLoading(false);
      console.log('GroupDetail: load end');
    }
  }, [token, activeWorkspace, groupId]);

  useEffect(() => {
    load();
  }, [load]);

  
  const loadDropdowns = useCallback(async () => {
    if (!token || !activeWorkspace || !g) return;
  try {
    const [usersRes] = await Promise.all([
      listUsers(token, activeWorkspace.workspace_id)
    ]);

    const groupUsers = g?.users?.map((u: any) => u.email) || [];

    const usersArray = Array.isArray(usersRes)
      ? usersRes
      : usersRes?.users || [];

    console.log('Dropdown → users:', usersArray);

    const filteredUsers = usersArray
      .filter((u: any) => !groupUsers.includes(u.email))
      .map((u: any) => ({ label: u.email, value: u.email }));

    setUserOptions(filteredUsers);
  } catch (e) {
    console.warn('Dropdown load failed', e);
  }
}, [token, activeWorkspace, g]);

  useEffect(() => {
    if (g) loadDropdowns();
  }, [g, loadDropdowns]);

  
  const doAddUser = async () => {
    if (!selectedUser) return Toast.show({ type: 'info', text1: 'Select a user first' });
    if (!token || !activeWorkspace) return; 
    try {
      await addUserToGroup(token, activeWorkspace.workspace_id, groupId, selectedUser);
      setSelectedUser(null);
      await load();
      Toast.show({ type: 'success', text1: 'User Added', text2: `${selectedUser} has been added to the group.` });
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Add user failed', text2: String(e?.response?.data?.err || e?.message || e) })
    }
  };

  const doRemoveUser = async (userEmail: string) => {
    if (!token || !activeWorkspace) return;
    try {
      await removeUserFromGroup(token, activeWorkspace.workspace_id, groupId, userEmail);
      await load();
      Toast.show({ type: 'success', text1: 'User Removed', text2: `${userEmail} has been removed from the group.` });
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Error', text2: String(e?.response?.data?.err || e?.message || e) })
    }
  };

  const doDeleteGroup = async () => {
    if (!token || !activeWorkspace) return;
    Alert.alert('Delete group?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteGroup(token, activeWorkspace.workspace_id, groupId);
            nav.goBack();
          } catch (e) {
            Toast.show({ type: 'error', text1: 'Error', text2: String(e?.response?.data?.err || e?.message || e) })
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color="#7B1FA2" />
        <Text style={s.loadingText}>Loading…</Text>
      </View>
    );
  }

  if (!g) {
    return (
      <View style={s.center}>
        <Text style={s.loadingText}>Group not found.</Text>
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
        />
      </View>
      <TouchableOpacity
        style={[s.btn, { backgroundColor: '#7B1FA2' }]}
        onPress={doAddUser}
      >
        <Text style={s.btnText}>Add user</Text>
      </TouchableOpacity>

      <Text style={s.t2}>Users</Text>
      <FlatList
        data={g.users}
        keyExtractor={u => u._id}
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

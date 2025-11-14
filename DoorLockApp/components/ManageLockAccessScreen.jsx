
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Platform,
  PermissionsAndroid,
  ActivityIndicator,
  Switch,
  TextInput,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../auth/AuthContext';
import Toast from 'react-native-toast-message';
import {
  listUsers,
  rebuildAcl,
  fetchLatestAcl,
  listGroups,
  createGroup,
  addUserToGroup,
  removeUserFromGroup,
  getGroup,
  inviteUser,
  assignLockToGroup,
  updateUserRole,
  deleteUser,
} from '../services/apiService';
import {
  scanAndConnectForLockId,
  sendAcl,
  safeDisconnect,
} from '../ble/bleManager';
import DropDownPicker from 'react-native-dropdown-picker';

const InviteForm = ({ onInviteSuccess }) => {
  const { token, activeWorkspace } = useAuth();
  const [isInviting, setIsInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState(null);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [roleItems, setRoleItems] = useState([
    { label: 'Admin', value: 'admin' },
    { label: 'User', value: 'user' },
  ]);

  const handleInvite = async () => {
    if (!inviteEmail || !inviteRole) {
      Toast.show({ type: 'error', text1: 'Missing fields' });
      return;
    }
    if (!token || !activeWorkspace) return;

    setIsInviting(true);
    try {
      await inviteUser(
        token,
        activeWorkspace.workspace_id,
        inviteEmail,
        inviteRole,
      );
      Toast.show({
        type: 'success',
        text1: 'Invite Sent',
        text2: `Invite successfully sent to ${inviteEmail}`,
      });
      setInviteEmail('');
      setInviteRole(null);
      onInviteSuccess();
    } catch (anyErr) {
      const err = anyErr;
      console.error(err?.response?.data);
      Toast.show({
        type: 'error',
        text1: 'Invite Failed',
        text2: err?.response?.data?.message || 'An error occurred',
      });
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <View style={[s.card, { zIndex: 1000, marginBottom: 12, flexDirection: 'column', alignItems: 'stretch' }]}>
      <Text style={s.cardTitle}>Invite New User</Text>
      <TextInput
        style={s.input}
        placeholder="Enter user email"
        placeholderTextColor="#888"
        value={inviteEmail}
        onChangeText={setInviteEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <DropDownPicker
        open={roleDropdownOpen}
        value={inviteRole}
        items={roleItems}
        setOpen={setRoleDropdownOpen}
        setValue={setInviteRole}
        setItems={setRoleItems}
        placeholder="Select a role"
        style={s.dropdown}
        textStyle={{ color: 'white' }}
        dropDownContainerStyle={s.dropdownContainer}
        zIndex={1000}
      />
      <TouchableOpacity
        style={[s.btn, { backgroundColor: '#7B1FA2' }]}
        onPress={handleInvite}
        disabled={isInviting || !inviteEmail || !inviteRole}>
        <Text style={s.bt}>
          {isInviting ? 'Sending...' : 'Send Invite'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default function ManageLockAccessScreen() {
  const { token, role, activeWorkspace, user } = useAuth();
  const nav = useNavigation();
  const route = useRoute();
  const ctxLockId = route.params?.lockId ?? null;
  const ctxLockName = route.params?.lockName ?? null;

  const [allUsers, setAllUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [busy, setBusy] = useState(false);
  const [updateStatus, setUpdateStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [lockGroup, setLockGroup] = useState(null);
  const [initialUsers, setInitialUsers] = useState(new Set());

  const load = useCallback(async () => {
    if ((role !== 'admin' && role !== 'owner') || !ctxLockId) return;
    setLoading(true);
    try {
      const groupName = `_lock_${ctxLockId}`;
      const usersRes = await listUsers(token, activeWorkspace.workspace_id);
      setAllUsers(usersRes?.users || []);

      const groupsRes = await listGroups(token, activeWorkspace.workspace_id);
      let group = groupsRes.groups.find(g => g.name === groupName);

      if (!group) {
        const createRes = await createGroup(token, activeWorkspace.workspace_id, groupName);
        group = createRes.group;
        await assignLockToGroup(token, activeWorkspace.workspace_id, group._id, ctxLockId);
      }
      
      setLockGroup(group);
      const userIds = new Set(group.userIds || []);
      setSelectedUsers(userIds);
      setInitialUsers(userIds);

    } catch (e) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Could not load data' });
    } finally {
      setLoading(false);
    }
  }, [token, role, ctxLockId, activeWorkspace]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleToggleUser = (userId) => {
    const newSelectedUsers = new Set(selectedUsers);
    if (newSelectedUsers.has(userId)) {
      newSelectedUsers.delete(userId);
    } else {
      newSelectedUsers.add(userId);
    }
    setSelectedUsers(newSelectedUsers);
  };

  const handleUpdateRole = async (userId, newRole) => {
    try {
      await updateUserRole(token, activeWorkspace.workspace_id, userId, newRole);
      Toast.show({ type: 'success', text1: 'User role updated' });
      load();
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Failed to update role' });
    }
  };

  const handleRemoveUser = async (userId) => {
    Alert.alert(
      'Delete User',
      'Are you sure you want to remove this user from the workspace?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteUser(token, activeWorkspace.workspace_id, userId);
              Toast.show({ type: 'success', text1: 'User removed' });
              load();
            } catch (error) {
              Toast.show({ type: 'error', text1: 'Failed to remove user' });
            }
          },
        },
      ]
    );
  };

  async function ensurePermissions() {
    if (Platform.OS !== 'android') return;
    const perms = [
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
    ];
    if (Platform.Version < 31) {
      perms.push(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
    }
    for (const p of perms) {
      const g = await PermissionsAndroid.request(p);
      if (g !== PermissionsAndroid.RESULTS.GRANTED) {
        throw new Error(`Missing permission: ${p}`);
      }
    }
  }

  const onUpdateAccess = async () => {
    let bleDevice;
    try {
      if (busy) return;
      if (!ctxLockId) {
        Toast.show({ type: 'info', text1: 'Pick a lock first' });
        return;
      }

      if (allUsers.length === 0) {
        Toast.show({ type: 'error', text1: 'Please invite users first' });
        return;
      }

      if (selectedUsers.size === 0) {
        Toast.show({ type: 'error', text1: 'No users selected' });
        return;
      }

      setBusy(true);
      setUpdateStatus('Updating user access...');

      const usersToAdd = [...selectedUsers].filter(u => !initialUsers.has(u));
      const usersToRemove = [...initialUsers].filter(u => !selectedUsers.has(u));
      
      const allEmails = new Map(allUsers.map(u => [u.id, u.email]));

      for (const userId of usersToAdd) {
        await addUserToGroup(token, activeWorkspace.workspace_id, lockGroup._id, allEmails.get(userId));
      }

      for (const userId of usersToRemove) {
        await removeUserFromGroup(token, activeWorkspace.workspace_id, lockGroup._id, allEmails.get(userId));
      }

      setUpdateStatus('Building new ACL...');
      const rebuildRes = await rebuildAcl(token, activeWorkspace.workspace_id, Number(ctxLockId));
      if (!rebuildRes?.ok) {
        if (rebuildRes?.err === 'missing-userpubs') {
          const missingList = (rebuildRes.missing || []).map(m => m.email || m.id).join('\n• ');
          Toast.show({
            type: 'error',
            text1: 'Missing device keys',
            text2: `Some users don’t have device keys yet:\n\n• ${missingList}`,
            visibilityTime: 10000,
          });
          throw new Error('missing-userpubs');
        }
        if (rebuildRes?.err === 'missing-ownership') {
          Toast.show({ type: 'error', text1: 'Set ownership first' });
          throw new Error('missing-ownership');
        }
        throw new Error(rebuildRes?.err || 'rebuild-failed');
      }

      setUpdateStatus('Fetching new ACL...');
      const data = await fetchLatestAcl(token, activeWorkspace.workspace_id, Number(ctxLockId));
      if (!data?.ok || !data?.envelope) {
        throw new Error('Failed to fetch new ACL envelope from server.');
      }

      setUpdateStatus('Requesting permissions...');
      await ensurePermissions();

      setUpdateStatus('Scanning for lock...');
      bleDevice = await scanAndConnectForLockId(Number(ctxLockId));

      setUpdateStatus('Sending ACL to lock...');
      await sendAcl(bleDevice, data.envelope);

      setUpdateStatus('');
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Access list updated on lock.',
      });
      load(); // afrer successfull update, reload the data
    } catch (e) {
      if (e.message !== 'missing-userpubs' && e.message !== 'missing-ownership') {
        Toast.show({
          type: 'error',
          text1: 'Update Failed',
          text2: String(e?.response?.data?.err || e?.message || e),
        });
      }
      setUpdateStatus('Failed');
    } finally {
      setBusy(false);
      if (bleDevice) {
        await safeDisconnect(bleDevice);
      }
      setTimeout(() => setUpdateStatus(''), 5000);
    }
  };

  const renderItem = ({ item }) => {
    const isEnabled = selectedUsers.has(item.id);
    const isCurrentUser = user.id === item.id;

    return (
      <View style={s.card}>
        <View>
          <Text style={s.cardTitle}>{item.email}</Text>
          <Text style={s.cardMeta}>
            Role: {item.role}
          </Text>
          <View style={s.actionsContainer}>
            {!isCurrentUser && (
              <>
                {item.role === 'user' && (
                  <TouchableOpacity
                    style={s.actionButton}
                    onPress={() => handleUpdateRole(item.id, 'admin')}
                  >
                    <Text style={s.actionButtonText}>Promote to Admin</Text>
                  </TouchableOpacity>
                )}
                {item.role === 'admin' && (
                  <TouchableOpacity
                    style={s.actionButton}
                    onPress={() => handleUpdateRole(item.id, 'user')}
                  >
                    <Text style={s.actionButtonText}>Demote to User</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[s.actionButton, s.removeButton]}
                  onPress={() => handleRemoveUser(item.id)}
                >
                  <Text style={s.actionButtonText}>Remove User</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
        <Switch
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={isEnabled ? '#7B1FA2' : '#f4f3f4'}
          onValueChange={() => handleToggleUser(item.id)}
          value={isEnabled}
        />
      </View>
    );
  };

  return (
    <View style={s.c}>
      <Text style={s.t}>Manage Access for {ctxLockName || `Lock #${ctxLockId}`}</Text>
      
      <FlatList
        data={allUsers}
        ListHeaderComponent={<InviteForm onInviteSuccess={load} />}
        keyExtractor={u => u.id}
        renderItem={renderItem}
        style={{ marginTop: 12 }}
        ListEmptyComponent={() => (
          <View>
            {!loading && allUsers.length === 0 && (
              <Text style={{color: 'white', textAlign: 'center', marginTop: 20}}>No users found in this workspace.</Text>
            )}
            {loading && <ActivityIndicator color="#7B1FA2" size="large" />}
          </View>
        )}
      />
      
      {ctxLockId ? (
        <TouchableOpacity
          style={[s.btn, { backgroundColor: '#7B1FA2', marginTop: 12 }]}
          onPress={onUpdateAccess}
          disabled={busy}>
          {busy ? (
            <View style={s.busyContainer}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={s.btBusy}>{updateStatus || 'Working...'}</Text>
            </View>
          ) : (
            <Text style={s.bt}>
              Update User Access
            </Text>
          )}
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, padding: 16, backgroundColor: '#0b0b0f' },
  t: { color: 'white', fontSize: 20, fontWeight: '700', marginBottom: 10 },
  label: { color: '#aaa', marginTop: 4, marginBottom: 10 },
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: { color: '#fff', fontWeight: '700' },
  cardMeta: { color: '#aaa', marginTop: 4 },
  busyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btBusy: {
    color: 'white',
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#0b0b0f',
    color: 'white',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a33',
  },
  dropdown: {
    backgroundColor: '#0b0b0f',
    borderColor: '#2a2a33',
    marginBottom: 12,
  },
  dropdownContainer: {
    backgroundColor: '#1d1d25',
    borderColor: '#2a2a33',
  },
  actionsContainer: {
    flexDirection: 'row',
    marginTop: 10,
  },
  actionButton: {
    backgroundColor: '#333',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
  },
  removeButton: {
    backgroundColor: '#8B0000',
  },
});

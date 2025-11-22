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
  Modal,
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
  getUserByEmail,
} from '../services/apiService';
import {
  scanAndConnectForLockId,
  sendAcl,
  safeDisconnect,
} from '../ble/bleManager';
import DropDownPicker from 'react-native-dropdown-picker';

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
    
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isSyncModalVisible, setIsSyncModalVisible] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [addUserEmail, setAddUserEmail] = useState('');
    const [inviteRole, setInviteRole] = useState(null);
    const [modalView, setModalView] = useState('addUser'); // 'addUser' or 'sendInvite'
    const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
    const [roleItems, setRoleItems] = useState([
      { label: 'Admin', value: 'admin' },
      { label: 'User', value: 'user' },
    ]);
  
    const load = useCallback(async () => {
      if (!activeWorkspace?.workspace_id || (role !== 'admin' && role !== 'owner') || !ctxLockId) return;
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
        if (group) {
            const userIds = new Set(group.userIds || []);
            setSelectedUsers(userIds);
            setInitialUsers(userIds);
        }
  
      } catch (e) {
        Toast.show({ type: 'error', text1: 'Error', text2: 'Could not load data' });
      } finally {
        setLoading(false);
      }
    }, [token, role, ctxLockId, activeWorkspace?.workspace_id]);
  
    useFocusEffect(
      useCallback(() => {
        load();
      }, [load])
    );
  
    const handleToggleUser = (userId) => {
      const user = allUsers.find(u => u.id === userId);
      if (user?.role === 'owner') {
        return;
      }
      const newSelectedUsers = new Set(selectedUsers);
      if (newSelectedUsers.has(userId)) {
        newSelectedUsers.delete(userId);
      } else {
        newSelectedUsers.add(userId);
      }
      setSelectedUsers(newSelectedUsers);
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
  
    const openSyncModal = () => {
      if (busy || numberOfChanges === 0) return;
      setIsSyncModalVisible(true);
    };
  
    const handleSync = async () => {
      let bleDevice;
      try {
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
  
        setIsSyncing(true);
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
  
        setUpdateStatus('Updating Digital Keys...');
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
  
        setUpdateStatus('Updating User Access...');
        const data = await fetchLatestAcl(token, activeWorkspace.workspace_id, Number(ctxLockId));
        if (!data?.ok || !data?.envelope) {
          throw new Error('Failed to fetch new ACL envelope from server.');
        }
  
        setUpdateStatus('Requesting permissions...');
        await ensurePermissions();
  
        setUpdateStatus('Scanning for lock...');
        bleDevice = await scanAndConnectForLockId(Number(ctxLockId));
  
        setUpdateStatus('Syncing with lock...');
        await sendAcl(bleDevice, data.envelope);
  
        setUpdateStatus('');
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: `${usersToAdd.length + usersToRemove.length} access updated.`,
        });
        setIsSyncModalVisible(false);
        load();
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
        setIsSyncing(false);
        if (bleDevice) {
          await safeDisconnect(bleDevice);
        }
        setTimeout(() => setUpdateStatus(''), 5000);
      }
    };
  
    const handleAddUserPress = () => {
      setModalView('addUser');
      setAddUserEmail('');
      setInviteRole(null);
      setIsModalVisible(true);
    };
  
    const handleFindUser = async () => {
      if (!addUserEmail) {
        Toast.show({ type: 'error', text1: 'Please enter an email' });
        return;
      }
      try {
        const res = await getUserByEmail(token, activeWorkspace.workspace_id, addUserEmail);
        if (res.ok && res.user) {
          const newSelectedUsers = new Set(selectedUsers);
          newSelectedUsers.add(res.user.id);
          setSelectedUsers(newSelectedUsers);
          setIsModalVisible(false);
          setAddUserEmail('');
          Toast.show({ type: 'success', text1: 'User added to lock' });
          load();
        }
      } catch (error) {
        if (error.response && error.response.status === 404) {
          setModalView('sendInvite');
        } else {
          Toast.show({ type: 'error', text1: 'Error finding user' });
        }
      }
    };
  
    const handleInviteUser = async () => {
      if (!inviteRole) {
        Toast.show({ type: 'error', text1: 'Please select a role' });
        return;
      }
      try {
        await inviteUser(token, activeWorkspace.workspace_id, addUserEmail, inviteRole);
        Toast.show({ type: 'success', text1: 'Invite Sent' });
        setIsModalVisible(false);
        setAddUserEmail('');
        setInviteRole(null);
        load();
      } catch (error) {
        Toast.show({ type: 'error', text1: 'Failed to send invite' });
      }
    };
    
    const renderItem = ({ item }) => {
      const isOwner = item.role === 'owner';
      const isEnabled = isOwner || selectedUsers.has(item.id);
  
      return (
        <View style={s.card}>
          <View>
            <Text style={s.cardTitle}>{item.email}</Text>
            <Text style={s.cardMeta}>Access to this lock:</Text>
          </View>
          <Switch
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={isEnabled ? '#7B1FA2' : '#f4f3f4'}
            onValueChange={() => handleToggleUser(item.id)}
            value={isEnabled}
            disabled={isOwner}
          />
        </View>
      );
    };
  
    const usersToAdd = [...selectedUsers].filter(u => !initialUsers.has(u));
    const usersToRemove = [...initialUsers].filter(u => !selectedUsers.has(u));
    const numberOfChanges = usersToAdd.length + usersToRemove.length;
  
    return (
      <View style={s.c}>
        <Text style={s.t}>Manage Access for {ctxLockName || `Lock #${ctxLockId}`}</Text>
        
        <FlatList
          data={allUsers}
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
            style={[s.btn, { backgroundColor: numberOfChanges > 0 ? '#7B1FA2' : 'gray', marginTop: 12 }]}
            onPress={openSyncModal}
            disabled={busy || numberOfChanges === 0}>
            {busy ? (
              <View style={s.busyContainer}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={s.btBusy}>{updateStatus || 'Working...'}</Text>
              </View>
            ) : (
              <Text style={s.bt}>
                {numberOfChanges > 0 ? `Update (${numberOfChanges}) Changes` : 'No changes to sync'}
              </Text>
            )}
          </TouchableOpacity>
        ) : null}
          <TouchableOpacity
              style={s.fab}
              onPress={handleAddUserPress}
          >
              <Text style={s.fabIcon}>+</Text>
          </TouchableOpacity>
          <Modal
              animationType="slide"
              transparent={true}
              visible={isModalVisible}
              onRequestClose={() => setIsModalVisible(false)}
          >
              <View style={s.modalContainer}>
                  <View style={s.modalContent}>
                      {modalView === 'addUser' ? (
                          <>
                              <Text style={s.modalTitle}>Add User To Lock</Text>
                              <TextInput
                                  style={s.input}
                                  placeholder="Enter user email"
                                  placeholderTextColor="#888"
                                  value={addUserEmail}
                                  onChangeText={setAddUserEmail}
                                  keyboardType="email-address"
                                  autoCapitalize="none"
                              />
                              <TouchableOpacity style={s.btn} onPress={handleFindUser}>
                                  <Text style={s.bt}>Add User</Text>
                              </TouchableOpacity>
                          </>
                      ) : (
                          <>
                              <Text style={s.modalTitle}>User is not in your workspace, send an invite</Text>
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
                              <TouchableOpacity style={s.btn} onPress={handleInviteUser}>
                                  <Text style={s.bt}>Send Invite</Text>
                              </TouchableOpacity>
                          </>
                      )}
                  </View>
              </View>
          </Modal>
          <Modal
              animationType="slide"
              transparent={true}
              visible={isSyncModalVisible}
              onRequestClose={() => setIsSyncModalVisible(false)}
          >
              <View style={s.modalContainer}>
                  <View style={s.modalContent}>
                      <Text style={s.modalTitle}>Sync Changes with Lock</Text>
                      <Text style={s.modalText}>You have {numberOfChanges} change{numberOfChanges > 1 ? 's' : ''} pending. To sync, you must be near the lock.</Text>
                      <Text style={s.modalText}>Step 1: Stand next to "{ctxLockName || `Lock #${ctxLockId}`}".</Text>
                      <Text style={s.modalText}>Step 2: Tap the button below to connect.</Text>
                      <TouchableOpacity
                          style={[s.btn, { backgroundColor: '#7B1FA2', marginTop: 20 }]}
                          onPress={handleSync}
                          disabled={isSyncing}
                      >
                          {isSyncing ? (
                              <View style={s.busyContainer}>
                                  <ActivityIndicator color="#fff" size="small" />
                                  <Text style={s.btBusy}>Syncing... Do not close the app or exit screen</Text>
                              </View>
                          ) : (
                              <Text style={s.bt}>Scan and connect to lock</Text>
                          )}
                      </TouchableOpacity>
                  </View>
              </View>
          </Modal>
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
      paddingHorizontal: 10,
    },
    btBusy: {
      color: 'white',
      fontWeight: '600',
      flex: 1,
      flexWrap: 'wrap',
      textAlign: 'center',
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
    fab: {
      position: 'absolute',
      width: 56,
      height: 56,
      alignItems: 'center',
      justifyContent: 'center',
      right: 20,
      bottom: 80,
      backgroundColor: '#7B1FA2',
      borderRadius: 28,
      elevation: 8,
    },
    fabIcon: {
      fontSize: 24,
      color: 'white',
    },
    modalContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
      backgroundColor: '#1d1d25',
      padding: 20,
      borderRadius: 10,
      width: '80%',
    },
    modalTitle: {
      color: 'white',
      fontSize: 18,
      fontWeight: '700',
      marginBottom: 15,
    },
    modalText: {
      color: 'white',
      fontSize: 14,
      marginBottom: 10,
    },
  });

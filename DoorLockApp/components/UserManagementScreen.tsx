// DoorLockApp/components/UserManagementScreen.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Alert,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { useAuth } from '../auth/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import DropDownPicker from 'react-native-dropdown-picker';

import {
  listUsers,
  updateUserRole,
  deleteUser,
  inviteUser,
  listGroups,
  getGroup,
} from '../services/apiService';

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0b0f',
    padding: 16,
  },
  header: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
  },
  card: {
    backgroundColor: '#1d1d25',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
  },
  email: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  role: {
    color: '#aaa',
    marginTop: 4,
    marginBottom: 10,
  },
  btn: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnText: {
    color: 'white',
    fontWeight: '700',
  },
  promoteBtn: {
    backgroundColor: '#3b82f6',
  },
  demoteBtn: {
    backgroundColor: '#888',
  },
  removeBtn: {
    backgroundColor: '#ef4444',
  },
  input: {
    backgroundColor: '#0b0b0f',
    color: 'white',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
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
});

const InviteForm = ({ onInviteSuccess }: { onInviteSuccess: () => void }) => {
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
      const err = anyErr as any;
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
    <View style={[s.card, { zIndex: 1000 }]}>
      <Text style={s.header}>Invite New User</Text>
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
        <Text style={s.btnText}>
          {isInviting ? 'Sending...' : 'Send Invite'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default function UserManagementScreen() {
  const { token, activeWorkspace, role } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    if (!token || !activeWorkspace) return;
    setLoading(true);
    try {
      let usersData = [];
      if (role === 'owner' || role === 'admin') {
        const data = await listUsers(token, activeWorkspace.workspace_id);
        usersData = data.users || [];
      }
      setUsers(usersData);
    } catch (anyErr) {
      const err = anyErr as any;
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: err?.response?.data?.err || 'Failed to load users.',
      });
      setUsers([]); // Clear users on error
    }
    setLoading(false);
  }, [token, activeWorkspace, role]);

  useFocusEffect(
    useCallback(() => {
      fetchUsers();
    }, [fetchUsers]),
  );

  // V2: This handler is now workspace-aware
  const handleRoleChange = async (userId: string, currentRole: string) => {
    if (role === 'admin' && (currentRole === 'admin' || currentRole === 'owner')) {
      Toast.show({
        type: 'error',
        text1: 'Permission Denied',
        text2: "Admins can't change the role of other admins or owners.",
      });
      return;
    }

    if (!activeWorkspace) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'No active workspace selected.',
      });
      return;
    }
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    try {
      await updateUserRole(
        token,
        activeWorkspace.workspace_id,
        userId,
        newRole,
      );
      Toast.show({
        type: 'success',
        text1: 'Role updated',
        text2: `User role updated to ${newRole}`,
      });
      fetchUsers();
    } catch (anyErr) {
      const err = anyErr as any;
      console.error(err?.response?.data);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: `Failed to update role: ${err?.response?.data?.err}`,
      });
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!activeWorkspace) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'No active workspace selected.',
      });
      return;
    }

    Alert.alert(
      'Remove User',
      'Are you sure you want to remove this user from the workspace?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteUser(token, activeWorkspace.workspace_id, userId);
              Toast.show({
                type: 'success',
                text1: 'User Removed',
                text2: 'The user has been removed from the workspace.',
              });
              fetchUsers();
            } catch (anyErr) {
              const err = anyErr as any;
              console.error(err?.response?.data);
              Toast.show({
                type: 'error',
                text1: 'Error',
                text2: `Failed to remove user: ${err?.response?.data?.err}`,
              });
            }
          },
        },
      ],
    );
  };

  if (loading && users.length === 0) {
    return (
      <View style={s.container}>
        <ActivityIndicator color="#7B1FA2" size="large" />
      </View>
    );
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={s.card}>
      <Text style={s.email}>{item.email}</Text>
      <Text style={s.role}>Role: {item.role}</Text>

      {((role === 'owner' && item.role !== 'owner') || (role === 'admin' && item.role === 'user')) && (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            style={[
              s.btn,
              item.role === 'admin' ? s.demoteBtn : s.promoteBtn,
              { flex: 1 },
            ]}
            onPress={() => handleRoleChange(item.id, item.role)}>
            <Text style={s.btnText}>
              {item.role === 'admin' ? 'Demote to User' : 'Promote to Admin'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.btn, s.removeBtn, { flex: 1 }]}
            onPress={() => handleRemoveUser(item.id)}>
            <Text style={s.btnText}>Remove</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View style={s.container}>
      <FlatList
        data={users}
        ListHeaderComponent={
          (role === 'owner' || role === 'admin') ? <InviteForm onInviteSuccess={fetchUsers} /> : null
        }
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </View>
  );
}

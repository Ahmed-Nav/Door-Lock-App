// DoorLockApp/components/UserManagementScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { listUsers, updateUserRole, deleteUser } from '../services/apiService';
import { useAuth } from '../auth/AuthContext';
import Toast from 'react-native-toast-message';

export default function UserManagementScreen() {
  const { token, role, email: currentEmail } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await listUsers(token);
      setUsers(data);
    } catch (err: any) {
      console.error('listUsers failed:', err?.response?.data || err);
      Toast.show({ type: 'error', text1: 'Failed to load users.' })
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    try {
      await updateUserRole(token, userId, newRole);
      Toast.show({ type: 'success', text1: `User role updated to ${newRole}` })
      fetchUsers();
    } catch (err: any) {
      console.error('updateUserRole failed:', err?.response?.data || err);
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to update role.' })
    }
  };

  const handleDeleteUser = ( userId: string, userEmail: string ) => {
    Alert.alert(
      'Confirm User Deletion',
      `Are you sure you want to permanently delete user: ${userEmail}? This action cannot be undone and will remove them from all groups/locks.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteUser(token, userId);
              Toast.show({ type: "success", text1: "User Deleted", text2: `${userEmail} has been removed.` });
              fetchUsers();
            } catch(err: any) {
              console.error("deleteUser failed:", err?.response?.data || err);
              Toast.show({ type: "error", text1: "Error", text2: "Failed to delete user." });
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    if (role !== 'admin') {
      Toast.show({ type: 'info', text1: 'Access Denied', text2: 'You are not authorized to view this page.' })
      return;
    }
    fetchUsers();
  }, []);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#7B1FA2" size="large" />
      </View>
    );
  }

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.email}>{item.email}</Text>
      <Text style={styles.role}>Role: {item.role}</Text>
      {item.email !== currentEmail && (
      <View style={styles.buttonRow}>
        <TouchableOpacity
        style={[
          styles.btn,
          { backgroundColor: item.role === 'admin' ? '#b23b3b' : '#3b82f6' },
        ]}
        onPress={() => handleRoleChange(item._id, item.role)}
      >
        <Text style={styles.btnText}>
          {item.role === 'admin' ? 'Demote to User' : 'Promote to Admin'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
          style={[styles.btn, styles.deleteBtn]}
          onPress={() => handleDeleteUser(item._id, item.email)}
        >
          <Text style={styles.btnText}>Delete User</Text>
        </TouchableOpacity>
      </View>
    )}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={users}
        renderItem={renderItem}
        keyExtractor={u => u._id}
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0b0f', padding: 16 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    backgroundColor: '#1d1d25',
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
  },
  email: { color: '#fff', fontSize: 16, fontWeight: '600' },
  role: { color: '#ccc', marginVertical: 6 },
  btn: { padding: 10, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700' },
  buttonRow: { 
    flexDirection: 'row', 
    marginTop: 10, 
    justifyContent: 'space-between', 
    gap: 8,
  },
  roleBtn: { 
    flex: 2, 
  }, 
  deleteBtn: {
    flex: 1, 
    backgroundColor: '#8B0000', 
  },
});

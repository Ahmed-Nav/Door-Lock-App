// DoorLockApp/components/UserManagementScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { listUsers, updateUserRole } from '../services/apiService';
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
});

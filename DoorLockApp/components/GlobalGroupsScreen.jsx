// DoorLockApp/components/GlobalGroupsScreen.jsx

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Modal,
  TouchableWithoutFeedback,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../auth/AuthContext';
import { listGroups, createGroup } from '../services/apiService';
import Toast from 'react-native-toast-message';

const GroupCreationModal = ({
  isVisible,
  onClose,
  onCreate,
  groupName,
  setGroupName,
}) => (
  <Modal
    visible={isVisible}
    transparent={true}
    animationType="fade"
    onRequestClose={onClose}
  >
    <TouchableWithoutFeedback onPress={onClose}>
      <View style={s.modalOverlay}>
        <TouchableWithoutFeedback>
          <View style={s.modalContainer}>
            <Text style={s.modalTitle}>Create New Group</Text>
            <TextInput
              style={s.modalInput}
              placeholder="Enter Group Name"
              placeholderTextColor="#888"
              value={groupName}
              onChangeText={setGroupName}
              autoFocus={true}
            />
            <View style={s.modalButtonRow}>
              <TouchableOpacity
                style={[s.modalBtn, s.cancelBtn]}
                onPress={onClose}
              >
                <Text style={s.modalBtnText}>Exit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalBtn, s.confirmBtn]}
                onPress={() => onCreate(groupName)}
              >
                <Text style={s.modalBtnText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </View>
    </TouchableWithoutFeedback>
  </Modal>
);

export default function GlobalGroupsScreen() {
  const { token, role, activeWorkspace } = useAuth();
  const nav = useNavigation();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  const load = useCallback(async () => {
    console.log('GlobalGroupsScreen: role:', role, 'activeWorkspace:', activeWorkspace);
        if ((role !== 'admin' && role !== 'owner') || !activeWorkspace) {
      setGroups([]);
      console.log('GlobalGroupsScreen: Not admin or no active workspace, skipping group fetch.');
      return;
    }
    try {
      setLoading(true);
      const res = await listGroups(token, activeWorkspace.workspace_id);
      console.log('GlobalGroupsScreen: listGroups response:', res);
      setGroups(res?.groups || []);
    } catch (e) {
      console.error('GlobalGroupsScreen: Error loading groups:', e);
      Toast.show({ type: 'error', text1: 'Error loading groups' });
    } finally {
      setLoading(false);
    }
  }, [token, role, activeWorkspace]);

  useFocusEffect(
    useCallback(() => {
      async function fetchData() {
        await load();
      }
      fetchData();
      return () => {};
    }, [load]),
  );

  const goToGroupDetail = groupId => {
    nav.navigate('GroupDetail', { groupId });
  };

  const onCreate = async groupName => {
    if (!groupName.trim()) {
      Toast.show({ type: 'error', text1: 'Name Required' });
      return;
    }
    if (!token || !activeWorkspace) {
      Toast.show({ type: 'error', text1: 'No active workspace' });
      return;
    }

    try {
      await createGroup(token, activeWorkspace.workspace_id, groupName.trim());
      setNewGroupName('');
      setIsModalVisible(false);
      await load();

      Toast.show({
        type: 'success',
        text1: 'Group Created',
        text2: `Group "${groupName.trim()}" successfully created.`,
      });
    } catch (e) {
      Toast.show({
        type: 'error',
        text1: 'Create failed',
        text2: String(e?.response?.data?.err || e?.message || e),
      });
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity style={s.card} onPress={() => goToGroupDetail(item._id)}>
      <Text style={s.cardTitle}>{item.name}</Text>
      <Text style={s.cardMeta}>
        users: {item.userCount ?? item.userIds?.length ?? 0} • locks:{' '}
        {item.lockCount ?? item.lockIds?.length ?? 0}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={s.c}>
      <Text style={s.t}>All User Groups</Text>
      {loading ? (
        <ActivityIndicator
          size="large"
          color="#7B1FA2"
          style={{ marginTop: 20 }}
        />
      ) : (
        <FlatList
          data={groups}
          keyExtractor={g => g._id}
          renderItem={renderItem}
          style={{ marginTop: 12 }}
          ListEmptyComponent={<Text style={s.empty}>No groups found.</Text>} // <-- V2: Added
        />
      )}
      <TouchableOpacity style={s.fab} onPress={() => setIsModalVisible(true)}>
        <Text style={s.fabTxt}>＋</Text>
      </TouchableOpacity>

      <GroupCreationModal
        isVisible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onCreate={onCreate}
        groupName={newGroupName}
        setGroupName={setNewGroupName}
      />
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, padding: 16, backgroundColor: '#0b0b0f' },
  t: { color: 'white', fontSize: 20, fontWeight: '700' },
  card: {
    borderWidth: 1,
    borderColor: '#2a2a33',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  cardTitle: { color: '#fff', fontWeight: '700' },
  cardMeta: { color: '#aaa', marginTop: 4 },
  fab: {
    position: 'absolute',
    right: 18,
    bottom: 78,
    backgroundColor: '#7B1FA2',
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
  },
  fabTxt: { color: 'white', fontSize: 28, lineHeight: 28 },

  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContainer: {
    width: '80%',
    backgroundColor: '#1d1d25',
    borderRadius: 12,
    padding: 20,
    alignItems: 'stretch',
  },
  modalTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: '#1d1d25',
    color: 'white',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2a2a33',
    marginBottom: 20,
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  modalBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalBtnText: {
    color: 'white',
    fontWeight: '600',
  },
  cancelBtn: {
    backgroundColor: '#333',
  },
  confirmBtn: {
    backgroundColor: '#7B1FA2',
  },
  empty: {
    color: '#888',
    textAlign: 'center',
    marginTop: 30,
  },
});

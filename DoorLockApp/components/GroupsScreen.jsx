import React, { useCallback, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Modal, 
  TouchableWithoutFeedback,
  Platform,
  PermissionsAndroid,
  ActivityIndicator 
} from 'react-native';
import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from '@react-navigation/native';
import { useAuth } from '../auth/AuthContext';
import { listGroups, createGroup, rebuildAcl, fetchLatestAcl } from '../services/apiService';
import Toast from 'react-native-toast-message';
import { scanAndConnectForLockId, sendAcl, safeDisconnect } from '../ble/bleManager';


const useDebounce = (callback, delay) => {
  const timeoutRef = useRef(null);

  return (...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  };
};


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
              style={[s.in, s.modalInput]}
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


export default function GroupsScreen() {
  const { token, role } = useAuth();
  const nav = useNavigation();
  const route = useRoute();
  const ctxLockId = route.params?.lockId ?? null;
  const ctxLockName = route.params?.lockName ?? null; 
  const [allGroups, setAllGroups] = useState([]); 
  const [groups, setGroups] = useState([]); 
  const [searchTerm, setSearchTerm] = useState(''); 
  const [isModalVisible, setIsModalVisible] = useState(false); 
  const [name, setName] = useState(''); 
  const [busy, setBusy] = useState(false);
  const [updateStatus, setUpdateStatus] = useState('');

  const load = useCallback(async () => {
    try {
      if (role !== 'admin') return;
      const res = await listGroups(token);
      const loadedGroups = res?.groups || [];
      setAllGroups(loadedGroups); 
      
      if (searchTerm.trim()) {
        const lowerTerm = searchTerm.toLowerCase();
        const filtered = loadedGroups.filter(g =>
          g.name.toLowerCase().includes(lowerTerm),
        );
        setGroups(filtered);
      } else {
        setGroups(loadedGroups); 
      }
    } catch (e) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: String(e?.response?.data?.err || e?.message || e),
      });
    }
  }, [token, role, searchTerm]); 

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  ); 

  const filterGroups = useCallback(
    term => {
      if (!term.trim()) {
        setGroups(allGroups);
        return;
      }
      const lowerTerm = term.toLowerCase();
      const filtered = allGroups.filter(g =>
        g.name.toLowerCase().includes(lowerTerm),
      );
      setGroups(filtered);
    },
    [allGroups],
  ); 

  
  const debouncedFilter = useDebounce(filterGroups, 300);

  const handleSearchChange = text => {
    setSearchTerm(text);
    debouncedFilter(text);
  }; 

  const onCreate = async groupName => {
    if (!groupName.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Name Required',
        text2: 'Group name cannot be empty.',
      });
      return;
    }

    try {
      await createGroup(token, groupName.trim());
      setName(''); 
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
    let device; 
    try {
      if (busy) return;
      if (!ctxLockId) {
        Toast.show({ type: 'info', text1: 'Pick a lock first' });
        return;
      }
      setBusy(true);

      setUpdateStatus('Building new ACL...');
      const rebuildRes = await rebuildAcl(token, Number(ctxLockId));
      if (!rebuildRes?.ok) {
        if (rebuildRes?.err === 'missing-userpubs') {
          const missingList = (rebuildRes.missing || [])
            .map(m => m.email || m.id)
            .join('\n• ');
          Toast.show({
            type: 'error',
            text1: 'Missing device keys',
            text2: `Some users don’t have device keys yet:\n\n• ${missingList}`,
            visibilityTime: 10000, 
          });
          throw new Error('missing-userpubs'); 
        }
        throw new Error(rebuildRes?.err || 'rebuild-failed');
      }

      setUpdateStatus('Fetching new ACL...');
      const data = await fetchLatestAcl(token, Number(ctxLockId));
      if (!data?.ok || !data?.envelope) {
        throw new Error('Failed to fetch new ACL envelope from server.');
      }

      setUpdateStatus('Requesting permissions...');
      await ensurePermissions();

      setUpdateStatus('Scanning for lock...');
      device = await scanAndConnectForLockId(Number(ctxLockId));

      setUpdateStatus('Sending ACL to lock...');
      await sendAcl(device, data.envelope);

      setUpdateStatus(''); 
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Access list updated on lock.',
      });
    } catch (e) {
      if (e.message !== 'missing-userpubs') {
        Toast.show({
          type: 'error',
          text1: 'Update Failed',
          text2: String(e?.response?.data?.err || e?.message || e),
        });
      }
      setUpdateStatus('Failed'); 
    } finally {
      setBusy(false);
        await safeDisconnect(device);
    }
  };

  return (
    <View style={s.c}>
            <Text style={s.t}>Groups</Text>     {' '}
      {ctxLockId ? (
        <Text style={{ color: '#bbb', marginBottom: 6 }}>
                    Managing access for Lock #{ctxLockId}         {' '}
          {ctxLockName ? ` (${ctxLockName})` : ''}       {' '}
        </Text>
      ) : null}
           {' '}
      {ctxLockId ? (
        <TouchableOpacity
          style={[s.btn, { backgroundColor: '#7B1FA2', marginBottom: 6 }]}
          onPress={onUpdateAccess}
          disabled={busy}
        >
                   {' '}
          <Text style={s.bt}>
                       {' '}
            {busy
              ? 'Building ACL…'
              : `Update user access for Lock #${ctxLockId}`}
                     {' '}
          </Text>
                 {' '}
        </TouchableOpacity>
      ) : null}
            
      <View style={s.row}>
               {' '}
        <TextInput
          style={[s.in, { flex: 1 }]}
          placeholder="Search groups" 
          placeholderTextColor="#888"
          value={searchTerm} 
          onChangeText={handleSearchChange} 
        />
               {' '}
        <TouchableOpacity
          style={[s.btn, { backgroundColor: '#7B1FA2' }]}
          onPress={() => setIsModalVisible(true)} 
        >
                    <Text style={s.bt}>Create</Text>       
        </TouchableOpacity>
             {' '}
      </View>

      <FlatList
        data={groups} 
        keyExtractor={g => g._id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={s.card}
            onPress={() => nav.navigate('GroupDetail', { groupId: item._id })}
          >
                        <Text style={s.cardTitle}>{item.name}</Text>           {' '}
            <Text style={s.cardMeta}>
                            users: {item.userCount ?? item.userIds?.length ?? 0}{' '}
              • locks:              {' '}
              {item.lockCount ?? item.lockIds?.length ?? 0}           {' '}
            </Text>
                     {' '}
          </TouchableOpacity>
        )}
        style={{ marginTop: 12 }}
      />
      <GroupCreationModal
        isVisible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onCreate={onCreate}
        groupName={name}
        setGroupName={setName}
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
});

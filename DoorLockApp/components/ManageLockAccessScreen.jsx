// DoorLockApp/components/ManageLockAccessScreen.jsx
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
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../auth/AuthContext';
import Toast from 'react-native-toast-message';
import {
  listGroups,
  rebuildAcl,
  fetchLatestAcl,
  assignLockToGroup,
  unassignLockFromGroup,
} from '../services/apiService';
import {
  scanAndConnectForLockId,
  sendAcl,
  safeDisconnect,
} from '../ble/bleManager';

export default function ManageLockAccessScreen() {
  const { token, role, activeWorkspace } = useAuth();
  const nav = useNavigation();
  const route = useRoute();
  const ctxLockId = route.params?.lockId ?? null;
  const ctxLockName = route.params?.lockName ?? null;

  const [allGroups, setAllGroups] = useState([]);
  const [busy, setBusy] = useState(false);
  const [updateStatus, setUpdateStatus] = useState('');

  const load = useCallback(async () => {
    if ((role !== 'admin' && role !== 'owner') || !ctxLockId) return;
    try {
      const res = await listGroups(token, activeWorkspace.workspace_id);
      setAllGroups(res?.groups || []);
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Could not load groups' });
    }
  }, [token, role, ctxLockId, activeWorkspace]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );


  const handleToggleGroup = async (group, isEnabled) => {
    const newGroups = allGroups.map(g => {
      if (g._id === group._id) {
        if (isEnabled) {
          return { ...g, lockIds: [...g.lockIds, ctxLockId] };
        } else {
          return { ...g, lockIds: g.lockIds.filter(id => id !== ctxLockId) };
        }
      }
      return g;
    });
    setAllGroups(newGroups);

    try {
      if (isEnabled) {
        await assignLockToGroup(token, group._id, ctxLockId);
      } else {
        await unassignLockFromGroup(token, group._id, ctxLockId);
      }
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Toggle failed', text2: 'Please try again' });
      load(); 
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
    let bleDevice;
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
          const missingList = (rebuildRes.missing || []).map(m => m.email || m.id).join('\n• ');
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
      bleDevice = await scanAndConnectForLockId(Number(ctxLockId));


      setUpdateStatus('Sending ACL to lock...');
      await sendAcl(bleDevice, data.envelope);


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
      if (bleDevice) {
        await safeDisconnect(bleDevice);
      }
      setTimeout(() => setUpdateStatus(''), 5000);
    }
  };


  const renderItem = ({ item }) => {
    const isEnabled = item.lockIds.includes(ctxLockId);
    return (
      <View style={s.card}>
        <View>
          <Text style={s.cardTitle}>{item.name}</Text>
          <Text style={s.cardMeta}>
            users: {item.userCount ?? item.userIds?.length ?? 0}
          </Text>
        </View>
        <Switch
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={isEnabled ? '#7B1FA2' : '#f4f3f4'}
          onValueChange={() => handleToggleGroup(item, !isEnabled)}
          value={isEnabled}
        />
      </View>
    );
  };

  return (
    <View style={s.c}>
      <Text style={s.t}>Manage Access</Text>
      <Text style={s.label}>
        Toggle which groups get access to {ctxLockName || `Lock #${ctxLockId}`}.
      </Text>

      {ctxLockId ? (
        <TouchableOpacity
          style={[s.btn, { backgroundColor: '#7B1FA2', marginBottom: 6 }]}
          onPress={onUpdateAccess}
          disabled={busy}
        >
          {busy ? (
            <View style={s.busyContainer}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={s.btBusy}>{updateStatus || 'Working...'}</Text>
            </View>
          ) : (
            <Text style={s.bt}>
              {`Update user access for Lock #${ctxLockId}`}
            </Text>
          )}
        </TouchableOpacity>
      ) : null}
      
      <FlatList
        data={allGroups}
        keyExtractor={g => g._id}
        renderItem={renderItem}
        style={{ marginTop: 12 }}
      />
    </View>
  );
}


const s = StyleSheet.create({
  c: { flex: 1, padding: 16, backgroundColor: '#0b0b0f' },
  t: { color: 'white', fontSize: 20, fontWeight: '700' },
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
});
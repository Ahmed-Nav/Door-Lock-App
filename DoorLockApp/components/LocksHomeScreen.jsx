// DoorLockApp/components/LocksHomeScreen.jsx
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuth } from '../auth/AuthContext';
import {
  listLocks,
  deleteLock,
  fetchMyLocks,
  getAdminPub,
  patchLock,
} from '../services/apiService';
import Toast from 'react-native-toast-message';

import {
  scanAndConnectForLockId,
  getChallengeOnce,
  waitAuthResult,
  sendAuthResponse,
  safeDisconnect,
  sendOwnershipSet,
} from '../ble/bleManager';
import {
  signChallengeB64,
  getOrCreateDeviceKey,
  loadClaimContext,
  clearClaimContext,
} from '../lib/keys';
import { Buffer } from 'buffer';
import { Platform, PermissionsAndroid } from 'react-native';

export default function LocksHomeScreen() {
  const nav = useNavigation();
  const { token, role, activeWorkspace, signOut, user } = useAuth();
  const [locks, setLocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unlockStatuses, setUnlockStatuses] = useState({});
  const [ownershipModalVisible, setOwnershipModalVisible] = useState(false);
  const [ownershipStatus, setOwnershipStatus] = useState('');
  const [selectedLock, setSelectedLock] = useState(null);

  async function ensurePerms() {
    if (Platform.OS !== 'android') return;

    const perms = [
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,

      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    ];

    if (Platform.Version < 31)
      perms.push(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);

    for (const p of perms) {
      const g = await PermissionsAndroid.request(p);

      if (g !== PermissionsAndroid.RESULTS.GRANTED)
        throw new Error('Missing permission: ' + p);
    }
  }

  const load = useCallback(async () => {
    if (!token || !activeWorkspace) {
      setLocks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      let res;
      if (role === 'admin' || role === 'owner') {
        res = await listLocks(token, activeWorkspace.workspace_id);
      } else if (role === 'user') {
        res = await fetchMyLocks(token, activeWorkspace.workspace_id);
      } else {
        setLocks([]);
        return;
      }
      const arr = Array.isArray(res?.locks) ? res.locks : [];
      setLocks(arr);
      if (!Array.isArray(res?.locks)) {
        Toast.show({
          type: 'error',
          text1: 'Error loading locks',
          text2: 'Server returned invalid format.',
        });
      }
    } catch (e) {
      console.log('listLocks failed', {
        status: e?.response?.status,
        data: e?.response?.data,
        message: e?.message,
      });
      Toast.show({
        type: 'error',
        text1: 'Error loading locks',
        text2: String(
          e?.response?.data?.err || e?.response?.data?.error || e?.message || e,
        ),
      });
      setLocks([]);
    } finally {
      setLoading(false);
    }
  }, [token, role, activeWorkspace]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleDelete = (lockId, lockName) => {
    Alert.alert(
      `Delete "${lockName}"?`,
      'This action is permanent and cannot be undone. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!token || !activeWorkspace) return;
            try {
              setLoading(true);
              await deleteLock(token, activeWorkspace.workspace_id, lockId);
              Toast.show({ type: 'success', text1: 'Lock deleted' });
              await load();
            } catch (e) {
              console.log('Delete failed', e);
              Toast.show({ type: 'error', text1: 'Delete failed' });
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleOneClickUnlock = async lockId => {
    let device;
    const setStatus = msg => {
      setUnlockStatuses(prev => ({ ...prev, [lockId]: msg }));
    };

    try {
      setStatus('Scanning…');
      await ensurePerms();
      device = await scanAndConnectForLockId(Number(lockId));

      const resultP = waitAuthResult(device);

      setStatus('Waiting…');
      const challenge = await getChallengeOnce(device);

      const { kid } = await getOrCreateDeviceKey();
      const sigB64 = await signChallengeB64(challenge);

      setStatus('Sending…');
      await sendAuthResponse(device, kid, sigB64);

      const res = await resultP;
      if (!res?.ok)
        throw new Error('Lock rejected: ' + (res?.err || 'unknown'));

      setStatus('Unlocked!');
      Toast.show({
        type: 'success',
        text1: 'Unlocked',
        text2: 'Door Unlocked Successfully',
      });
    } catch (e) {
      console.log('One-click unlock error:', e);
      setStatus('Failed');
      Toast.show({
        type: 'error',
        text1: 'Unlock Failed',
        text2: String(e?.message || e),
      });
    } finally {
      await safeDisconnect(device);
      setTimeout(() => setStatus(null), 3000);
    }
  };

  const handleSetOwnership = async lock => {
    let device;
    setSelectedLock(lock);
    setOwnershipModalVisible(true);
    setOwnershipStatus('Starting ownership process...');

    try {
      await ensurePerms();
      setOwnershipStatus('Fetching admin key...');
      const { pub: adminPubB64 } = await getAdminPub(
        token,
        activeWorkspace.workspace_id,
      );
      if (!adminPubB64) {
        throw new Error('Could not fetch admin public key.');
      }

      const claimContext = await loadClaimContext(lock.lockId);
      if (!claimContext || !claimContext.claimCode) {
        throw new Error('Claim code not found.');
      }

      setOwnershipStatus(`Scanning for Lock #${lock.lockId}...`);
      device = await scanAndConnectForLockId(Number(lock.lockId));

      setOwnershipStatus('Connected. Setting ownership...');
      await sendOwnershipSet(device, {
        lockId: Number(lock.lockId),
        adminPubB64: adminPubB64.trim(),
        claimCode: claimContext.claimCode.trim(),
      });

      setOwnershipStatus('Finalizing setup...');
      await patchLock(token, activeWorkspace.workspace_id, Number(lock.lockId), {
        setupComplete: true,
      });
      await clearClaimContext(Number(lock.lockId));

      setOwnershipStatus('Ownership set successfully!');
      Toast.show({
        type: 'success',
        text1: 'Ownership Set',
        text2: `Lock #${lock.lockId} is now fully set up.`,
      });
      await load(); // Refresh the locks list
    } catch (e) {
      console.error('Set ownership error:', e);
      setOwnershipStatus(`Error: ${e.message}`);
      Toast.show({
        type: 'error',
        text1: 'Ownership Failed',
        text2: String(e?.message || e),
      });
    } finally {
      await safeDisconnect(device);
      setTimeout(() => {
        setOwnershipModalVisible(false);
        setSelectedLock(null);
      }, 3000);
    }
  };

  const goClaim = () => nav.navigate('ClaimLock');
  const goManage = (lockId, name) =>
    nav.navigate('ManageLockAccess', { lockId: lockId, lockName: name });
  const goEdit = (lockId, name) =>
    nav.navigate('EditLock', { lockId, currentName: name });
  const goUnlock = lockId => nav.navigate('Unlock', { lockId });

  const renderItem = ({ item }) => {
    const unlockStatus = unlockStatuses[item.lockId];

    const isAdminOrOwner = role === 'admin' || role === 'owner';

    return (
      <View style={s.card}>
        <View style={{ flex: 1 }}>
          <Text style={s.cardTitle}>{item.name || `Lock #${item.lockId}`}</Text>
          <Text style={s.cardMeta}>
            {item.claimed ? 'Claimed' : 'Unclaimed'}
          </Text>
        </View>

        <View style={{ gap: 6 }}>
          {(role === 'admin' || role === 'owner') && item.claimed && !item.setupComplete && (
            <TouchableOpacity
              style={[s.smallBtn, { backgroundColor: '#7B1FA2' }]}
              onPress={() => handleSetOwnership(item)}
              disabled={ownershipModalVisible}
            >
              <Text style={s.smallBtnTxt}>Set Ownership</Text>
            </TouchableOpacity>
          )}

          {isAdminOrOwner && item.setupComplete && (
            <TouchableOpacity
              style={[s.smallBtn, { backgroundColor: '#2196F3' }]}
              onPress={() => goManage(item.lockId, item.name)}
            >
              <Text style={s.smallBtnTxt}>Manage</Text>
            </TouchableOpacity>
          )}

          {isAdminOrOwner && item.setupComplete && (
            <TouchableOpacity
              style={[s.smallBtn, { backgroundColor: '#FFC107' }]}
              onPress={() => goEdit(item.lockId, item.name)}
            >
              <Text style={s.smallBtnTxt}>Rename Lock</Text>
            </TouchableOpacity>
          )}

          {item.setupComplete && (
            <TouchableOpacity
              style={[
                s.smallBtn,
                { backgroundColor: '#7B1FA2' },
                unlockStatus === 'Failed' && { backgroundColor: '#b23b3b' },
                unlockStatus === 'Unlocked!' && { backgroundColor: '#4CAF50' },
              ]}
              onPress={() => handleOneClickUnlock(item.lockId)}
              disabled={!!unlockStatus && unlockStatus !== 'Failed'}
            >
              <Text style={s.smallBtnTxt}>
                {unlockStatus ? unlockStatus : 'Unlock'}
              </Text>
            </TouchableOpacity>
          )}

          {role === 'owner' && (
            <TouchableOpacity
              onPress={() =>
                handleDelete(item.lockId, item.name || `Lock #${item.lockId}`)
              }
              disabled={loading}
              style={[s.btn, { backgroundColor: '#b23b3b' }]}
            >
              <Text style={s.bt}>{loading ? '...' : 'Delete Lock'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={s.c}>
      <View style={s.header}>
        <Text style={s.title}>My Locks</Text>
      </View>

      {locks.length === 0 && !loading ? (
        <Text style={s.empty}>
          {!activeWorkspace
            ? 'no locks yet. tap + button to claim one'
            : role === 'admin'
            ? 'No locks claimed yet'
            : role === 'user'
            ? 'no locks assigned'
            : 'No locks yet. Tap + to claim your first lock.'}
        </Text>
      ) : (
        <FlatList
          data={locks}
          keyExtractor={it => String(it.lockId)}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}

      {(!activeWorkspace || role === 'owner') && (
        <TouchableOpacity style={s.fab} onPress={goClaim}>
          <Text style={s.fabTxt}>＋</Text>
        </TouchableOpacity>
      )}

      <Modal
        animationType="slide"
        transparent={true}
        visible={ownershipModalVisible}
        onRequestClose={() => {
          setOwnershipModalVisible(!ownershipModalVisible);
        }}
      >
        <View style={s.centeredView}>
          <View style={s.modalView}>
            <Text style={s.modalText}>
              Setting ownership to lock #{selectedLock?.lockId}
            </Text>
            <Text style={s.modalGuide}>
              Please stand near the lock. Do not turn off the app or exit the
              screen.
            </Text>
            <Text style={s.modalStatus}>{ownershipStatus}</Text>
          </View>
        </View>
      </Modal>

      {(role === 'user' || !activeWorkspace) && (
      <TouchableOpacity style={s.signOut} onPress={signOut}>
        <Text style={s.signOutTxt}>Sign Out</Text>
      </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: '#0b0b0f', padding: 16 },
  header: {
    marginBottom: 10,
    zIndex: 1000,
  },
  title: { color: 'white', fontSize: 22, fontWeight: '700', marginBottom: 10 },
  empty: { color: '#888', marginTop: 24, textAlign: 'center' },

  card: {
    backgroundColor: '#14141c',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#222',
  },
  cardTitle: { color: 'white', fontWeight: '700' },
  cardMeta: { color: '#aaa', marginTop: 2 },

  smallBtn: {
    backgroundColor: '#333',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  smallBtnTxt: { color: 'white', fontWeight: '600' },

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

  signOut: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    backgroundColor: '#8B0000',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  signOutTxt: { color: 'white', fontWeight: '700' },
  btn: {
    backgroundColor: '#7B1FA2',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  bt: { color: '#fff', fontWeight: '700' },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalView: {
    margin: 20,
    backgroundColor: '#1c1c1e',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '80%',
  },
  modalText: {
    marginBottom: 15,
    textAlign: 'center',
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalGuide: {
    marginBottom: 20,
    textAlign: 'center',
    color: '#ccc',
    fontSize: 14,
  },
  modalStatus: {
    textAlign: 'center',
    color: '#888',
    fontSize: 12,
  },
});

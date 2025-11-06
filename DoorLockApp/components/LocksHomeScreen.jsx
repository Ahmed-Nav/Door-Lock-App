// DoorLockApp/components/LocksHomeScreen.jsx
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuth } from '../auth/AuthContext';
import { listLocks, deleteLock, fetchMyLocks } from '../services/apiService';
import Toast from 'react-native-toast-message';

import {
  scanAndConnectForLockId,
  getChallengeOnce,
  waitAuthResult,
  sendAuthResponse,
  safeDisconnect,
} from '../ble/bleManager';
import { signChallengeB64, getOrCreateDeviceKey } from '../lib/keys';
import { Buffer } from 'buffer';
import { Platform, PermissionsAndroid } from 'react-native';

export default function LocksHomeScreen() {
  const nav = useNavigation();
  const { token, role } = useAuth();
  const [locks, setLocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unlockStatuses, setUnlockStatuses] = useState({});

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
    setLoading(true);
    try {
      let res;
      if (role === 'admin') {
        res = await listLocks(token);
      } else if (role === 'user') {
        res = await fetchMyLocks(token);
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
  }, [token, role]);

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
            try {
              setLoading(true);
              await deleteLock(token, lockId);
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

  const goClaim = () => nav.navigate('ClaimLock');
  const goManage = (lockId, name) =>
    nav.navigate('ManageLockAccess', { lockId: lockId, lockName: name });
  const goEdit = (lockId, name) =>
    nav.navigate('EditLock', { lockId, currentName: name });
  const goUnlock = lockId => nav.navigate('Unlock', { lockId });
  const goResume = id => nav.navigate('Ownership', { lockId: id });

  const renderItem = ({ item }) => {
    const unlockStatus = unlockStatuses[item.lockId];

    return (
      <View style={s.card}>
        <View style={{ flex: 1 }}>
          <Text style={s.cardTitle}>{item.name || `Lock #${item.lockId}`}</Text>
          <Text style={s.cardMeta}>
            {item.claimed ? 'Claimed' : 'Unclaimed'}
          </Text>
        </View>

        <View style={{ gap: 6 }}>
          {role === 'admin' && item.claimed && !item.setupComplete && (
            <TouchableOpacity
              style={[s.smallBtn, { backgroundColor: '#7B1FA2' }]}
              onPress={() => goResume(item.lockId)}
            >
              <Text style={s.smallBtnTxt}>Set Ownership</Text>
            </TouchableOpacity>
          )}

          {role === 'admin' && (
            <TouchableOpacity
              style={s.smallBtn}
              onPress={() => goManage(item.lockId, item.name)}
            >
              <Text style={s.smallBtnTxt}>Manage</Text>
            </TouchableOpacity>
          )}

          {role === 'admin' && (
            <TouchableOpacity
              style={s.smallBtn}
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

          {role === 'admin' && (
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
      <Text style={s.title}>My Locks</Text>

      {locks.length === 0 && !loading ? (
        <Text style={s.empty}>No locks yet. Tap + to claim one.</Text>
      ) : (
        <FlatList
          data={locks}
          keyExtractor={it => String(it.lockId)}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}

      <TouchableOpacity style={s.fab} onPress={goClaim}>
        <Text style={s.fabTxt}>＋</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: '#0b0b0f', padding: 16 },
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
});

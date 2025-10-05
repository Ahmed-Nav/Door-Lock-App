// DoorLockApp/components/LocksHomeScreen.jsx
import React, { useCallback, useEffect, useState } from 'react';
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
import { listLocks } from '../services/apiService';

export default function LocksHomeScreen() {
  const nav = useNavigation();
  const { token, role, signOut } = useAuth();
  const [locks, setLocks] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (role !== 'admin') return;
    setLoading(true);
    try {
      const res = await listLocks(token);
      const arr = Array.isArray(res?.locks) ? res.locks : [];
      setLocks(arr);
      if (!Array.isArray(res?.locks)) {
        // Server returned non-array; don’t crash — show a clear error once.
        Alert.alert('Error loading locks', 'Server returned invalid format.');
      }
    } catch (e) {
      console.log('listLocks failed', {
        status: e?.response?.status,
        data: e?.response?.data,
        message: e?.message,
      });
      Alert.alert(
        'Error loading locks',
        String(e?.response?.data?.err || e?.message || e)
      );
      setLocks([]);
    } finally {
      setLoading(false);
    }
  }, [token, role]);

  // Refresh when screen comes into focus
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const goClaim = () => nav.navigate('ClaimLock');
  const goManage = (lockId) => nav.navigate('Groups', { lockId });
  const goEdit   = (lockId, name) => nav.navigate('EditLock', { lockId, name });
  const goUnlock = (lockId) => nav.navigate('Unlock', { lockId });

  const renderItem = ({ item }) => (
    <View style={s.card}>
      <View style={{ flex: 1 }}>
        <Text style={s.cardTitle}>{item.name || `Lock #${item.lockId}`}</Text>
        <Text style={s.cardMeta}>{item.claimed ? 'Claimed' : 'Unclaimed'}</Text>
      </View>

      <View style={{ gap: 6 }}>
        <TouchableOpacity style={s.smallBtn} onPress={() => goManage(item.lockId)}>
          <Text style={s.smallBtnTxt}>Manage</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.smallBtn} onPress={() => goEdit(item.lockId, item.name)}>
          <Text style={s.smallBtnTxt}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.smallBtn, { backgroundColor: '#7B1FA2' }]} onPress={() => goUnlock(item.lockId)}>
          <Text style={s.smallBtnTxt}>Unlock</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={s.c}>
      <Text style={s.title}>My Locks</Text>

      {locks.length === 0 && !loading ? (
        <Text style={s.empty}>No locks yet. Tap + to claim one.</Text>
      ) : (
        <FlatList
          data={locks}
          keyExtractor={(it) => String(it.lockId)}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}

      {/* Floating + button */}
      <TouchableOpacity style={s.fab} onPress={goClaim}>
        <Text style={s.fabTxt}>＋</Text>
      </TouchableOpacity>

      {/* Bottom Sign Out */}
      <TouchableOpacity style={s.signOut} onPress={signOut}>
        <Text style={s.signOutTxt}>Sign Out</Text>
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
    width: 54, height: 54, borderRadius: 27,
    alignItems: 'center', justifyContent: 'center',
    elevation: 5,
  },
  fabTxt: { color: 'white', fontSize: 28, lineHeight: 28 },

  signOut: {
    position: 'absolute',
    left: 16, right: 16, bottom: 16,
    backgroundColor: '#8B0000',
    padding: 14, borderRadius: 12, alignItems: 'center',
  },
  signOutTxt: { color: 'white', fontWeight: '700' },
});

import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { listGroups } from '../services/apiService';
import { useNavigation } from '@react-navigation/native';

type LockItem = { id: number; name?: string; claimed?: boolean };

export default function LocksHome() {
  const nav = useNavigation<any>();
  const { token } = useAuth();
  const [locks, setLocks] = useState<LockItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const groups = await listGroups(token);
        const ids = new Set<number>();
        for (const g of groups || []) (g.lockIds || []).forEach((x:number)=>ids.add(Number(x)));
        const arr = Array.from(ids).sort((a,b)=>a-b).map(id => ({ id, name: `My Lock #${id}`, claimed: true }));
        setLocks(arr);
      } catch (e) {
        Alert.alert('Error loading locks', String(e?.message || e));
      } finally { setLoading(false); }
    })();
  }, [token]);

  return (
    <View style={s.c}>
      <View style={s.header}>
        <Text style={s.title}>My Locks</Text>
        <TouchableOpacity onPress={() => nav.navigate('ClaimLockScreen')} style={s.add}>
          <Text style={s.addT}>＋</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={locks}
        keyExtractor={(x) => String(x.id)}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={{flex:1}}>
              <Text style={s.lockName}>{item.name || `Lock #${item.id}`}</Text>
              <Text style={s.sub}>{item.claimed ? 'Claimed' : 'Unclaimed'}</Text>
            </View>

            <TouchableOpacity onPress={() => nav.navigate('UnlockScreen', { lockId: item.id })} style={s.rowBtn}>
              <Text style={s.rowBtnT}>Unlock</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => nav.navigate('GroupsScreen', { lockId: item.id })} style={s.rowBtn}>
              <Text style={s.rowBtnT}>Manage Access</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => nav.navigate('EditLockModal', { lockId: item.id, currentName: item.name })} style={s.rowBtn}>
              <Text style={s.rowBtnT}>Edit</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={!loading ? <Text style={s.empty}>No locks yet. Tap + to claim one.</Text> : null}
      />
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex:1, backgroundColor:'#0b0b0f', padding:16 },
  header: { flexDirection:'row', alignItems:'center', marginBottom:12 },
  title: { color:'#fff', fontSize:18, fontWeight:'800', flex:1 },
  add: { backgroundColor:'#7B1FA2', borderRadius:18, width:36, height:36, alignItems:'center', justifyContent:'center' },
  addT: { color:'#fff', fontSize:20, fontWeight:'900' },
  card: { flexDirection:'row', gap:8, alignItems:'center', backgroundColor:'#1d1d25', padding:12, borderRadius:10, marginBottom:10 },
  lockName: { color:'#fff', fontWeight:'700' },
  sub: { color:'#aaa', marginTop:2 },
  rowBtn: { backgroundColor:'#7B1FA2', paddingVertical:8, paddingHorizontal:10, borderRadius:8 },
  rowBtnT: { color:'#fff', fontSize:12, fontWeight:'600' },
  empty: { color:'#888', textAlign:'center', marginTop:40 }
});

// DoorLockApp/components/EditLockModal.jsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAuth } from '../auth/AuthContext';
import { updateLockName } from '../services/apiService';
import Toast from 'react-native-toast-message';

export default function EditLockModal() {
  const nav = useNavigation<any>();
  const { token } = useAuth();
  const { params } = useRoute<any>();
  const lockId = Number(params?.lockId);
  const [name, setName] = useState(params?.currentName || `My Lock #${lockId}`);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    try {
      setBusy(true);
      await updateLockName(token, lockId, name.trim());
      Toast.show({
        type: 'success',
        text1: 'Saved!',
        text2: 'Lock name updated.',
      });
      nav.goBack();
    } catch (e: any) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: String(e?.message || e),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={s.c}>
      <Text style={s.t}>Rename Lock #{lockId}</Text>
      <TextInput style={s.in} value={name} onChangeText={setName} />
      <TouchableOpacity onPress={save} disabled={busy} style={s.btn}>
        <Text style={s.bt}>{busy ? 'Saving…' : 'Save'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: '#0b0b0f', padding: 16, gap: 12 },
  t: { color: '#fff', fontSize: 18, fontWeight: '800' },
  in: {
    backgroundColor: '#1d1d25',
    color: '#fff',
    borderRadius: 8,
    padding: 12,
  },
  btn: {
    backgroundColor: '#7B1FA2',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  bt: { color: '#fff', fontWeight: '700' },
});

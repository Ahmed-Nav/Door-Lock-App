// DoorLockApp/components/RebuildAclScreen.jsx

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform, 
  PermissionsAndroid, 
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAuth } from '../auth/AuthContext';
import Toast from 'react-native-toast-message';


import {
  rebuildAcl,
  fetchLatestAcl, 
} from '../services/apiService';
import {
  scanAndConnectForLockId, 
  sendAcl,
  safeDisconnect, 
} from '../ble/bleManager';


export default function RebuildAclScreen() {
  const { token, role } = useAuth();
  const nav = useNavigation();
  const route = useRoute();
  const lockId = route.params?.lockId ? Number(route.params.lockId) : 0;

  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(
    lockId ? 'Ready to update access for Lock #' + lockId : 'No Lock ID',
  );


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


  const handleRebuildAndPush = async () => {
    let device; 
    try {
      if (role !== 'admin' || !lockId) {
        Toast.show({ type: 'error', text1: 'Forbidden or Invalid ID' });
        return;
      }
      setBusy(true);

      setStatus('Building new ACL...');
      await rebuildAcl(token, lockId);

      setStatus('Fetching new ACL...');
      const data = await fetchLatestAcl(token, lockId);
      if (!data?.ok || !data?.envelope) {
        throw new Error('Failed to fetch new ACL envelope from server.');
      }

      setStatus('Requesting permissions...');
      await ensurePermissions();

      setStatus('Scanning for lock...');
      device = await scanAndConnectForLockId(Number(lockId));

      setStatus('Sending ACL to lock...');
      await sendAcl(device, data.envelope);


      setStatus('ACL Sent Successfully!');
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Access list updated on lock.',
      });
      nav.goBack(); 
    } catch (error) {
      console.log('Rebuild and Push failed', error);
      setStatus('Failed');
      Toast.show({
        type: 'error',
        text1: 'Update Failed',
        text2: String(error?.message || error),
      });
    } finally {
      setBusy(false);
        await safeDisconnect(device);
    }
  };


  return (
    <View style={s.c}>
      <Text style={s.t}>Update User Access</Text>
      <Text style={s.label}>
        This will build a new access list for Lock #{lockId} and securely send
        it to the device.
      </Text>

      <TouchableOpacity
        style={[s.btn, !lockId && s.btnDisabled]}
        onPress={handleRebuildAndPush} 
        disabled={busy || !lockId}
      >
        <Text style={s.btnText}>
          {busy ? 'Working...' : 'Update Access on Lock'}
        </Text>
      </TouchableOpacity>


      <View style={s.statusC}>
        {busy && <ActivityIndicator color="#fff" />}
        <Text style={s.status}>{status}</Text>
      </View>
    </View>
  );
}


const s = StyleSheet.create({
  c: {
    flex: 1,
    backgroundColor: '#0b0b0f',
    padding: 16,
    gap: 16,
  },
  t: {
    color: 'white',
    fontSize: 22,
    fontWeight: '700',
  },
  label: {
    color: '#aaa',
    fontSize: 15,
    lineHeight: 22,
  },
  btn: {
    backgroundColor: '#7B1FA2',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  btnDisabled: {
    backgroundColor: '#555',
  },
  btnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  statusC: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#1d1d25',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  status: {
    color: '#eee',
    fontSize: 14,
    flex: 1, 
  },
});
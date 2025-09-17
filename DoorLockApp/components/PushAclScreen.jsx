import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import { scanAndConnectForLockId, sendAcl } from '../ble/bleManager';

export default function PushAclScreen() {

  const [lockId, setLockId] = useState('101');
  const [text, setText] = useState(`{
  "sig": "iZVXtdzHZ5uGQ5q6+zbq3gF2yJ95QQQn8MJSe4yIZI9mJ41IaTKC44vMUc9+Uj8BfW3cwpphV7/79azBHAbO2w==",
  "payload": {
    "lockId": 101,
    "version": 2,
    "users": [
      {
        "kid": "naveed",
        "pub": "BLHyCuPXq9hEJ/2dowQ/YZdis0NbftROqVOFU3MXFPyIiTuh4iO5+8QbFlzjW3uJ5jONmMK8ItJmU4FHq6KnnMY="
      }
    ]
  }
}
`);
  const [status, setStatus] =
    useState('Idle');

    async function ensurePermissions() {
      if (Platform.OS !== 'android') return;
      const perms = [
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      ];
      if (Platform.Version <31) {
        perms.push(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
      }
      for (const p of perms) {
        const g = await PermissionsAndroid.request(p);
        if (g !== PermissionsAndroid.RESULTS.GRANTED) throw new Error(`Missing permission: ${p}`);
      }
    }

    const push = async () => {
      try {
        if (!text.trim()) { Alert.alert('Paste ACL envelope JSON first'); return; }
        setStatus('Scanning...');
        await ensurePermissions();
        const envelope = JSON.parse(text);
        const device = await scanAndConnectForLockId(Number(lockId));
        setStatus('Sending ACL...');
        await sendAcl(device, envelope);
        await device.cancelConnection();
        setStatus('ACL Sent');
        Alert.alert('ACL Sent');
      } catch (error) {
        console.log(error);
        setStatus('ACL Failed');
        Alert.alert('ACL Failed', String(error?.message || error));
      }
    }

  return (
    <View style={s.c}>
      <Text style={s.t}>Push ACL</Text>
      <TextInput
        style={s.in}
        value={lockId}
        onChangeText={setLockId}
        placeholder="Lock ID"
        keyboardType="numeric"
      />
      <TextInput
        style={s.box}
        value={text}
        onChangeText={setText}
        placeholder="Paste ACL_envelope.json here"
        multiline
      />
      <TouchableOpacity style={s.btn} onPress={push}>
        <Text style={s.btxt}>Send to Lock</Text>
      </TouchableOpacity>
      <Text style={s.status}>Status: {status}</Text>
    </View>
  );
}
const s = StyleSheet.create({
  c: { flex: 1, padding: 16, gap: 12, backgroundColor: '#0b0b0f' },
  t: { color: 'white', fontSize: 20, fontWeight: '700' },
  in: {
    backgroundColor: '#1d1d25',
    color: 'white',
    borderRadius: 8,
    padding: 12,
  },
  box: {
    backgroundColor: '#1d1d25',
    color: 'white',
    borderRadius: 8,
    padding: 12,
    height: 220,
    textAlignVertical: 'top',
  },
  btn: {
    backgroundColor: '#7B1FA2',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  btxt: { color: 'white', fontWeight: '600' },
  status: { color: '#bbb', marginTop: 12 },
});
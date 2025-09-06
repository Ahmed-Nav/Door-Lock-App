import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { claimLock, putAcl } from '../services/apiService';
import {
  scanAndConnectForLockId,
  sendOwnershipSet,
  sendAcl,
} from '../ble/bleManager';
import { genP256Keypair, signP256RawB64 } from '../lib/keys';
import { Buffer } from 'buffer';

export default function SetupLockScreen({ token, adminEmail }) {
  const [lockId, setLockId] = useState('');
  const [claimCode, setClaimCode] = useState('');
  const [status, setStatus] = useState('');

  const onFirstClaim = async () => {
    const id = Number(lockId);
    setStatus('Claiming on server...');
    await claimLock(token, { lockId: id, claimCode });

    setStatus('Ensuring Admin key...');
    const { pubB64 } = await genP256Keypair('ADMIN_KEY'); // only generates once; subsequent calls overwrite label but ok

    setStatus('Connecting to lock...');
    const dev = await scanAndConnectForLockId(id);

    setStatus('Setting ownership...');
    await sendOwnershipSet(dev, { lockId: id, adminPubB64: pubB64, claimCode });

    // Build a tiny ACL payload with just the admin as a user for now
    const payload = {
      lockId: id,
      version: 1,
      expiresAt: Math.floor(Date.now() / 1000) + 30 * 24 * 3600,
      users: [{ kid: adminEmail || 'admin', pub: pubB64 }],
    };
    const payloadBytes = Buffer.from(JSON.stringify(payload), 'utf8');
    const sig64 = await signP256RawB64('ADMIN_KEY', payloadBytes);
    const envelope = { payload, sig: sig64 };

    setStatus('Pushing ACL...');
    await sendAcl(dev, envelope);
    await putAcl(token, id, envelope); // optional audit

    setStatus('Done!');
  };

  return (
    <View style={{ padding: 16 }}>
      <Text>First Claim & Configure</Text>
      <TextInput
        placeholder="Lock ID"
        value={lockId}
        onChangeText={setLockId}
        keyboardType="numeric"
      />
      <TextInput
        placeholder="Claim Code"
        value={claimCode}
        onChangeText={setClaimCode}
      />
      <TouchableOpacity onPress={onFirstClaim}>
        <Text>Configure</Text>
      </TouchableOpacity>
      <Text>{status}</Text>
    </View>
  );
}

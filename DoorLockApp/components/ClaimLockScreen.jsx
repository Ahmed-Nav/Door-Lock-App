// DoorLockApp/components/ClaimLockScreen.jsx

import React, { useState, useEffect } from 'react';

import {

  View,

  Text,

  TextInput,

  TouchableOpacity,

  StyleSheet,

  Alert,

} from 'react-native';

import Toast from 'react-native-toast-message';

import { useAuth } from '../auth/AuthContext';

import { useRoute, useNavigation } from '@react-navigation/native';

import { claimLockOnServer } from '../services/apiService';

import { getOrCreateDeviceKey, saveClaimContext } from '../lib/keys';



export default function ClaimLockScreen() {

  const { token, role, email } = useAuth();

  const route = useRoute();

  const navigation = useNavigation();



  const [lockId, setLockId] = useState('');

  const [claimCode, setClaimCode] = useState('');

  const [status, setStatus] = useState('Idle');



 

 

  useEffect(() => {

    const p = route?.params || {};

    if (p?.lockId) setLockId(String(p.lockId));

    if (p?.claimCode) setClaimCode(String(p.claimCode));

  }, [route?.params]);



  const doClaim = async () => {

    try {

      if (role !== 'admin') {

        Toast.show({ type: 'error', text1: 'Forbidden', text2: 'Only Admins can push ACLs.' })

        return;

      }

      setStatus('Claiming on server…');

      const { pubB64, kid } = await getOrCreateDeviceKey();

      const res = await claimLockOnServer(token, {

        lockId: Number(lockId),

        claimCode,

        kid

      });

      if (!res?.ok) throw new Error(res?.err || 'claim-failed');

      setStatus('Claimed');

      Toast.show({ type: 'success', text1: 'Claimed', text2: `Lock ${lockId} claimed on server.` })

      await saveClaimContext({

        lockId: Number(lockId),

        claimCode: claimCode.trim(),

        adminPubB64: res.adminPubB64,

      });

      navigation.replace('Ownership', {

        lockId: Number(lockId),

        claimCode: claimCode.trim(),

      });

    } catch (e) {

      setStatus('Claim Failed');

      const err = e?.response?.data?.err || e?.message;

      if (err === 'already-claimed')

        Toast.show({ type: 'error', text1: 'Already claimed', text2: 'This lock has already been claimed.' })

      else if (err === 'bad-claim')

        Toast.show({ type: 'error', text1: 'Invalid code', text2: 'The claim code is incorrect.' })

      else Toast.show({ type: 'error', text1: 'Claim failed', text2: String(err) })

    }

  };



  return (

    <View style={s.c}>

      <Text style={s.t}>Claim a lock</Text>

      <Text style={s.label}>

        {email ? `Signed in as ${email} (${role})` : 'Not signed in'}

      </Text>



     

      <TouchableOpacity

        style={[s.btn, { backgroundColor: '#7B1FA2' }]}

        onPress={() => navigation.navigate('ClaimQr')}

      >

        <Text style={s.bt}>Scan QR</Text>

      </TouchableOpacity>



      <TextInput

        style={s.in}

        placeholder="Lock ID"

        keyboardType="numeric"

        value={lockId}

        onChangeText={setLockId}

        placeholderTextColor="#888"

      />

      <TextInput

        style={s.in}

        placeholder="Claim Code"

        value={claimCode}

        onChangeText={setClaimCode}

        placeholderTextColor="#888"

      />



      <TouchableOpacity style={s.btn} onPress={doClaim}>

        <Text style={s.bt}>Claim</Text>

      </TouchableOpacity>



      <Text style={s.status}>Status: {status}</Text>

    </View>

  );

}



const s = StyleSheet.create({

  c: { flex: 1, padding: 16, gap: 12, backgroundColor: '#0b0b0f' },

  t: { color: 'white', fontSize: 20, fontWeight: '700' },

  label: { color: 'white' },

  in: {

    backgroundColor: '#1d1d25',

    color: 'white',

    borderRadius: 10,

    padding: 12,

  },

  btn: {

    backgroundColor: '#444',

    padding: 14,

    borderRadius: 10,

    alignItems: 'center',

  },

  bt: { color: 'white', fontWeight: '600' },

  status: { color: '#bbb', marginTop: 12 },

});
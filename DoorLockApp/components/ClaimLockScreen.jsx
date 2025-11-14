import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { useAuth } from '../auth/AuthContext';
import { useRoute, useNavigation } from '@react-navigation/native';
import { claimFirstLock, claimExistingLock } from '../services/apiService';
import { getOrCreateDeviceKey, saveClaimContext } from '../lib/keys';

export default function ClaimLockScreen() {
  const { token, user, activeWorkspace, refreshUser } = useAuth();
  const route = useRoute();
  const navigation = useNavigation();

  const [newWorkspaceName, setNewWorkspaceName] = useState('');

  const [claimMode, setClaimMode] = useState(null);

  const [manualLockId, setManualLockId] = useState('');
  const [manualClaimCode, setManualClaimCode] = useState('');

  const [scannedData, setScannedData] = useState(null);

  useEffect(() => {
    const p = route?.params || {};
    if (p?.lockId && p?.claimCode) {
      setScannedData({
        lockId: String(p.lockId),
        claimCode: String(p.claimCode),
      });
      setClaimMode('scan');
    }
  }, [route?.params]);

  const doClaim = async () => {
    const isScanMode = claimMode === 'scan' && scannedData;

    const lockIdToClaim = isScanMode ? scannedData.lockId : manualLockId;
    const claimCodeToClaim = isScanMode
      ? scannedData.claimCode
      : manualClaimCode;

    if (!lockIdToClaim || !claimCodeToClaim) {
      Toast.show({ type: 'error', text1: 'Missing fields' });
      return;
    }

    const isNewUser = !activeWorkspace;

    if (isNewUser && !newWorkspaceName.trim()) {
      Toast.show({ type: 'error', text1: 'Workspace name is required' });
      return;
    }

    try {
      const { pubB64, kid } = await getOrCreateDeviceKey();

      let res;
      if (isNewUser) {
        res = await claimFirstLock(token, {
          lockId: Number(lockIdToClaim),
          claimCode: claimCodeToClaim.trim(),
          kid,
          newWorkspaceName: newWorkspaceName.trim(),
        });
      } else {
        res = await claimExistingLock(token, activeWorkspace.workspace_id, {
          lockId: Number(lockIdToClaim),
          claimCode: claimCodeToClaim.trim(),
          kid,
        });
      }

      if (!res?.ok) throw new Error(res?.err || 'claim-failed');

      Toast.show({ type: 'success', text1: 'Claimed' });
      await refreshUser();


      await saveClaimContext({
        lockId: Number(lockIdToClaim),
        claimCode: claimCodeToClaim.trim(),
        adminPubB64: res.adminPubB64,
      });

      navigation.replace('Ownership', {
        lockId: Number(lockIdToClaim),
        claimCode: claimCodeToClaim.trim(),
      });
    } catch (e) {
      const err = e?.response?.data?.err || e?.message;
      if (err === 'already-claimed')
        Toast.show({
          type: 'error',
          text1: 'Already claimed',
          text2: 'This lock has already been claimed.',
        });
      else if (err === 'bad-claim')
        Toast.show({
          type: 'error',
          text1: 'Invalid code',
          text2: 'The claim code is incorrect.',
        });
      else
        Toast.show({
          type: 'error',
          text1: 'Claim failed',
          text2: String(err),
        });
    }
  };

  const renderClaimForm = () => {
    const isScanMode = claimMode === 'scan' && scannedData;

    const isNewUser = !activeWorkspace;

    return (
      <>
        {isNewUser && (
          <TextInput
            style={[s.in, s.editableInput]}
            placeholder="Your Workspace Name (e.g. My Home)"
            value={newWorkspaceName}
            onChangeText={setNewWorkspaceName}
            placeholderTextColor="#888"
          />
        )}
        <TextInput
          style={[s.in, !isScanMode && s.editableInput]}
          placeholder="Lock ID"
          keyboardType="numeric"
          value={isScanMode ? scannedData.lockId : manualLockId}
          onChangeText={setManualLockId}
          placeholderTextColor="#888"
          editable={!isScanMode}
        />
        <TextInput
          style={[s.in, !isScanMode && s.editableInput]}
          placeholder="Claim Code"
          value={isScanMode ? scannedData.claimCode : manualClaimCode}
          onChangeText={setManualClaimCode}
          placeholderTextColor="#888"
          editable={!isScanMode}
        />

        <TouchableOpacity style={s.btn} onPress={doClaim}>
          <Text style={s.bt}>Claim This Lock</Text>
        </TouchableOpacity>
      </>
    );
  };

  return (
    <ScrollView style={s.c}>
      <Text style={s.t}>Claim a lock</Text>
      <Text style={s.label}>
               {' '}
        {user?.email
          ? `Signed in as ${user.email} (${activeWorkspace?.role || 'User'})`
          : 'Not signed in'}
             {' '}
      </Text>

      {claimMode === null && (
        <View style={s.choiceContainer}>
          <TouchableOpacity
            style={[s.btn, { backgroundColor: '#7B1FA2' }]}
            onPress={() => navigation.navigate('ClaimQr')}
          >
            <Text style={s.bt}>Scan to Claim</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.btn}
            onPress={() => setClaimMode('manual')}
          >
            <Text style={s.bt}>Enter Manually</Text>
          </TouchableOpacity>
        </View>
      )}

      {claimMode === 'manual' && (
        <>
          <Text style={s.subtitle}>Enter Lock Details Manually</Text>
          {renderClaimForm()}
          <TouchableOpacity
            style={[s.btn, s.btnGhost]}
            onPress={() => setClaimMode(null)}
          >
            <Text style={s.btGhost}>Cancel</Text>
          </TouchableOpacity>
        </>
      )}

      {claimMode === 'scan' && (
        <>
          <Text style={s.subtitle}>Confirm Scanned Details</Text>
          {renderClaimForm()}
          <TouchableOpacity
            style={[s.btn, s.btnGhost]}
            onPress={() => navigation.navigate('ClaimQr')}
          >
            <Text style={s.btGhost}>Scan a Different Code</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, padding: 16, backgroundColor: '#0b0b0f' },
  t: { color: 'white', fontSize: 20, fontWeight: '700' },
  subtitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    marginTop: 20,
    textAlign: 'center',
  },
  label: { color: 'white', marginBottom: 20 },
  choiceContainer: {
    marginTop: 20,
    gap: 12,
  },
  in: {
    backgroundColor: '#333',
    color: '#999',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  editableInput: {
    backgroundColor: '#1d1d25',
    color: 'white',
  },
  btn: {
    backgroundColor: '#444',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  bt: { color: 'white', fontWeight: '600', fontSize: 16 },
  btnGhost: {
    backgroundColor: 'transparent',
    borderColor: '#444',
    borderWidth: 1,
  },
  btGhost: { color: '#888', fontWeight: '600', fontSize: 16 },
});

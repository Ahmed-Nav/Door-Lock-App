import React from 'react';
import { View, Alert } from 'react-native';
import QRCodeScanner from 'react-native-qrcode-scanner';
import { claimLockOnServer } from '../services/apiService';

export default function ScanClaimScreen({ navigation }) {
  const onRead = async e => {
    try {
      // expect QR JSON: {"lockId":101,"claimCode":"ABC-123-XYZ"}
      const data = JSON.parse(e.data);
      const res = await claimLockOnServer({
        lockId: Number(data.lockId),
        claimCode: String(data.claimCode),
      });
      if (!res?.ok) throw new Error(res?.err || 'claim-failed');
      Alert.alert('Claimed', `Lock ${data.lockId} claimed.`);
      navigation.goBack();
    } catch (err) {
      Alert.alert('Scan Error', String(err.message || err));
    }
  };
  return (
    <View style={{ flex: 1 }}>
      <QRCodeScanner onRead={onRead} />
    </View>
  );
}

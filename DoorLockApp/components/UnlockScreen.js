import React, { useState } from "react";
import { View, Button, Text, TextInput } from "react-native";
import { getPayload } from "../services/apiService";
import { advertiseBeacon } from "../ble/bleManager";

const UnlockScreen = () => {
  const [userName, setUserName] = useState('TestUser');
  const [yearOfBirth, setYearOfBirth] = useState('1990');
  const [status, setStatus] = useState('');

  const handleUnlock = async () => {
    setStatus('Sending Unlock Request...');
    try {
      const payload = await getPayload(userName, yearOfBirth);
      await advertiseBeacon(payload);
      setStatus('Unlock Request Sent!');
    } catch (error) {
      setStatus('Error Sending Unlock Request');
    }
  };

  return (
    <View style={{ padding:20 }}>
    <Text>User Name:</Text>
    <TextInput value={userName} onChange={setUserName} />
    <Text>Year Of Birth:</Text>
    <TextInput value={yearOfBirth} onChange={setYearOfBirth} keyboardType="numeric"/>
    <Button title="Unlock" onPress={handleUnlock} />
    <Text>{status}</Text>
    </View>
  );
};

export default UnlockScreen;
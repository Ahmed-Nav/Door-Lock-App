import React, { useState } from "react";
import { View, Button, Text, TextInput } from "react-native";
import { getPayload } from "../services/apiService";
import { advertiseBeacon, stopAdvertising } from "../ble/bleManager";
import { toHex } from "../ble/bleEncoding";

const UnlockScreen = () => {
  const [userName, setUserName] = useState('TestUser');
  const [yearOfBirth, setYearOfBirth] = useState('1990');
  const [status, setStatus] = useState('');
  const [lastFrameHex, setLastFrameHex] = useState("");

  const handleUnlock = async () => {
    setStatus('Sending Unlock Request...');
    try {
      const payload = await getPayload(userName, yearOfBirth);
      const frame = await advertiseBeacon(payload);
      setLastFrameHex(toHex(frame));
      setStatus('Unlock Request Sent (frame encoded)!');
    } catch (error) {
      setStatus('Error Sending Unlock Request');
      console.log(error);
    }
  };

  return (
    <View style={{ padding:20 }}>
    <Text>User Name:</Text>
    <TextInput value={userName} onChangeText={setUserName} />
    <Text>Year Of Birth:</Text>
    <TextInput value={yearOfBirth} onChange={setYearOfBirth} keyboardType="numeric"/>
    <Button title="Unlock" onPress={handleUnlock} />
    <Button title="Stop" onPress={() => { stopAdvertising(); }}/>
    <Text>{status}</Text>
    {lastFrameHex ? (
      <>
        <Text style={{ marginTop: 8 }}>Last frame (hex):</Text>
        <Text selectable>{lastFrameHex}</Text>
      </>
    ) : null}
    </View>
  );
}

export default UnlockScreen;
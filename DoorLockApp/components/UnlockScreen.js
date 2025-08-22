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
  const [frames, setFrames] = useState([]);

  const handleUnlock = async () => {
    setStatus('Sending Unlock Request...');
    try {
      const payload = await getPayload(userName, yearOfBirth);
      const frames = [];
      for (let i = 0; i < 5; i++) {
        const frame = await advertiseBeacon(payload);
        frames.push(toHex(frame));
        // Wait for a short period before advertising the next frame
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      setFrames(frames);
      setStatus('Unlock Request Sent (5 frames)');
    } catch (error) {
      setStatus('Error Sending Unlock Request');
      console.log(error);
    } finally {
      await stopAdvertising();
      setStatus('Advertising stopped');
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Text>User Name:</Text>
      <TextInput value={userName} onChangeText={setUserName} />
      <Text>Year Of Birth:</Text>
      <TextInput
        value={yearOfBirth}
        onChange={setYearOfBirth}
        keyboardType="numeric"
      />
      <Button title="Unlock" onPress={handleUnlock} />
      <Text>{status}</Text>
      {lastFrameHex ? (
        <View>
          <Text style={{ marginTop: 8 }}>Last frame (hex):</Text>
          <Text>{lastFrameHex}</Text>
        </View>
      ) : null}
    </View>
  );
}

export default UnlockScreen;
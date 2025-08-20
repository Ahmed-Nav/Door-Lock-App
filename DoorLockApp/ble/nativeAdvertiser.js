import { NativeModules } from 'react-native';
const { BeaconAdvertiser } = NativeModules;

export function startNativeAdvertising(base64Payload, manufacturerId = 0x1234) {
  return BeaconAdvertiser.startAdvertising(base64Payload, manufacturerId);
}

export function stopNativeAdvertising() {
  return BeaconAdvertiser.stopAdvertising();
}

import { PermissionsAndroid, Platform } from 'react-native';

export async function ensureBlePermissions() {
  if (Platform.OS !== 'android') return true;

  const permissions = [
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
  ];

  const result = await PermissionsAndroid.requestMultiple(permissions);
  return Object.values(result).every(v => v === PermissionsAndroid.RESULTS.GRANTED);
}

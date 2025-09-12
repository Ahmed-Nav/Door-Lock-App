import { BleManager, State } from 'react-native-ble-plx';
import { Buffer } from 'buffer';
import { Platform, PermissionsAndroid } from 'react-native';

export const UUIDS = {
  CFG_SERVICE: '0000c0f0-0000-1000-8000-00805f9b34fb',
  CFG_STATE: '0000c0f1-0000-1000-8000-00805f9b34fb',
  CFG_OWNERSHIP: '0000c0f2-0000-1000-8000-00805f9b34fb',
  CFG_ACL: '0000c0f3-0000-1000-8000-00805f9b34fb',
  CFG_RESULT: '0000c0f4-0000-1000-8000-00805f9b34fb',
  AUTH_SERVICE: '0000a000-0000-1000-8000-00805f9b34fb',
  AUTH_CHALLENGE: '0000a001-0000-1000-8000-00805f9b34fb',
  AUTH_RESPONSE: '0000a002-0000-1000-8000-00805f9b34fb',
  AUTH_RESULT: '0000a003-0000-1000-8000-00805f9b34fb',
};

const manager = new BleManager();

/** Request runtime permissions needed for scanning */
export async function ensureBlePermissions() {
  if (Platform.OS !== 'android') return true;
  const api = Platform.Version * 1;
  try {
    if (api >= 31) {
      const scan = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        {
          title: 'BLE scan permission',
          message: 'Required to find your lock',
          buttonPositive: 'OK',
        },
      );
      const conn = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        {
          title: 'BLE connect permission',
          message: 'Required to connect to your lock',
          buttonPositive: 'OK',
        },
      );
      return (
        scan === PermissionsAndroid.RESULTS.GRANTED &&
        conn === PermissionsAndroid.RESULTS.GRANTED
      );
    } else {
      const loc = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location permission',
          message: 'Android requires location for BLE scanning',
          buttonPositive: 'OK',
        },
      );
      return loc === PermissionsAndroid.RESULTS.GRANTED;
    }
  } catch (e) {
    console.warn('perm error', e);
    return false;
  }
}

/** Scan for any “Lock-*”, connect, read CFG_STATE, match lockId, return device */
export async function scanAndConnectForLockId(lockId, timeoutMs = 15000) {
  const ok = await ensureBlePermissions();
  if (!ok) throw new Error('BLE permission not granted.');

  return new Promise((resolve, reject) => {
    let finished = false;
    const finish = (err, dev) => {
      if (finished) return;
      finished = true;
      try {
        manager.stopDeviceScan();
      } catch {}
      err ? reject(err) : resolve(dev);
    };

    const sub = manager.onStateChange(async s => {
      if (s !== State.PoweredOn) return;
      sub.remove();

      const timer = setTimeout(
        () => finish(new Error('Scan timeout')),
        timeoutMs,
      );

      // IMPORTANT: no UUID filter here — Android won’t match our 16-bit shorts
      manager.startDeviceScan(
        null,
        { allowDuplicates: false },
        async (error, device) => {
          if (finished) return;
          if (error) {
            clearTimeout(timer);
            return finish(error);
          }
          if (!device) return;

          // Prefer the local name "Lock-<id>"
          const name = device.name || '';
          if (!name.startsWith('Lock-')) return;

          try {
            const d = await manager.connectToDevice(device.id, {
              timeout: 8000,
            });
            await d.discoverAllServicesAndCharacteristics();
            const st = await d.readCharacteristicForService(
              UUIDS.CFG_SERVICE,
              UUIDS.CFG_STATE,
            );
            const js = JSON.parse(
              Buffer.from(st.value, 'base64').toString('utf8'),
            ); // {lockId, claimed}
            if (js.lockId === lockId) {
              clearTimeout(timer);
              return finish(null, d);
            } else {
              await d.cancelConnection();
            }
          } catch (e) {
            // ignore and continue scanning
          }
        },
      );
    }, true);
  });
}

export async function sendOwnershipSet(
  device,
  { lockId, adminPubB64, claimCode },
) {
  const payload = { lockId, adminPub: adminPubB64, claimCode };
  const value = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');
  await device.writeCharacteristicWithoutResponseForService(
    UUIDS.CFG_SERVICE,
    UUIDS.CFG_OWNERSHIP,
    value,
  );
}

export async function sendAcl(device, envelope) {
  const value = Buffer.from(JSON.stringify(envelope), 'utf8').toString(
    'base64',
  );
  await device.writeCharacteristicWithoutResponseForService(
    UUIDS.CFG_SERVICE,
    UUIDS.CFG_ACL,
    value,
  );
}

import { BleManager } from 'react-native-ble-plx';
import { Buffer } from 'buffer';

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

export async function scanAndConnectForLockId(lockId, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const sub = manager.onStateChange(async s => {
      if (s === 'PoweredOn') {
        sub.remove();
        const timer = setTimeout(() => {
          manager.stopDeviceScan();
          reject(new Error('Scan timeout'));
        }, timeoutMs);

        manager.startDeviceScan(
          [UUIDS.CFG_SERVICE, UUIDS.AUTH_SERVICE],
          null,
          async (error, device) => {
            if (error) {
              clearTimeout(timer);
              manager.stopDeviceScan();
              reject(error);
              return;
            }
            // Optional: filter by localName like "Lock-<id>"
            if (!device) return;
            // We connect & read CFG_STATE to check lockId
            try {
              const d = await manager.connectToDevice(device.id, {
                timeout: 7000,
              });
              await d.discoverAllServicesAndCharacteristics();
              const s = await d.readCharacteristicForService(
                UUIDS.CFG_SERVICE,
                UUIDS.CFG_STATE,
              );
              const js = JSON.parse(
                Buffer.from(s.value, 'base64').toString('utf8'),
              );
              if (js.lockId === lockId) {
                clearTimeout(timer);
                manager.stopDeviceScan();
                resolve(d);
              } else {
                await d.cancelConnection();
              }
            } catch (_) {}
          },
        );
      }
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
  // Optionally subscribe to CFG_RESULT for OK/ERR
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

export async function doUnlock(device, { kid, signFn }) {
  const ch = await device.readCharacteristicForService(
    UUIDS.AUTH_SERVICE,
    UUIDS.AUTH_CHALLENGE,
  );
  const buf = Buffer.from(ch.value, 'base64');
  // challenge = nonce(16) | lockId(4)
  const msg = buf; // sign whole
  const sig64 = await signFn(msg); // returns base64 of 64B raw r||s

  const body = { kid, sig: sig64 };
  const val = Buffer.from(JSON.stringify(body), 'utf8').toString('base64');
  await device.writeCharacteristicWithoutResponseForService(
    UUIDS.AUTH_SERVICE,
    UUIDS.AUTH_RESPONSE,
    val,
  );

  // Optionally subscribe AUTH_RESULT for OK/ERR
}

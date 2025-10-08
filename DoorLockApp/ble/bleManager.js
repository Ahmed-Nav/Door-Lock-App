// ble/bleManager.js
import { BleManager } from 'react-native-ble-plx';
import { Buffer } from 'buffer';
import { writeChunked, sleep } from './utils'; // ✅ new import

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

function parseB64JsonOrNull(b64) {
  if (!b64) return null;
  try {
    const s = Buffer.from(b64, 'base64').toString('utf8').trim();
    if (!s) return null;
    return JSON.parse(s);
  } catch {
    return null;
  }
}

export async function scanAndConnectForLockId(lockId, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const sub = manager.onStateChange(async s => {
      if (s !== 'PoweredOn') return;
      sub.remove();

      const timer = setTimeout(() => {
        manager.stopDeviceScan();
        reject(new Error('Scan Timeout'));
      }, timeoutMs);

      manager.startDeviceScan(
        [UUIDS.CFG_SERVICE, UUIDS.AUTH_SERVICE],
        null,
        async (error, device) => {
          if (error) {
            clearTimeout(timer);
            manager.stopDeviceScan();
            return reject(error);
          }
          if (!device) return;

          try {
            const d = await manager.connectToDevice(device.id, {
              timeout: 7000,
            });
            await d.discoverAllServicesAndCharacteristics();
            await sleep(300);
            try {
              await d.requestMTU(247);
            } catch {}
            try {
              await d.requestConnectionPriority('high');
            } catch {}
            await sleep(250);

            const c = await d.readCharacteristicForService(
              UUIDS.CFG_SERVICE,
              UUIDS.CFG_STATE,
            );
            const js = parseB64JsonOrNull(c?.value);
            if (js && js.lockId === lockId) {
              clearTimeout(timer);
              manager.stopDeviceScan();
              return resolve(d);
            }
            await d.cancelConnection();
          } catch (_) {}
        },
      );
    }, true);
  });
}

function waitForCfgResult(device, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    let done = false;
    const sub = device.monitorCharacteristicForService(
      UUIDS.CFG_SERVICE,
      UUIDS.CFG_RESULT,
      (_e, c) => {
        if (done) return;
        const js = parseB64JsonOrNull(c?.value);
        if (!js) return;
        done = true;
        try {
          sub.remove();
        } catch {}
        resolve(js);
      },
    );
    setTimeout(() => {
      if (done) return;
      done = true;
      try {
        sub.remove();
      } catch {}
      reject(new Error('Timeout waiting for CFG_RESULT'));
    }, timeoutMs);
  });
}


export async function sendAcl(device, envelope) {
  const json = JSON.stringify(envelope);
  const totalLen = Buffer.byteLength(json, 'utf8');
  console.log(`[BLE] Sending ACL total ${totalLen} bytes`);

  const waiter = waitForCfgResult(device);
  await sleep(200);

  const header = `{len:${totalLen}}`;
  await device.writeCharacteristicWithResponseForService(
    UUIDS.CFG_SERVICE,
    UUIDS.CFG_ACL,
    Buffer.from(header, 'utf8').toString('base64'),
  );
  await sleep(250);

  await writeChunked(device, UUIDS.CFG_SERVICE, UUIDS.CFG_ACL, json, 180, 150);

  const res = await waiter;
  if (!res?.ok) throw new Error(`ACL failed: ${res?.err || 'unknown'}`);
  console.log('[BLE] ACL push success:', res);
  return res;
}


export async function sendAuthResponse(device, kid, sigB64) {
  const json = JSON.stringify({ kid, sig: sigB64 });
  const val = Buffer.from(json, 'utf8').toString('base64');
  await sleep(100);
  try {
    await device.writeCharacteristicWithResponseForService(
      UUIDS.AUTH_SERVICE,
      UUIDS.AUTH_RESPONSE,
      val,
    );
  } catch (e) {
    console.log('sendAuthResponse BLE error:', e);
    throw new Error('BLE write failed during auth');
  }
  await sleep(100);
}

export async function safeDisconnect(device) {
  try {
    await device.cancelConnection();
  } catch {}
}

// Rest of your helpers (getChallengeOnce, waitAuthResult, etc.) remain identical

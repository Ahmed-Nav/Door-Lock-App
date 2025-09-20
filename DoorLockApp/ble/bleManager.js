// ble/bleManager.js
import { BleManager } from 'react-native-ble-plx';
import { Buffer } from 'buffer';

export const UUIDS = {
  // Config
  CFG_SERVICE: '0000c0f0-0000-1000-8000-00805f9b34fb',
  CFG_STATE: '0000c0f1-0000-1000-8000-00805f9b34fb',
  CFG_OWNERSHIP: '0000c0f2-0000-1000-8000-00805f9b34fb',
  CFG_ACL: '0000c0f3-0000-1000-8000-00805f9b34fb',
  CFG_RESULT: '0000c0f4-0000-1000-8000-00805f9b34fb',
  // Auth
  AUTH_SERVICE: '0000a000-0000-1000-8000-00805f9b34fb',
  AUTH_CHALLENGE: '0000a001-0000-1000-8000-00805f9b34fb', // 20B = 16 nonce + 4 lockId (BE)
  AUTH_RESPONSE: '0000a002-0000-1000-8000-00805f9b34fb', // write {kid,sig:b64(raw r||s)}
  AUTH_RESULT: '0000a003-0000-1000-8000-00805f9b34fb', // notify {"ok":true}|{"ok":false,"err":...}
};

const manager = new BleManager();

const sleep = ms => new Promise(r => setTimeout(r, ms));

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

// ---------- Connect → discover → MTU/prio → verify lockId ----------
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
            try {
              await d.requestMTU(185);
            } catch {}
            try {
              await d.requestConnectionPriority('high');
            } catch {}
            await sleep(250); // small settle

            // verify lockId via CFG_STATE
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

// ---------- Phase II helpers (unchanged behaviour) ----------
function waitForCfgResult(device, timeoutMs = 12000) {
  return new Promise((resolve, reject) => {
    let done = false;
    const sub = device.monitorCharacteristicForService(
      UUIDS.CFG_SERVICE,
      UUIDS.CFG_RESULT,
      (_e, c) => {
        if (done) return;
        const js = parseB64JsonOrNull(c?.value);
        if (!js) return; // ignore empties
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

export async function sendOwnershipSet(
  device,
  { lockId, adminPubB64, claimCode },
) {
  const value = Buffer.from(
    JSON.stringify({ lockId, adminPub: adminPubB64, claimCode }),
    'utf8',
  ).toString('base64');
  const waiter = waitForCfgResult(device);
  await sleep(150);
  await device.writeCharacteristicWithResponseForService(
    UUIDS.CFG_SERVICE,
    UUIDS.CFG_OWNERSHIP,
    value,
  );
  const res = await waiter;
  if (!res?.ok) throw new Error('Ownership failed: ' + (res?.err || 'unknown'));
  return res;
}

export async function sendAcl(device, envelope) {
  // 1) Preflight on the phone (cheap, instant feedback)
  const sigLen = Buffer.from(String(envelope?.sig || ''), 'base64').length;
  if (sigLen !== 64)
    throw new Error('ACL envelope sig must be 64 bytes (base64 r||s)');

  const users = envelope?.payload?.users || [];
  for (const u of users) {
    const pub = Buffer.from(String(u?.pub || ''), 'base64');
    if (pub.length !== 65 || pub[0] !== 0x04) {
      throw new Error(
        `User "${u?.kid || '?'}" pub must be 65 bytes uncompressed (0x04...)`,
      );
    }
  }

  // 2) Prepare the base64 of the WHOLE JSON envelope
  const json = JSON.stringify(envelope);
  let value = Buffer.from(json, 'utf8').toString('base64');

  // 3) Belt & suspenders: remove any non-base64 chars (e.g. CR/LF/spaces)
  value = value.replace(/[^A-Za-z0-9+/=]/g, '');

  const waiter = waitForCfgResult(device);
  await sleep(150); // ensure CCCD for CFG_RESULT is armed
  await device.writeCharacteristicWithResponseForService(
    UUIDS.CFG_SERVICE,
    UUIDS.CFG_ACL,
    value,
  );

  const res = await waiter; // { ok:true } or { ok:false, err:... }
  if (!res?.ok) throw new Error('ACL failed: ' + (res?.err || 'unknown'));
  return res;
}


// -------------------- Phase III helpers --------------------
export async function getChallengeOnce(device, timeoutMs = 5000) {
  // 1) try READ immediately (avoids race)
  try {
    const c = await device.readCharacteristicForService(
      UUIDS.AUTH_SERVICE,
      UUIDS.AUTH_CHALLENGE,
    );
    if (c?.value) {
      const buf = Buffer.from(c.value, 'base64');
      if (buf.length === 20) return buf;
    }
  } catch (e) {
    console.log('A001 read err:', e?.message);
  }

  // 2) monitor for first notify
  return new Promise((resolve, reject) => {
    let done = false;
    const sub = device.monitorCharacteristicForService(
      UUIDS.AUTH_SERVICE,
      UUIDS.AUTH_CHALLENGE,
      (_e, c) => {
        if (done || !c?.value) return;
        const buf = Buffer.from(c.value, 'base64');
        if (buf.length !== 20) return;
        done = true;
        try {
          sub.remove();
        } catch {}
        resolve(buf);
      },
    );
    setTimeout(() => {
      if (done) return;
      done = true;
      try {
        sub.remove();
      } catch {}
      reject(new Error('Challenge timeout (A001)'));
    }, timeoutMs);
  });
}

export function waitAuthResult(device, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    let done = false;
    const sub = device.monitorCharacteristicForService(
      UUIDS.AUTH_SERVICE,
      UUIDS.AUTH_RESULT,
      (_e, c) => {
        if (done || !c?.value) return;
        const js = parseB64JsonOrNull(c.value);
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
      reject(new Error('Auth timeout'));
    }, timeoutMs);
  });
}

export async function sendAuthResponse(device, kid, sigB64) {
  const val = Buffer.from(
    JSON.stringify({ kid, sig: sigB64 }),
    'utf8',
  ).toString('base64');
  await device.writeCharacteristicWithResponseForService(
    UUIDS.AUTH_SERVICE,
    UUIDS.AUTH_RESPONSE,
    val,
  );
}

export async function safeDisconnect(device) {
  try {
    await device.cancelConnection();
  } catch {}
}

import { BleManager } from 'react-native-ble-plx';
import { Buffer } from 'buffer';
import { Alert, Linking } from 'react-native';

export const UUIDS = {
  // Config
  CFG_SERVICE: '0000c0f0-0000-1000-8000-00805f9b34fb',
  CFG_STATE: '0000c0f1-0000-1000-8000-00805f9b34fb',
  CFG_OWNERSHIP: '0000c0f2-0000-1000-8000-00805f9b34fb',
  CFG_ACL: '0000c0f3-0000-1000-8000-00805f9b34fb',
  CFG_RESULT: '0000c0f4-0000-1000-8000-00805f9b34fb', // Auth
  AUTH_SERVICE: '0000a000-0000-1000-8000-00805f9b34fb',
  AUTH_CHALLENGE: '0000a001-0000-1000-8000-00805f9b34fb', // 20B = 16 nonce + 4 lockId (BE)
  AUTH_RESPONSE: '0000a002-0000-1000-8000-00805f9b34fb', // write {kid,sig:b64(raw r||s)}
  AUTH_RESULT: '0000a003-0000-1000-8000-00805f9b34fb', // notify {"ok":true}|{"ok":false,"err":...}
};

const manager = new BleManager();

const sleep = ms => new Promise(r => setTimeout(r, ms));
export { sleep };
const __disconnecting = new Set();

// GLOBAL MAP: Used to track all active subscriptions that need manual, crash-proof cleanup.
const __activeSubs = new Map();
// Track in-progress connect promises per device to avoid duplicate simultaneous connects
const __connectPromises = new Map();
// Conservative chunk size (Max MTU is 509, but 244 is safer)
const MTU_PAYLOAD_SIZE = 500;

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
export async function ensureBluetoothEnabled() {
  const state = await manager.state();
  if (state !== 'PoweredOn') {
    return new Promise((resolve, reject) => {
      Alert.alert(
        'Bluetooth is Off',
        'Please turn on Bluetooth to connect to the lock.',
        [
          {
            text: 'Cancel',
            onPress: () => reject(new Error('Bluetooth not enabled')),
            style: 'cancel',
          },
          {
            text: 'Turn On',
            onPress: () => {
              manager.enable();
              resolve();
            },
          },
        ],
        { cancelable: false },
      );
    });
  }
}

export async function scanAndConnectForLockId(lockId, timeoutMs = 15000) {
  await ensureBluetoothEnabled();
  return new Promise((resolve, reject) => {
    const sub = manager.onStateChange(async s => {
      if (s !== 'PoweredOn') return;
      sub.remove();

      const timer = setTimeout(() => {
        manager.stopDeviceScan();
        reject(new Error('No lock found'));
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
            // Prevent concurrent connect attempts to the same device which can
            // cause native library races (BleAlreadyConnectedException / onError)
            async function connectOnce(id) {
              if (__connectPromises.has(id)) return __connectPromises.get(id);
              const p = (async () => {
                try {
                  return await manager.connectToDevice(id, { timeout: 7000 });
                } finally {
                  __connectPromises.delete(id);
                }
              })();
              __connectPromises.set(id, p);
              return p;
            }

            const d = await connectOnce(device.id);
            await d.discoverAllServicesAndCharacteristics();
            try {
              await d.requestMTU(512);
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
            try {
              await d.cancelConnection();
            } catch {}
          } catch (_) {}
        },
      );
    }, true);
  });
}

// ---------- Phase II helpers (MONITORS ONLY TRACK, DO NOT CLEAN UP) ----------
function waitForCfgResult(device, timeoutMs = 20000) {
  const transactionId = `cfg-${device.id}-${Date.now()}`;
  return new Promise((resolve, reject) => {
    let done = false;
    const sub = device.monitorCharacteristicForService(
      UUIDS.CFG_SERVICE,
      UUIDS.CFG_RESULT,
      (error, c) => {
        if (done) return;

        if (error) {
          done = true;
          __activeSubs.delete(transactionId);
          return reject(new Error(error.message || 'CFG_RESULT monitor-error'));
        }

        if (!c?.value) return;
        const js = parseB64JsonOrNull(c.value);
        if (!js) return;

        done = true;
        __activeSubs.delete(transactionId); // Clean map
        resolve(js);
      },
      transactionId, // Assign Transaction ID
    );

    __activeSubs.set(transactionId, sub); // Track subscription object

    setTimeout(() => {
      if (done) return;
      done = true;
      __activeSubs.delete(transactionId); // Clean map on timeout
      reject(new Error('Timeout waiting for CFG_RESULT'));
    }, timeoutMs);
  });
}

export async function sendOwnershipSet(
  device,
  { lockId, adminPubB64, claimCode },
) {
  const valueJson = JSON.stringify({
    lockId,
    adminPub: adminPubB64,
    claimCode,
  });

  let value = Buffer.from(valueJson, 'utf8').toString('base64');

  value = value.replace(/[^A-Za-z0-9+/=]/g, '');

  const waiter = waitForCfgResult(device);
  await sleep(150);
  await device.writeCharacteristicWithResponseForService(
    UUIDS.CFG_SERVICE,
    UUIDS.CFG_OWNERSHIP,
    value,
  );
  await sleep(300);
  const res = await waiter;
  if (!res?.ok) throw new Error('Ownership failed: ' + (res?.err || 'unknown'));
  return res;
}

export async function sendAcl(device, envelope) {
  // 1) Preflight checks (sigLen, user pub key format remain the same)
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
  } // 2) Prepare the full Base64 payload

  const json = JSON.stringify(envelope);
  let fullB64Value = Buffer.from(json, 'utf8').toString('base64');
  fullB64Value = fullB64Value.replace(/[^A-Za-z0-9+/=]/g, '');

  const totalLength = fullB64Value.length;
  let offset = 0;
  let sequence = 0;

  // Total number of chunks needed (rounded up)
  const totalChunks = Math.ceil(totalLength / MTU_PAYLOAD_SIZE);

  const waiter = waitForCfgResult(device);

  console.log(
    `[ACL_SEND] Total B64 length: ${totalLength} bytes. Chunks: ${totalChunks}`,
  );

  await sleep(150); // Ensure CCCD for CFG_RESULT is armed

  // 3) Fragmentation and Sequential Write Loop
  while (offset < totalLength) {
    const isStart = sequence === 0;
    const isEnd = offset + MTU_PAYLOAD_SIZE >= totalLength;

    // Determine the packet type based on position
    let packetType;
    if (isStart) {
      packetType = 0x01; // START
    } else if (isEnd) {
      packetType = 0x03; // END
    } else {
      packetType = 0x02; // MIDDLE
    }

    // Extract the chunk data (maximum MTU_PAYLOAD_SIZE)
    const chunkDataB64 = fullB64Value.substring(
      offset,
      offset + MTU_PAYLOAD_SIZE,
    );
    const chunkLength = Buffer.byteLength(chunkDataB64);

    // Calculate buffer size: 1 (Type) + 4 (Length, for START only) + Chunk Data
    let bufferSize = 1 + chunkLength;
    if (isStart) {
      bufferSize += 4;
    }

    const buffer = Buffer.alloc(bufferSize);
    buffer.writeUInt8(packetType, 0); // Write Type (1 byte)

    let payloadOffset = 1;

    if (isStart) {
      // Write Total Length (4 bytes, Little Endian for ESP32)
      buffer.writeUInt32LE(totalLength, 1);
      payloadOffset = 5;
    }

    // Write the actual B64 data chunk
    buffer.write(chunkDataB64, payloadOffset, 'binary');

    console.log(
      `[ACL_SEND] Writing chunk ${
        sequence + 1
      }/${totalChunks} (Type: ${packetType}) - Length: ${chunkLength} B`,
    );

    // Send the buffer (BlePlx automatically handles the raw byte write)
    await device.writeCharacteristicWithResponseForService(
      UUIDS.CFG_SERVICE,
      UUIDS.CFG_ACL,
      buffer.toString('base64'), // Buffer must be sent as Base64 string in BlePlx
    );

    offset += MTU_PAYLOAD_SIZE;
    sequence++;
    await sleep(100); // Give the ESP32 a small delay to process the packet
    if (isEnd) {
      await sleep(300); // Wait for the final write response to settle before waiter runs
    }
  } // 4) Wait for final confirmation from the lock (CFG_RESULT notification)

  const res = await waiter;

  if (!res?.ok) {
    const friendly = {
      'bad-b64': 'Bad base64 payload',
      'fragment-len': 'Data size mismatch during reassembly.',
      'fragment-start': 'Protocol error: missed start packet.',
      'reassembly-read': 'Lock failed to read full file.',
      'bad-sig': 'Admin signature verification failed',
      'lid/ver': 'LockId mismatch or version not newer',
    };
    throw new Error(
      `ACL failed: ${friendly[res?.err] || res?.err || 'unknown'}`,
    );
  }
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
  } // 2) monitor for first notify

  return new Promise((resolve, reject) => {
    const transactionId = `challenge-${device.id}-${Date.now()}`; // Unique ID
    let done = false;
    const sub = device.monitorCharacteristicForService(
      UUIDS.AUTH_SERVICE,
      UUIDS.AUTH_CHALLENGE,
      (error, c) => {
        if (done) return;
        if (error) {
          console.log('[BLE] AUTH_CHALLENGE error:', error.message);
          done = true;
          __activeSubs.delete(transactionId); // Cleanup map on error
          reject(error);
          return;
        }
        if (!c?.value) return;
        const buf = Buffer.from(c.value, 'base64');
        if (buf.length !== 20) return;
        done = true;
        __activeSubs.delete(transactionId); // Cleanup map on success
        resolve(buf);
      },
      transactionId, // Assign Transaction ID
    );

    __activeSubs.set(transactionId, sub); // Track the subscription

    setTimeout(() => {
      if (done) return;
      done = true;
      __activeSubs.delete(transactionId); // Cleanup map on timeout
      reject(new Error('Challenge timeout (A001)'));
    }, timeoutMs);
  });
}

export function waitAuthResult(device, timeoutMs = 10000) {
  const transactionId = `auth-${device.id}-${Date.now()}`; // Unique ID
  return new Promise(resolve => {
    let done = false;
    console.log('[BLE] waitAuthResult: subscribing to AUTH_RESULT…');

    const sub = device.monitorCharacteristicForService(
      UUIDS.AUTH_SERVICE,
      UUIDS.AUTH_RESULT,
      (error, characteristic) => {
        if (done) return;

        if (error) {
          console.log('[BLE] AUTH_RESULT error:', error.message || error);
          done = true;
          __activeSubs.delete(transactionId); // Cleanup map on error
          resolve({ ok: false, err: error.message || 'monitor-error' });
          return;
        }

        if (!characteristic?.value) return;

        try {
          const raw = Buffer.from(characteristic.value, 'base64').toString(
            'utf8',
          );
          console.log('[BLE] AUTH_RESULT raw:', raw);
          const js = JSON.parse(raw);
          done = true;
          __activeSubs.delete(transactionId); // Cleanup map on success
          resolve(js);
        } catch (e) {
          console.log('[BLE] AUTH_RESULT parse error:', e.message);
        }
      },
      transactionId, // Assign Transaction ID
    );

    __activeSubs.set(transactionId, sub); // Track the subscription

    setTimeout(() => {
      if (done) return;
      done = true;
      __activeSubs.delete(transactionId); // Cleanup map on timeout
      console.log('[BLE] AUTH_RESULT timeout');
      resolve({ ok: false, err: 'timeout' });
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

// 💡 safeDisconnect: THE CRASH ABATEMENT ROUTINE
export async function safeDisconnect(device, { waitMs = 700 } = {}) {
  try {
    if (!device) return;
    const id = device.id || device.deviceID || 'unknown';
    console.log('[BLE] safeDisconnect start (Isolation Fix)', id);

    if (__disconnecting.has(id)) {
      console.log('[BLE] already disconnecting', id);
      return;
    }
    __disconnecting.add(id); // 1. CRITICAL: FORCE UNSUBSCRIBE ALL MONITORS AND ABSORB CRASH

    // Collect the keys to remove for this device to avoid mutating the map
    const toRemove = [];
    for (const [key] of __activeSubs.entries()) {
      if (key.includes(id)) toRemove.push(key);
    }

    if (toRemove.length) {
      console.log(
        `[BLE] Auto-unsubscribing ${toRemove.length} monitors for ${id} (staggered)...`,
      );
      // Schedule staggered removal to avoid bursting native calls that trigger races
      let delay = 0;
      for (const key of toRemove) {
        const sub = __activeSubs.get(key);
        // Schedule each removal slightly delayed
        setTimeout(() => {
          try {
            if (sub && typeof sub.remove === 'function') {
              console.log(
                `[BLE] Removing subscription ${key} (delayed=${delay}ms)`,
              );
              sub.remove();
              console.log(`[BLE] Removed subscription ${key}`);
            } else {
              console.log(`[BLE] No valid subscription to remove for ${key}`);
            }
          } catch (e) {
            // Log and absorb native crashes as before but keep removal async
            console.log('--- NATIVE CRASH ABATED (delayed remove) ---');
            console.log(
              `[BLE] sub.remove() caught FATAL error for ${key}:`,
              e?.message,
            );
            console.log('----------------------------');
          } finally {
            __activeSubs.delete(key);
          }
        }, delay);
        delay += 80; // 80ms gap between removals
      }
      // Wait a bit longer than the total scheduled delay for native bridge to settle
      const waitMs = Math.min(2000, 1500 + delay);
      console.log('[BLE] Waiting for native bridge to settle...', waitMs);
      await sleep(waitMs);
    } else {
      console.log('[BLE] No active subscriptions to auto-unsubscribe for', id);
    }

    // 3. DISCONNECT THE PHYSICAL LINK

    let connected = false;
    try {
      connected = await device.isConnected?.();
    } catch {}
    if (connected) {
      try {
        await device.cancelConnection();
        console.log('[BLE] disconnected OK', id);
      } catch (e) {
        console.log('[BLE] cancelConnection err (ignore):', e.message);
      }
    }
  } catch (e) {
    console.log('[BLE] safeDisconnect err:', e?.message || String(e));
  } finally {
    const id = device?.id || device?.deviceID || 'unknown';
    __disconnecting.delete(id);

    for (const [key] of __activeSubs.entries()) {
      if (key.includes(id)) {
        __activeSubs.delete(key);
      }
    }
  }
}

import { ensureBlePermissions } from './permissions'
import { startNativeAdvertising, stopNativeAdvertising } from './nativeAdvertiser'

const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function advertiseTokenBase64(base64Payload, dwellMs = 200) {
  const ok = await ensureBlePermissions();
  if (!ok) throw new Error('Ble permissions not granted');

  await startNativeAdvertising(base64Payload, 0x1234); // your Company ID
  await sleep(dwellMs);
  await stopNativeAdvertising();
}

export async function stopAdvertising() {
  try {
    return await stopNativeAdvertising();
  } catch (e) {
    console.warn('stopAdvertising error:', e);
  }
}
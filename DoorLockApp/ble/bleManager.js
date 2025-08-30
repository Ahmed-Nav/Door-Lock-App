import { encodeFrame, toHex } from './bleEncoding';
import { ensureBlePermissions } from './permissions'
import { startNativeAdvertising, stopNativeAdvertising } from './nativeAdvertiser'
import { Buffer } from 'buffer';

const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function advertiseOneFrame(payload, dwellMs = 200) {
  const frame = encodeFrame(payload.userId, payload.timestamp);
  console.log('Ble frame (12 bytes):', toHex(frame));

  const ok = await ensureBlePermissions();
  if (!ok) throw new Error('Ble permissions not granted');

  const base64 = Buffer.from(frame).toString('base64');

  await startNativeAdvertising(base64, 0x1234); // start
  await sleep(dwellMs); // keep on-air briefly
  await stopNativeAdvertising(); // STOP this frame

  return frame; // (optional) bytes for debugging
}

// Keep this for safety if you want to force a stop somewhere else
export async function stopAdvertising() {
  try {
    return await stopNativeAdvertising();
  } catch (e) {
    console.warn('stopAdvertising error:', e);
  }
}
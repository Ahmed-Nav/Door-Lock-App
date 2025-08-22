import { encodeFrame, toHex } from './bleEncoding';
import { ensureBlePermissions } from './permissions'
import { startNativeAdvertising, stopNativeAdvertising } from './nativeAdvertiser'
import { Buffer } from 'buffer';

export async function advertiseBeacon(payload) {
  // payload : { userId: "Name_Year", timestamp: <ms or sec> }
  const frame = encodeFrame(payload.userId, payload.timestamp);
  const asHex = toHex(frame);
  console.log("Ble frame (12 bytes):", asHex)

  const ok = await ensureBlePermissions();
  if(!ok) throw new Error('Ble permissions not granted');

  // Convert Uint8Array -> base64
  const base64 = Buffer.from(frame).toString('base64');

  try {
    const res = await startNativeAdvertising(base64, 0x1234);
    return res;
  } catch (error) {
    console.error('Native advertise error:', error);
    throw error;
  }
}

export async function stopAdvertising() {
  try {
    return await stopNativeAdvertising();
  } catch (error) {
    console.warn('stopAdvertising error:', error);
  }
}
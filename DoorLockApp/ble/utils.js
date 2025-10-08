// ble/utils.js
import { Buffer } from 'buffer';

export const sleep = ms => new Promise(r => setTimeout(r, ms));


export async function writeChunked(
  device,
  service,
  char,
  text,
  mtu = 180,
  delay = 120,
) {
  const bytes = Buffer.from(text, 'utf8');
  for (let i = 0; i < bytes.length; i += mtu) {
    const chunk = bytes.slice(i, i + mtu);
    await device.writeCharacteristicWithResponseForService(
      service,
      char,
      Buffer.from(chunk).toString('base64'),
    );
    await sleep(delay); 
  }
}


export function waitForNotify(device, service, char, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    let done = false;
    const sub = device.monitorCharacteristicForService(
      service,
      char,
      (_e, c) => {
        if (done || !c?.value) return;
        done = true;
        try {
          sub.remove();
        } catch {}
        const decoded = Buffer.from(c.value, 'base64').toString('utf8');
        resolve(decoded);
      },
    );
    setTimeout(() => {
      if (!done) {
        done = true;
        try {
          sub.remove();
        } catch {}
        reject(new Error(`Timeout waiting for notify on ${char}`));
      }
    }, timeoutMs);
  });
}

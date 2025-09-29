// DoorLockApp/lib/keys.js
import * as Keychain from 'react-native-keychain';
import { p256 } from '@noble/curves/p256';

const serviceName = (uid, persona) => `dl:${uid}:${persona}`;

function derivePubRawB64(privBytes) {
  const pub = p256.getPublicKey(privBytes, false); // uncompressed (65 bytes)
  return Buffer.from(pub).toString('base64');
}

export async function ensureKeypair({ clerkUserId, persona }) {
  const service = serviceName(clerkUserId, persona);
  const existing = await Keychain.getGenericPassword({ service });
  if (existing?.password) {
    const privB64 = existing.password;
    const pubRawB64 = derivePubRawB64(Buffer.from(privB64, 'base64'));
    return { privB64, pubRawB64 };
  }
  const privBytes = p256.utils.randomPrivateKey();
  const privB64 = Buffer.from(privBytes).toString('base64');
  const pubRawB64 = derivePubRawB64(privBytes);
  await Keychain.setGenericPassword('p256', privB64, {
    service,
    accessible: Keychain.ACCESSIBLE.ALWAYS_THIS_DEVICE_ONLY,
    accessControl: Keychain.SECURITY_LEVEL.SECURE_HARDWARE,
  });
  return { privB64, pubRawB64 };
}

export async function getPersonaPrivKeyB64({ clerkUserId, persona }) {
  const existing = await Keychain.getGenericPassword({
    service: serviceName(clerkUserId, persona),
  });
  return existing?.password || null;
}

export async function clearAllPersonasForUser(clerkUserId) {
  await Keychain.resetGenericPassword({
    service: serviceName(clerkUserId, 'user'),
  }).catch(() => {});
  await Keychain.resetGenericPassword({
    service: serviceName(clerkUserId, 'admin'),
  }).catch(() => {});
}

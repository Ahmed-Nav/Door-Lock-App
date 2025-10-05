// DoorLockApp/lib/keys.js
import 'react-native-get-random-values';
import { p256 } from '@noble/curves/p256';
import { sha256 } from '@noble/hashes/sha256';
import * as Keychain from 'react-native-keychain';
import { Buffer } from 'buffer';
import axios from 'axios';
import { api } from '../services/apiService'; 

const KC_SERVICE = 'door-lock-device-key-v1';

const b64 = u8 => Buffer.from(u8).toString('base64');
const hexOf = u8 => Buffer.from(u8).toString('hex');
const kidOf = pubB64 =>
  Buffer.from(sha256(Buffer.from(pubB64, 'utf8')))
    .toString('hex')
    .slice(0, 16);

export async function getOrCreateDeviceKey() {
  const saved = await Keychain.getGenericPassword({ service: KC_SERVICE });
  if (saved?.password) {
    try {
      return JSON.parse(saved.password);
    } catch {}
  }
  const priv = p256.utils.randomPrivateKey(); // 32 bytes
  const pub = p256.getPublicKey(priv, false); // 65 bytes (0x04|X|Y)
  const obj = { privB64: b64(priv), pubB64: b64(pub), kid: kidOf(b64(pub)) };
  await Keychain.setGenericPassword('k', JSON.stringify(obj), {
    service: KC_SERVICE,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
  });
  return obj;
}

export async function signChallengeB64(challengeU8) {
  const { privB64 } = await getOrCreateDeviceKey();
  const privHex = Buffer.from(privB64, 'base64').toString('hex');
  const h32 = sha256(challengeU8);
  const sigAny = p256.sign(h32, privHex, { lowS: true });
  const raw =
    sigAny instanceof Uint8Array
      ? sigAny
      : sigAny?.toRawBytes?.() ?? sigAny?.toCompactRawBytes?.() ?? null;

  if (!raw || !(raw instanceof Uint8Array) || raw.length !== 64) {
    throw new Error('bad-signature-output');
  }

  return Buffer.from(raw).toString('base64');
}

export async function registerDeviceKeyWithServer(token) {
  const { pubB64, kid } = await getOrCreateDeviceKey();
  try {
    await api.post(
      `/keys/register`,
      { pubB64 },
      { headers: { Authorization: `Bearer ${token}` } },
    );
  } catch (e) {
    
    const data = e?.response?.data;
    const code = e?.code;
    const url = e?.config?.baseURL
      ? `${e.config.baseURL}${e.config.url}`
      : e?.config?.url;
    console.log('key register failed:', {
      url,
      code,
      status: e?.response?.status,
      data,
      message: e?.message,
    });
  }
  return kid;
}

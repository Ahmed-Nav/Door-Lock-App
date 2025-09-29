import 'react-native-get-random-values';
import { p256 } from '@noble/curves/p256';
import { sha256 } from '@noble/hashes/sha256';
import * as Keychain from 'react-native-keychain';
import { Buffer } from 'buffer';

export async function genP256Keypair(name) {
  const priv = Buffer.from(p256.utils.randomPrivateKey()); // 32B
  const pub = Buffer.from(p256.getPublicKey(priv, false)); // 65B uncompressed
  await Keychain.setGenericPassword(`${name}-label`, priv.toString('base64'), {
    service: name,
  });
  return { privB64: priv.toString('base64'), pubB64: pub.toString('base64') };
}

export async function getPrivateKeyB64(name) {
  const creds = await Keychain.getGenericPassword({ service: name });
  if (!creds) return null;
  return creds.password;
}

export async function signP256RawB64(name, msgUint8) {
  const privB64 = await getPrivateKeyB64(name);
  if (!privB64) throw new Error('no private key');
  const priv = Buffer.from(privB64, 'base64');
  const digest = sha256(msgUint8);
  const sig = p256.sign(digest, priv, { der: false }); // 64B raw r||s
  return Buffer.from(sig).toString('base64');
}

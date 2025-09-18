// crypto/signP256.js
import { p256 } from '@noble/curves/p256';
import { sha256 } from '@noble/hashes/sha256';
import { Buffer } from 'buffer';

export function signRaw64(privHex, messageBuf) {
  if (typeof privHex !== 'string' || privHex.length !== 64) {
    throw new Error('Bad private key hex (need 32 bytes / 64 hex chars)');
  }
  const msg =
    messageBuf instanceof Uint8Array ? messageBuf : Buffer.from(messageBuf);
  if (msg.length !== 20)
    throw new Error(`Expected 20-byte challenge, got ${msg.length}`);

  const h = sha256(msg);
  const sigMaybe = p256.sign(h, privHex, { lowS: true });

  let raw;
  if (sigMaybe instanceof Uint8Array) raw = sigMaybe;
  else if (typeof sigMaybe?.toRawBytes === 'function')
    raw = sigMaybe.toRawBytes();
  else if (typeof sigMaybe?.toCompactRawBytes === 'function')
    raw = sigMaybe.toCompactRawBytes();
  else throw new Error('Unexpected signature type from @noble/curves');

  return Buffer.from(raw).toString('base64'); // 64-byte r||s -> base64
}

// NEW: derive uncompressed (65B) public key from privHex, base64-encode it
export function pubFromPrivB64(privHex) {
  const pub = p256.getPublicKey(privHex, false); // false => uncompressed (65 bytes starts with 0x04)
  return Buffer.from(pub).toString('base64');
}

// NEW: local verifier (same rules as firmware)
export function verifyLocal(sigB64, messageBuf, pubB64) {
  const sig = Buffer.from(sigB64, 'base64'); // 64B r||s
  const msg =
    messageBuf instanceof Uint8Array ? messageBuf : Buffer.from(messageBuf);
  const h = sha256(msg); // firmware also hashes before verify
  const pub = Buffer.from(pubB64, 'base64'); // 65B uncompressed (0x04+X+Y)
  return p256.verify(sig, h, pub, { lowS: true });
}

import { p256 } from '@noble/curves/p256';
import { sha256 } from '@noble/hashes/sha256';
import { Buffer } from 'buffer';

// Sign the exact 20-byte challenge (nonce[16] || lockId[4]).
// Returns base64 of raw 64-byte r||s. Throws on bad inputs.
export function signRaw64(privHex, messageBuf) {
  if (typeof privHex !== 'string' || privHex.length !== 64) {
    throw new Error('Bad private key hex (need 32 bytes / 64 hex chars)');
  }

  const msg =
    messageBuf instanceof Uint8Array ? messageBuf : Buffer.from(messageBuf);
  if (msg.length !== 20) {
    throw new Error(`Expected 20-byte challenge, got ${msg.length}`);
  }

  // Always prehash ourselves for compatibility across @noble/curves versions
  const h = sha256(msg);

  // Some versions return Signature object (with toRawBytes), some return Uint8Array.
  const sigMaybe = p256.sign(h, privHex, { lowS: true });
  let raw;
  if (sigMaybe instanceof Uint8Array) {
    raw = sigMaybe; // already raw 64 bytes
  } else if (typeof sigMaybe?.toRawBytes === 'function') {
    raw = sigMaybe.toRawBytes(); // convert Signature -> 64 bytes
  } else if (typeof sigMaybe?.toCompactRawBytes === 'function') {
    raw = sigMaybe.toCompactRawBytes(); // also 64 bytes
  } else {
    throw new Error('Unexpected signature type from @noble/curves');
  }

  return Buffer.from(raw).toString('base64'); // 88-char base64
}

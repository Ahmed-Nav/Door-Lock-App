// Compact 12-byte frame: [USER_ID_HASH(4)] [TIMESTAMP(4)] [NONCE(4)]
// - USER_ID_HASH is a 32-bit hash of "Name_Year"
// - TIMESTAMP is unix seconds (big-endian)
// - NONCE is a random 32-bit number (big-endian)

function hash32(str) {
  // simple, fast 32-bit string hash (deterministic)
  let h = 0;
  for(let i = 0; i < str.length; i++) {
    h = ( h << 5) - h + str.charCodeAt(i);
    h |= 0; // force int 32
  }
  return h >>> 0; //unsigned
}

export function encodeFrame(userId, timestampInput, nonce32) {
  const userHash = hash32(userId);

  let ts;
  if (timestampInput == null) {
    ts = Math.floor(Date.now() / 1000);
  } else {
    ts = Number(timestampInput);
    // if it's ms(very large), convert to seconds
    if(ts > 4_000_000_000) ts = Math.floor(ts / 1000);
  }

  const nonce = nonce32 ?? Math.floor(Math.random() * 0xffffffff);

  const bytes = new Uint8Array(12);
  const view = new DataView(bytes.buffer);

  // network order (big-endian) so firmware is straightforward
  view.setUint32(0, userHash, false);
  view.setUint32(4, ts, false);
  view.setUint32(8, nonce, false);

  return bytes;
}

export function decodeFrame(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length !== 12) {
    throw new Error("Invalid frame length (expected 12 bytes)");
  }
  const view = new DataView(bytes.buffer);
  return {
    userHash : view.getUint32(0),
    timestamp: view.getUint32(4),
    nonce : view.getUint32(8),
  };
}

export function toHex(bytes) {
  return Array.from(bytes)
  .map(b => b.toString(16).padStart(2, "0"))
  .join(" ");
}
const ALPH = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
function toBase32(buf) {
  let bits = 0,
    value = 0,
    out = "";
  for (const b of buf) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += ALPH[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPH[(value << (5 - bits)) & 31];
  return out;
}
module.exports = { toBase32 };

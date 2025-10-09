function bad(code, message, status = 400) {
  const e = new Error(message || code);
  e.code = code;
  e.status = status;
  return e;
}

function parseLockId(v) {
  const n = Number.parseInt(String(v), 10);
  if (!Number.isInteger(n) || n <= 0)
    throw bad("BAD_LOCK_ID", "Invalid lockId");
  return n;
}

function requireString(v, field, { min = 1, max = 4096 } = {}) {
  if (typeof v !== "string")
    throw bad("BAD_INPUT", `Field ${field} must be string`);
  const s = v.trim();
  if (s.length < min || s.length > max)
    throw bad("BAD_INPUT", `Field ${field} invalid length`);
  return s;
}

function requireArray(a, field, { max = 1000 } = {}) {
  if (!Array.isArray(a)) throw bad("BAD_INPUT", `Field ${field} must be array`);
  if (a.length === 0 || a.length > max)
    throw bad("BAD_INPUT", `Field ${field} invalid length`);
  return a;
}

module.exports = { bad, parseLockId, requireString, requireArray };

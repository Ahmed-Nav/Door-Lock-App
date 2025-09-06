import axios from 'axios';

const API_URL = 'https://door-lock-app.onrender.com/api';

const authJSON = token => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
});

/**
 * Ask backend for a per-lock BLE token (V|ts|nonce|HMAC) encoded as base64.
 * Backend route expects { lockId } in the body and reads the user from the Bearer token.
 */
export const getUnlockToken = async (token, lockId) => {
  const res = await axios.post(
    `${API_URL}/unlock/token`,
    { lockId },
    { headers: authJSON(token) },
  );
  return res.data.payload; // base64 string
};

/**
 * Ensure the signed-in user exists in your DB (create if missing).
 * Uses the Bearer token; no body needed.
 */
export const syncUserToBackend = async token => {
  const res = await axios.post(
    `${API_URL}/auth/sync`,
    {},
    { headers: authJSON(token) },
  );
  return res.data;
};


/**
 * Claim a lock using its { lockId, claimCode }.
 * Requires admin privileges server-side.
 */
export const claimLock = async (token, { lockId, claimCode }) => {
  const res = await axios.post(
    `${API_URL}/claim`,
    { lockId, claimCode },
    { headers: authJSON(token) },
  );
  return res.data;
};

/**
 * Register the user's public key with the server (during onboarding).
 * Server normally reads user identity from the Bearer token.
 * The optional email header can be removed if your backend gets email from OIDC.
 */
export const registerUserPublicKey = async (token, userPub, email) => {
  const res = await axios.post(
    `${API_URL}/users/registerPublicKey`,
    { userPub },
    {
      headers: {
        ...authJSON(token),
        ...(email ? { 'x-user-email': email } : {}),
      },
    },
  );
  return res.data;
};

/**
 * Upload an Admin-signed ACL envelope for a lock.
 */
export const putAcl = async (token, lockId, envelope) => {
  const res = await axios.put(`${API_URL}/locks/${lockId}/acl`, envelope, {
    headers: authJSON(token),
  });
  return res.data;
};

/**
 * Fetch the latest ACL envelope for a lock.
 */
export const getAcl = async (token, lockId) => {
  const res = await axios.get(`${API_URL}/locks/${lockId}/acl`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data; // { payload, version }
};


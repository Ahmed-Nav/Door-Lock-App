import axios from 'axios';

const API_URL = 'https://door-lock-app.onrender.com/api';

export const getMe = async token => {
  const r = await axios.get(`${API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return r.data;
};

export const listGroups = async token => {
  const r = await axios.get(`${API_URL}/groups`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return r.data;
};

export const createGroup = async (token, name) => {
  const r = await axios.post(
    `${API_URL}/groups`,
    { name },
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return r.data;
};

export const addUserToGroup = async (token, groupId, userEmail) => {
  const r = await axios.post(
    `${API_URL}/groups/${groupId}/users`,
    { userEmail },
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return r.data;
};

export const assignLockToGroup = async (token, groupId, lockId) => {
  const r = await axios.post(
    `${API_URL}/groups/${groupId}/locks`,
    { lockId },
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return r.data;
};

export const rebuildAcl = async (token, lockId) => {
  const r = await axios.post(
    `${API_URL}/locks/${lockId}/acl/rebuild`,
    {},
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return r.data;
};

// ✅ helper: rebuild on server, then fetch the latest envelope
export const rebuildAndFetchAcl = async (token, lockId) => {
  await rebuildAcl(token, lockId);
  const r = await axios.get(`${API_URL}/locks/${lockId}/acl/latest`);
  return r.data; // { ok:true, envelope }
};

export const syncUserToBackend = async token => {
  const res = await axios.post(
    `${API_URL}/auth/sync`,
    {},
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  return res.data;
};

/** Claim on server: POST /locks/:lockId/claim { claimCode } */
export async function claimLockOnServer({ lockId, claimCode }) {
  const res = await axios.post(`${API_URL}/locks/${lockId}/claim`, {
    claimCode,
  });
  return res.data; // { ok:true } or { ok:false, err }
}

/** Fetch latest ACL envelope from server: GET /locks/:lockId/acl/latest */
export async function fetchLatestAcl(lockId) {
  const res = await axios.get(`${API_URL}/locks/${lockId}/acl/latest`);
  return res.data; // { ok:true, envelope:{payload,sig} }
}

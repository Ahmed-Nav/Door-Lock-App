// DoorLockApp/services/apiService.js
import axios from 'axios';

const API_URL = 'https://door-lock-app.onrender.com/api';

// --- helpers ---
const auth = token => ({
  headers: { Authorization: `Bearer ${token}` },
});

// -- Auth / me --
export const getMe = async token => {
  const r = await axios.get(`${API_URL}/auth/me`, auth(token));
  return r.data; // { ok:true, user:{id,email,role} }
};

// (Optional) keep if you still use it somewhere
export const syncUserToBackend = async token => {
  const r = await axios.post(`${API_URL}/auth/sync`, {}, auth(token));
  return r.data;
};

// --- Groups (admin-only) ---
export const getGroup = async (token, groupId) => {
  const r = await axios.get(`${API_URL}/groups/${groupId}`, {
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
  const r = await axios.post(`${API_URL}/groups`, { name }, auth(token));
  return r.data;
};

export const addUserToGroup = async (
  token,
  groupId,
  userEmail,
  { remove = false } = {},
) => {
  const r = await axios.post(
    `${API_URL}/groups/${groupId}/users`,
    { userEmail, remove },
    auth(token),
  );
  return r.data;
};

export const assignLockToGroup = async (
  token,
  groupId,
  lockId,
  { remove = false } = {},
) => {
  const r = await axios.post(
    `${API_URL}/groups/${groupId}/locks`,
    { lockId, remove },
    auth(token),
  );
  return r.data;
};

export const removeUserFromGroup = async (token, groupId, userEmail) => {
  const r = await axios.post(
    `${API_URL}/groups/${groupId}/users`,
    { userEmail, remove: true },
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return r.data;
};

export const unassignLockFromGroup = async (token, groupId, lockId) => {
  const r = await axios.post(
    `${API_URL}/groups/${groupId}/locks`,
    { lockId, remove: true },
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return r.data;
};

export const deleteGroup = async (token, groupId) => {
  const r = await axios.delete(`${API_URL}/groups/${groupId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return r.data;
};

// --- Claim (admin-only) ---
export const claimLockOnServer = async (token, { lockId, claimCode }) => {
  const r = await axios.post(
    `${API_URL}/locks/${lockId}/claim`,
    { claimCode },
    auth(token),
  );
  return r.data; // { ok:true } or { ok:false, err }
};

// --- ACL (admin-only) ---
export const rebuildAcl = async (token, lockId) => {
  const r = await axios.post(
    `${API_URL}/locks/${lockId}/acl/rebuild`,
    {},
    auth(token),
  );
  return r.data; // { ok:true, envelope, ... } or { ok:false, err }
};

export const fetchLatestAcl = async (token, lockId) => {
  const r = await axios.get(
    `${API_URL}/locks/${lockId}/acl/latest`,
    auth(token),
  );
  return r.data; // { ok:true, envelope }
};

// --- Admin public key (optional) ---
export const getAdminPub = async token => {
  const r = await axios.get(`${API_URL}/auth/admin/pub`, auth(token));
  return r.data; // { ok:true, pub }
};

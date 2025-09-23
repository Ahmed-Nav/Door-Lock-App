import axios from 'axios';
const API_URL = 'https://door-lock-app.onrender.com/api';

// token-aware axios helper (optional but nice)
function authHeaders(token) {
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
}

export const getMe = async token => {
  const r = await axios.get(`${API_URL}/auth/me`, authHeaders(token));
  return r.data;
};

export const claimLockOnServer = async (token, { lockId, claimCode }) => {
  const r = await axios.post(
    `${API_URL}/locks/${lockId}/claim`,
    { claimCode },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return r.data;
};

export const rebuildAcl = async (token, lockId) => {
  const r = await axios.post(
    `${API_URL}/locks/${lockId}/acl/rebuild`,
    {},
    authHeaders(token),
  );
  return r.data;
};

export const fetchLatestAcl = async lockId => {
  const r = await axios.get(`${API_URL}/locks/${lockId}/acl/latest`);
  return r.data;
};

// groups
export const listGroups = async token =>
  (await axios.get(`${API_URL}/groups`, authHeaders(token))).data;
export const createGroup = async (token, name) =>
  (await axios.post(`${API_URL}/groups`, { name }, authHeaders(token))).data;
export const addUserToGroup = async (token, groupId, userEmail) =>
  (
    await axios.post(
      `${API_URL}/groups/${groupId}/users`,
      { userEmail },
      authHeaders(token),
    )
  ).data;
export const assignLockToGroup = async (token, groupId, lockId) =>
  (
    await axios.post(
      `${API_URL}/groups/${groupId}/locks`,
      { lockId },
      authHeaders(token),
    )
  ).data;

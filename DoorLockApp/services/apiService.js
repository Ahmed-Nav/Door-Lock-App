// DoorLockApp/services/apiService.js
import axios from 'axios';

export const API_URL = 'https://door-lock-app.onrender.com/api';

export const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});


export const auth = token => ({
  headers: { Authorization: `Bearer ${token}` },
});


export const getMe = async token => {
  const r = await axios.get(`${API_URL}/auth/me`, auth(token));
  return r.data; // { ok:true, user:{id,email,role} }
};


export const syncUserToBackend = async token => {
  const r = await axios.post(`${API_URL}/auth/sync`, {}, auth(token));
  return r.data;
};


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


export const claimLockOnServer = async (token, { lockId, claimCode, kid }) => {
  const r = await axios.post(
    `${API_URL}/locks/${lockId}/claim`,
    { claimCode, kid },
    auth(token),
  );
  return r.data;
};


export const rebuildAcl = async (token, lockId) => {
  const r = await axios.post(
    `${API_URL}/locks/${lockId}/acl/rebuild`,
    {},
    auth(token),
  );
  return r.data; 
};

export const fetchLatestAcl = async (token, lockId) => {
  const r = await axios.get(
    `${API_URL}/locks/${lockId}/acl/latest`,
    auth(token),
  );
  return r.data; 
};


export const getAdminPub = async token => {
  try {
    const r = await axios.get(`${API_URL}/auth/admin/pub`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    return r.data; 
  } catch (e) {
    console.log('getAdminPub failed:', {
      url: `${API_URL}/auth/admin/pub`,
      status: e?.response?.status,
      data: e?.response?.data,
      message: e?.message,
    });
    throw e;
  }
};

export const listLocks = async token => {
  const r = await api.get('/locks', auth(token));
  return r.data; 
};

export async function updateLockName(token, lockId, name) {
  const r = await api.patch(
    `/locks/${lockId}`,
    { name },
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  return r.data;
}

export const listUsers = async token => {
  const r = await api.get('/users', auth(token));
  return r.data; 
};

export const updateUserRole = async (token, userId, role) => {
  const r = await api.patch(`/users/${userId}/role`, { role }, auth(token));
  return r.data; 
};
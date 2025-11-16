// DoorLockApp/services/apiService.js
import axios from 'axios';

export const API_URL = 'https://door-lock-app.onrender.com/api';

export const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

api.interceptors.response.use(
  r => r,
  err => {
    return Promise.reject(err);
  },
);

export const auth = token => ({
  headers: { Authorization: `Bearer ${token}` },
});


export const authWorkspace = (token, workspaceId) => {
  if (!workspaceId) {
    // Safety check to prevent bugs
    throw new Error('No active workspace selected. API call aborted.');
  }
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Workspace-ID': workspaceId,
    },
  };
};


export const getMe = async token => {
  const r = await axios.get(`${API_URL}/auth/me`, auth(token));
  return r.data;
};

export const syncUserToBackend = async token => {
  const r = await axios.post(`${API_URL}/auth/sync`, {}, auth(token));
  return r.data;
};

export const getAdminPub = async (token, workspaceId) => {
  try {
    const r = await axios.get(
      `${API_URL}/auth/admin/pub`,
      authWorkspace(token, workspaceId), 
    );
    return r.data;
  } catch (e) {
    console.log('getAdminPub failed:', e);
    throw e;
  }
};


export const getGroup = async (token, workspaceId, groupId) => {
  const r = await api.get(
    `/groups/${groupId}`,
    authWorkspace(token, workspaceId), 
  );
  return r.data;
};

export const listGroups = async (token, workspaceId) => {
  const r = await api.get('/groups', authWorkspace(token, workspaceId)); 
  return r.data;
};

export const createGroup = async (token, workspaceId, name) => {
  const r = await api.post(
    '/groups',
    { name },
    authWorkspace(token, workspaceId), 
  );
  return r.data;
};

export const addUserToGroup = async (
  token,
  workspaceId,
  groupId,
  userEmail,
  { remove = false } = {},
) => {
  const r = await api.post(
    `/groups/${groupId}/users`,
    { userEmail, remove },
    authWorkspace(token, workspaceId), 
  );
  return r.data;
};

export const assignLockToGroup = async (
  token,
  workspaceId,
  groupId,
  lockId,
  { remove = false } = {},
) => {
  const r = await api.post(
    `/groups/${groupId}/locks`,
    { lockId, remove },
    authWorkspace(token, workspaceId), 
  );
  return r.data;
};

export const removeUserFromGroup = async (
  token,
  workspaceId,
  groupId,
  userEmail,
) => {
  const r = await api.post(
    `/groups/${groupId}/users`,
    { userEmail, remove: true },
    authWorkspace(token, workspaceId), 
  );
  return r.data;
};

export const unassignLockFromGroup = async (
  token,
  workspaceId,
  groupId,
  lockId,
) => {
  const r = await api.post(
    `/groups/${groupId}/locks`,
    { lockId, remove: true },
    authWorkspace(token, workspaceId), 
  );
  return r.data;
};

export const deleteGroup = async (token, workspaceId, groupId) => {
  const r = await api.delete(
    `/groups/${groupId}`,
    authWorkspace(token, workspaceId), 
  );
  return r.data;
};


export const claimFirstLock = async (
  token,
  { lockId, claimCode, kid, newWorkspaceName },
) => {
  const r = await api.post(
    `/locks/${lockId}/claim`,
    { claimCode, kid, workspaceName: newWorkspaceName },
    auth(token), 
  );
  return r.data;
};

export const claimExistingLock = async (
  token,
  workspaceId,
  { lockId, claimCode, kid },
) => {
  const r = await api.post(
    `/locks/${lockId}/claim`,
    { claimCode, kid }, 
    authWorkspace(token, workspaceId), 
  );
  return r.data;
};

export const listLocks = async (token, workspaceId) => {
  const r = await api.get('/locks', authWorkspace(token, workspaceId)); 
  return r.data;
};

export const fetchMyLocks = async (token, workspaceId) => {
  const r = await api.get('/locks/my', authWorkspace(token, workspaceId)); 
  return r.data;
};

export async function updateLockName(token, workspaceId, lockId, name) {
  const r = await api.patch(
    `/locks/${lockId}`,
    { name },
    authWorkspace(token, workspaceId), 
  );
  return r.data;
}

export async function deleteLock(token, workspaceId, lockId) {
  const res = await api.delete(
    `/locks/${lockId}`,
    authWorkspace(token, workspaceId), 
  );
  return res.data;
}

export async function patchLock(token, workspaceId, lockId, body) {
  const res = await api.patch(
    `/locks/${lockId}`,
    body,
    authWorkspace(token, workspaceId), 
  );
  return res.data;
}

export const rebuildAcl = async (token, workspaceId, lockId) => {
  const r = await api.post(
    `/locks/${lockId}/acl/rebuild`,
    {},
    authWorkspace(token, workspaceId), 
  );
  return r.data;
};

export const fetchLatestAcl = async (token, workspaceId, lockId) => {
  const r = await api.get(
    `/locks/${lockId}/acl/latest`,
    authWorkspace(token, workspaceId), 
  );
  return r.data;
};

export const listUsers = async (token, workspaceId) => {
  const r = await api.get('/users', authWorkspace(token, workspaceId)); 
  return r.data;
};

export const getUserByEmail = async (token, workspaceId, email) => {
  const r = await api.get(`/users/by-email/${email}`, authWorkspace(token, workspaceId));
  return r.data;
};

export const updateUserRole = async (token, workspaceId, userId, role) => {
  const r = await api.patch(
    `/users/${userId}/role`,
    { role },
    authWorkspace(token, workspaceId), 
  );
  return r.data;
};

export const deleteUser = async (token, workspaceId, userId) => {
  const r = await api.delete(
    `/users/${userId}`,
    authWorkspace(token, workspaceId), 
  );
  return r.data;
};

export const inviteUser = async (token, workspaceId, email, role) => {
  const r = await api.post(
    '/invite',
    { email, role },
    authWorkspace(token, workspaceId),
  );
  return r.data;
};

export const acceptInvite = async (token, inviteToken) => {
  const r = await api.post(
    '/invite/accept',
    { inviteToken },
    auth(token), 
  );
  return r.data;
};

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
    // ... (your interceptor is fine) ...
    return Promise.reject(err);
  },
);

// V1 helper (still used for getMe)
export const auth = token => ({
  headers: { Authorization: `Bearer ${token}` },
});

// --- THIS IS THE NEW V2 HELPER ---
// We will use this for every API call that needs to be "workspace-aware"
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

// --- AUTH ROUTES ---
// getMe is called BEFORE a workspace is selected. It does NOT change.
export const getMe = async token => {
  const r = await axios.get(`${API_URL}/auth/me`, auth(token));
  // V2: This now returns { ok: true, user: { id, email, workspaces: [...] } }
  return r.data;
};

// syncUserToBackend also does NOT change.
export const syncUserToBackend = async token => {
  const r = await axios.post(`${API_URL}/auth/sync`, {}, auth(token));
  return r.data;
};

// --- V2: getAdminPub NOW REQUIRES a workspace ID ---
export const getAdminPub = async (token, workspaceId) => {
  try {
    const r = await axios.get(
      `${API_URL}/auth/admin/pub`,
      authWorkspace(token, workspaceId), // <-- V2 Change
    );
    return r.data;
  } catch (e) {
    console.log('getAdminPub failed:', e);
    throw e;
  }
};

// --- GROUP ROUTES (ALL CHANGED) ---
export const getGroup = async (token, workspaceId, groupId) => {
  const r = await api.get(
    `/groups/${groupId}`,
    authWorkspace(token, workspaceId), // <-- V2 Change
  );
  return r.data;
};

export const listGroups = async (token, workspaceId) => {
  const r = await api.get('/groups', authWorkspace(token, workspaceId)); // <-- V2 Change
  return r.data;
};

export const createGroup = async (token, workspaceId, name) => {
  const r = await api.post(
    '/groups',
    { name },
    authWorkspace(token, workspaceId), // <-- V2 Change
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
    authWorkspace(token, workspaceId), // <-- V2 Change
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
    authWorkspace(token, workspaceId), // <-- V2 Change
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
    authWorkspace(token, workspaceId), // <-- V2 Change
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
    authWorkspace(token, workspaceId), // <-- V2 Change
  );
  return r.data;
};

export const deleteGroup = async (token, workspaceId, groupId) => {
  const r = await api.delete(
    `/groups/${groupId}`,
    authWorkspace(token, workspaceId), // <-- V2 Change
  );
  return r.data;
};

// --- LOCK & CLAIM ROUTES (ALL CHANGED) ---

// V2: This is the new function for the "New User" flow
export const claimFirstLock = async (
  token,
  { lockId, claimCode, kid, newWorkspaceName },
) => {
  const r = await api.post(
    `/locks/${lockId}/claim`,
    { claimCode, kid, workspaceName: newWorkspaceName },
    auth(token), // This flow does *not* send a workspace ID
  );
  return r.data;
};

// V2: This is the new function for the "Existing User" flow
export const claimExistingLock = async (
  token,
  workspaceId,
  { lockId, claimCode, kid },
) => {
  const r = await api.post(
    `/locks/${lockId}/claim`,
    { claimCode, kid }, // No workspaceName in the body
    authWorkspace(token, workspaceId), // Sends workspace ID in the header
  );
  return r.data;
};

export const listLocks = async (token, workspaceId) => {
  const r = await api.get('/locks', authWorkspace(token, workspaceId)); // <-- V2 Change
  return r.data;
};

export const fetchMyLocks = async (token, workspaceId) => {
  const r = await api.get('/locks/my', authWorkspace(token, workspaceId)); // <-- V2 Change
  return r.data;
};

export async function updateLockName(token, workspaceId, lockId, name) {
  const r = await api.patch(
    `/locks/${lockId}`,
    { name },
    authWorkspace(token, workspaceId), // <-- V2 Change
  );
  return r.data;
}

export async function deleteLock(token, workspaceId, lockId) {
  const res = await api.delete(
    `/locks/${lockId}`,
    authWorkspace(token, workspaceId), // <-- V2 Change
  );
  return res.data;
}

export async function patchLock(token, workspaceId, lockId, body) {
  const res = await api.patch(
    `/locks/${lockId}`,
    body,
    authWorkspace(token, workspaceId), // <-- V2 Change
  );
  return res.data;
}

// --- ACL ROUTES (ALL CHANGED) ---
export const rebuildAcl = async (token, workspaceId, lockId) => {
  const r = await api.post(
    `/locks/${lockId}/acl/rebuild`,
    {},
    authWorkspace(token, workspaceId), // <-- V2 Change
  );
  return r.data;
};

export const fetchLatestAcl = async (token, workspaceId, lockId) => {
  const r = await api.get(
    `/locks/${lockId}/acl/latest`,
    authWorkspace(token, workspaceId), // <-- V2 Change
  );
  return r.data;
};

// --- USER MANAGEMENT ROUTES (ALL CHANGED) ---
export const listUsers = async (token, workspaceId) => {
  const r = await api.get('/users', authWorkspace(token, workspaceId)); // <-- V2 Change
  return r.data;
};

export const updateUserRole = async (token, workspaceId, userId, role) => {
  const r = await api.patch(
    `/users/${userId}/role`,
    { role },
    authWorkspace(token, workspaceId), // <-- V2 Change
  );
  return r.data;
};

export const deleteUser = async (token, workspaceId, userId) => {
  const r = await api.delete(
    `/users/${userId}`,
    authWorkspace(token, workspaceId), // <-- V2 Change
  );
  return r.data;
};

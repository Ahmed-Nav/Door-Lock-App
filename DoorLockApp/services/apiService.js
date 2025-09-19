import axios from 'axios';

const API_URL = 'https://door-lock-app.onrender.com/api';

export const syncUserToBackend = async (token) => {
  const res = await axios.post(`${API_URL}/auth/sync`, {}, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

/** Claim on server: POST /locks/:lockId/claim { claimCode } */
export async function claimLockOnServer({ lockId, claimCode }) {
  const res = await axios.post(`${API_URL}/locks/${lockId}/claim`, { claimCode });
  return res.data; // { ok:true } or { ok:false, err }
}

/** Fetch latest ACL envelope from server: GET /locks/:lockId/acl/latest */
export async function fetchLatestAcl(lockId) {
  const res = await axios.get(`${API_URL}/locks/${lockId}/acl/latest`);
  return res.data; // { ok:true, envelope:{payload,sig} }
}
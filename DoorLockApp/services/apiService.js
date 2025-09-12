import axios from 'axios';

const API_URL = 'https://door-lock-app.onrender.com/api';

export const syncUserToBackend = async (token) => {
  const res = await axios.post(`${API_URL}/auth/sync`, {}, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const claimLock = async (token, { lockId, claimCode }) => {
  const res = await axios.post(`${API_URL}/claim`, { lockId, claimCode }, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};
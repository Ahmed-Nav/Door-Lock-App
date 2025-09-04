import axios from "axios";

const API_URL = 'https://door-lock-app.onrender.com/api';

export const getPayload = async (token) => {
  try{
    const res = await axios.post(`${API_URL}/unlock/payload`, {}, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      }
    });
    return res.data.payload;
  } catch (err) {
    console.error("getPayload error:", err.response?.data || err.message || err);
    throw err;
  }
};

export const getUnlockToken = async (token, lockId) => {
  const res = await axios.post(
    `${API_URL}/unlock/token`,
    { lockId }, // <— send lockId
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    },
  );
  return res.data.payload; // base64
};



export const syncUserToBackend = async (token) => {
  try {
    const res = await axios.post(`${API_URL}/auth/sync`, {}, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    return res.data;
  } catch (err) {
    console.error("syncUserToBackend error:", err.response?.data || err.message || err);
    throw err;
  }
};
import axios from "axios";

const API_URL = 'https://door-lock-app.onrender.com/api/unlock';

export const getPayload = async (userName, yearOfBirth) => {
  try{
    const response = await axios.post(`${API_URL}/payload`, { userName, yearOfBirth });
    return response.data.payload;
  } catch (err) {
    console.error(err);
    throw err;
  }
};
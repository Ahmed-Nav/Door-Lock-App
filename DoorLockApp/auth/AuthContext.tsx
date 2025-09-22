import React, { createContext, useContext, useState, useCallback } from 'react';
import * as Keychain from 'react-native-keychain';
import { getMe } from '../services/apiService';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(null);
  const [me, setMe] = useState(null);
  const setToken = async (raw) => { setTokenState(raw); };

  const refreshMe = useCallback(async () => {
    if (!token) { setMe(null); return { user:null }; }
    const res = await getMe(token); // { ok, user }
    setMe(res?.user || null);
    return res;
  }, [token]);

  const logout = async () => {
    setMe(null); setTokenState(null);
    try { await Keychain.resetGenericPassword(); } catch {}
  };

  return <Ctx.Provider value={{ token, setToken, me, refreshMe, logout }}>
    {children}
  </Ctx.Provider>;
}

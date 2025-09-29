// DoorLockApp/auth/AuthContext.tsx
import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import jwtDecode from 'jwt-decode';
import * as Keychain from 'react-native-keychain';
import api from '../services/apiService';
import { warmUp, signIn as oidcSignIn, signOutRemote } from '../services/oidcClient';
import { ensureKeypair, clearAllPersonasForUser } from '../lib/keys';

type Role = 'admin' | 'user';
type Persona = 'admin' | 'user';
type Tokens = { accessToken: string; idToken: string; refreshToken?: string; tokenExpirationDate?: string };

type Ctx = {
  isSignedIn: boolean;
  idToken: string | null;
  clerkUserId: string | null;
  email: string | null;
  accountRole: Role | null;
  persona: Persona;
  setPersona: (p: Persona) => void;
  signIn: () => Promise<void>;
  switchAccount: () => Promise<void>;
  loadTokensFromStore: () => Promise<void>;
  clearSession: () => Promise<void>;
};

const AuthContext = createContext<Ctx>(null as any);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tokens, setTokens] = useState<Tokens | null>(null);
  const [accountRole, setAccountRole] = useState<Role | null>(null);
  const [claims, setClaims] = useState<any>(null);
  const [persona, setPersona] = useState<Persona>('user');

  useEffect(() => { warmUp(); }, []);

  const persistTokens = async (t: Tokens | null) => {
    if (t) {
      await Keychain.setGenericPassword('oidc', JSON.stringify(t), { service: 'dl:oidc' });
    } else {
      await Keychain.resetGenericPassword({ service: 'dl:oidc' }).catch(() => {});
    }
  };

  const loadTokensFromStore = async () => {
    const s = await Keychain.getGenericPassword({ service: 'dl:oidc' });
    if (s !== false) {
      const t = JSON.parse(s.password);
      setTokens(t);
      setClaims(jwtDecode(t.idToken));
      await postLoginHydrate(t.idToken);
    }
  };

  const clearSession = async () => {
    setTokens(null);
    setClaims(null);
    setAccountRole(null);
    setPersona('user');
    await persistTokens(null);
  };

  const postLoginHydrate = async (idToken: string) => {
    // 1) Tell backend who we are (upsert & get role)
    const me = await api.get('/auth/me', { headers: { Authorization: `Bearer ${idToken}` } });
    const role: Role = me.data.user.role;
    setAccountRole(role);

    // 2) Ensure & upload USER persona public key (idempotent)
    const clerkUserId = (jwtDecode as any)(idToken).sub;
    const { pubRawB64 } = await ensureKeypair({ clerkUserId, persona: 'user' });
    await api.put('/users/me/public-keys',
      { persona: 'user', publicKeyB64: pubRawB64 },
      { headers: { Authorization: `Bearer ${idToken}` } }
    );

    // Admin can later toggle persona for BLE signing; server role stays authoritative.
    if (role !== 'admin') setPersona('user');
  };

  const signIn = async () => {
    const t = await oidcSignIn();               // system browser login (prompt=select_account)
    setTokens(t);
    setClaims(jwtDecode(t.idToken));
    await persistTokens(t);
    await postLoginHydrate(t.idToken);
  };

  const switchAccount = async () => {
    try { await signOutRemote(tokens || undefined); } catch {}
    if (claims?.sub) await clearAllPersonasForUser(claims.sub);
    await clearSession();
    // Next call to signIn() will show Picker due to prompt=select_account
  };

  const value = useMemo<Ctx>(() => ({
    isSignedIn: !!tokens,
    idToken: tokens?.idToken || null,
    clerkUserId: claims?.sub || null,
    email: claims?.email || null,
    accountRole,
    persona, setPersona,
    signIn,
    switchAccount,
    loadTokensFromStore,
    clearSession,
  }), [tokens, claims, accountRole, persona]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => useContext(AuthContext);

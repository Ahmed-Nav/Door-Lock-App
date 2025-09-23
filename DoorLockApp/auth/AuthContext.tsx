// DoorLockApp/context/AuthContext.tsx
import React, { createContext, useContext, useState, useMemo } from 'react';
import { authorize, AuthorizeResult } from 'react-native-app-auth';
import * as Keychain from 'react-native-keychain';
import { getMe } from '../services/apiService';

type Role = 'admin' | 'user' | null;
type AuthState = { token: string|null; role: Role; email: string|null; loading: boolean };
type Ctx = AuthState & {
  signIn: (role: Exclude<Role, null>) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthCtx = createContext<Ctx>(null as any);

const ISSUER = 'https://moving-ferret-78.clerk.accounts.dev';
const REDIRECT_URL = 'com.doorlockapp://callback';

const OAUTH_ADMIN = {
  clientId: '5si8xSwPl6n2oQLY',
  redirectUrl: REDIRECT_URL,
  scopes: ['openid','email','profile'],
  serviceConfiguration: {
    authorizationEndpoint: `${ISSUER}/oauth/authorize`,
    tokenEndpoint:        `${ISSUER}/oauth/token`,
  },
};

const OAUTH_USER = {
  clientId: '2JbPx2I2fknWbmf8',
  redirectUrl: REDIRECT_URL,
  scopes: ['openid','email','profile'],
  serviceConfiguration: {
    authorizationEndpoint: `${ISSUER}/oauth/authorize`,
    tokenEndpoint:        `${ISSUER}/oauth/token`,
  },
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ token: null, role: null, email: null, loading: false });

  const signIn = async (role: 'admin' | 'user') => {
    setState(s => ({ ...s, loading: true }));
    try {
      const cfg = role === 'admin' ? OAUTH_ADMIN : OAUTH_USER;
      const auth: AuthorizeResult = await authorize(cfg);
      const raw = auth.idToken || auth.accessToken || auth.id_token || auth.access_token;
      if (!raw) throw new Error('No token from IdP');

      // store
      await Keychain.setGenericPassword('clerk', JSON.stringify({ raw, role }));
      // verify with backend, also upsert user and confirm role
      const me = await getMe(raw);
      setState({ token: raw, role: me.user.role as Role, email: me.user.email, loading: false });
    } catch (e:any) {
      setState(s => ({ ...s, loading: false }));
      throw e;
    }
  };

  const signOut = async () => {
    await Keychain.resetGenericPassword();
    setState({ token: null, role: null, email: null, loading: false });
  };

  const value = useMemo(() => ({ ...state, signIn, signOut }), [state]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() { return useContext(AuthCtx); }

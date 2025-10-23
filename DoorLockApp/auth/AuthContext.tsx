// DoorLockApp/auth/AuthContext.tsx
import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
} from 'react';
import { AuthConfiguration, authorize, revoke } from 'react-native-app-auth';
import jwtDecode from 'jwt-decode';
import * as Keychain from 'react-native-keychain';
import { getMe } from '../services/apiService';
import { registerDeviceKeyWithServer } from '../lib/keys';
import Toast from 'react-native-toast-message';

type Role = 'admin' | 'user' | null;

type AuthState = {
  token: string | null;
  role: Role;
  email: string | null;
  loading: boolean;
  signInAdmin: () => Promise<void>;
  signInUser: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthCtx = createContext<AuthState>({
  token: null,
  role: null,
  email: null,
  loading: true,
  signInAdmin: async () => {},
  signInUser: async () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthCtx);

// ── Your existing Clerk OIDC values (unchanged)
const ISSUER = 'https://moving-ferret-78.clerk.accounts.dev';
const REDIRECT_URL = 'com.doorlockapp://callback';
const ADMIN_CLIENT_ID = '5si8xSwPl6n2oQLY';
const USER_CLIENT_ID = '2JbPx2I2fknWbmf8';

const cfg = (clientId: string): AuthConfiguration => ({
  clientId,
  redirectUrl: REDIRECT_URL,
  scopes: ['openid', 'email', 'profile'],
  serviceConfiguration: {
    authorizationEndpoint: `${ISSUER}/oauth/authorize`,
    tokenEndpoint: `${ISSUER}/oauth/token`,
    revocationEndpoint: `${ISSUER}/oauth/revoke`,
  },
  additionalParameters: {
    prompt: 'login',
    max_age: '0',
  },
});

function decodeEmail(idToken?: string | null) {
  try {
    return idToken ? (jwtDecode as any)(idToken)?.email ?? null : null;
  } catch {
    return null;
  }
}

const KC_SERVICE = 'doorlock-auth-v1';

type SavedSession = { token: string; role: Role; email: string | null };

async function saveSession(s: SavedSession) {
  await Keychain.setGenericPassword('session', JSON.stringify(s), {
    service: KC_SERVICE,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
  });
}

async function loadSession(): Promise<SavedSession | null> {
  const c = await Keychain.getGenericPassword({ service: KC_SERVICE });
  if (!c) return null;
  try {
    return JSON.parse(c.password) as SavedSession;
  } catch {
    return null;
  }
}

async function clearSession() {
  try {
    await Keychain.resetGenericPassword({ service: KC_SERVICE });
  } catch {}
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const sess = await loadSession();
        if (sess?.token) {
          setToken(sess.token);
          setEmail(sess.email ?? decodeEmail(sess.token));

          const me = await getMe(sess.token).catch(() => null);
          setRole(me?.user?.role ?? sess.role ?? null);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function doSignIn(clientId: string) {
    setLoading(true);
    let rawToken = null;
    try {
      const auth = await authorize(cfg(clientId));
      rawToken =
        auth.idToken ||
        auth.accessToken ||
        (auth as any).id_token ||
        (auth as any).access_token;
      if (!rawToken) throw new Error('No token from IdP');

      const emailFromToken = decodeEmail(rawToken);
      setToken(rawToken);
      setEmail(emailFromToken);

      const me = await getMe(rawToken).catch(error => {
        if (
          clientId === ADMIN_CLIENT_ID &&
          (error?.response?.status === 403 || error?.response?.status === 401)
        ) {
          Toast.show({
            type: 'error',
            text1: 'Access Denied',
            text2: 'You do not have administrative privileges.',
          });
        }
        return null;
      });
      const resolvedRole: Role = me?.user?.role ?? null;
      setRole(resolvedRole);

      if (!resolvedRole) {
        throw new Error('Role resolution failed');
      }

      try {
        await registerDeviceKeyWithServer(rawToken);
      } catch {}

      await saveSession({
        token: rawToken,
        role: resolvedRole,
        email: emailFromToken ?? null,
      });
    } catch (e) {
      console.error('signIn failed:', e);
      if (rawToken) {
        // Attempt to revoke the token we just received
        await revoke(
          { ...cfg(clientId) },
          { tokenToRevoke: rawToken, sendClientId: true },
        ).catch(() => {});
      }
      await clearSession();
      setToken(null);
      setRole(null);
      setEmail(null);
    } finally {
      setLoading(false);
    }
  }

  const signInAdmin = () => doSignIn(ADMIN_CLIENT_ID);
  const signInUser = () => doSignIn(USER_CLIENT_ID);

  const signOut = async () => {
    setLoading(true);
    try {
      if (token) {
        await revoke(
          {
            ...cfg(role === 'admin' ? ADMIN_CLIENT_ID : USER_CLIENT_ID),
          },
          { tokenToRevoke: token, sendClientId: true },
        ).catch(() => {});
      }
    } finally {
      await clearSession(); // your Keychain wipe
      setToken(null);
      setRole(null);
      setEmail(null);
      setLoading(false);
    }
  };

  const value = useMemo(
    () => ({ token, role, email, loading, signInAdmin, signInUser, signOut }),
    [token, role, email, loading],
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
};

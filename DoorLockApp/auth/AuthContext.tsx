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
import AsyncStorage from '@react-native-async-storage/async-storage';

type WorkspaceRole = 'owner' | 'admin' | 'user';

type Workspace = {
  workspace_id: string;
  role: WorkspaceRole;
};

type User = {
  id: string;
  email: string;
  workspaces: Workspace[];
};

type AuthState = {
  token: string | null;
  user: User | null;
  activeWorkspace: Workspace | null;
  role: WorkspaceRole | null;
  email: string | null;
  loading: boolean;
  signIn: (token?: string) => Promise<void>;
  signOut: () => Promise<void>;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthCtx = createContext<AuthState>({
  token: null,
  user: null,
  activeWorkspace: null,
  role: null,
  email: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
  switchWorkspace: async () => {},
  refreshUser: async () => {},
});

export const useAuth = () => useContext(AuthCtx);

// ── Your existing Clerk OIDC values (unchanged)
const ISSUER = 'https://moving-ferret-78.clerk.accounts.dev';
const REDIRECT_URL = 'com.doorlockapp://callback';
const CLIENT_ID = '2JbPx2I2fknWbmf8';

const authConfig: AuthConfiguration = {
  clientId:CLIENT_ID,
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
};

function decodeEmail(idToken?: string | null) {
  try {
    return idToken ? (jwtDecode as any)(idToken)?.email ?? null : null;
  } catch {
    return null;
  }
}

const KC_SERVICE = 'doorlock-auth-v2';
const KC_LAST_WORKSPACE_KEY = 'doorlock-last-workspace-v2';


async function saveToken(token: string) {
  await Keychain.setGenericPassword('session', token, {
    service: KC_SERVICE,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
  });
}

async function loadToken(): Promise<string | null> {
  const c = await Keychain.getGenericPassword({ service: KC_SERVICE });
  return c ? c.password : null;
}

async function clearToken() {
  try {
    await Keychain.resetGenericPassword({ service: KC_SERVICE });
  } catch {}
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(
    null,
  );
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const signOut = async () => {
    setLoading(true);
    try {
      if (token) {
        await revoke(authConfig, {
          tokenToRevoke: token,
          sendClientId: true,
        }).catch(() => {});
      }
    } finally {
      await clearToken();
      setToken(null);
      setUser(null);
      setActiveWorkspace(null);
      setEmail(null);
      setLoading(false);
    }
  };

  const loadAppData = async (authToken: string) => {
    try {
      const { ok, user: apiUser } = await getMe(authToken);
      if (!ok) throw new Error('Failed to get user');

      setUser(apiUser);
      setEmail(apiUser.email);

      // Check if they have any workspaces
      if (apiUser.workspaces && apiUser.workspaces.length > 0) {
        let workspaceToSet: Workspace | null = null;
        const lastId = await AsyncStorage.getItem(KC_LAST_WORKSPACE_KEY);

        if (lastId && typeof lastId === 'string' && lastId.length === 24) {
          workspaceToSet = apiUser.workspaces.find(
            (w: Workspace) => w.workspace_id === lastId,
          );
        }

        // If no valid lastId, default to the first workspace
        if (!workspaceToSet) {
          workspaceToSet = apiUser.workspaces[0];
        }

        // Ensure workspaceToSet is actually one of the user's current workspaces
        if (workspaceToSet && !apiUser.workspaces.some(w => w.workspace_id === workspaceToSet?.workspace_id)) {
          workspaceToSet = null; // Discard invalid workspace
          await AsyncStorage.removeItem(KC_LAST_WORKSPACE_KEY);
        }

        // We must check if workspaceToSet is *still* valid before using it
        if (workspaceToSet) {
          setActiveWorkspace(workspaceToSet);
          // And we only set storage if it's a valid object
          await AsyncStorage.setItem(
            KC_LAST_WORKSPACE_KEY,
            workspaceToSet.workspace_id,
          );
        } else {
          // This is a safety fallback
          setActiveWorkspace(null);
          await AsyncStorage.removeItem(KC_LAST_WORKSPACE_KEY);
        }
      } else {
        // This is a new user with no workspaces
        setActiveWorkspace(null);
        await AsyncStorage.removeItem(KC_LAST_WORKSPACE_KEY);
      }
    } catch (e) {
      console.error('Failed to load app data:', e);
      // If load fails (e.g., token expired), sign them out
      await signOut(); // Make sure signOut is defined or available here
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const userToken = await loadToken(); 
        if (userToken) {
          setToken(userToken);
          await loadAppData(userToken); 
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const signIn = async () => {
    setLoading(true);
    let rawToken = null;
    try {
      const auth = await authorize(authConfig); 
      rawToken = auth.idToken || auth.accessToken;
      if (!rawToken) throw new Error('No token from IdP');

      setToken(rawToken);
      await saveToken(rawToken); 
      await loadAppData(rawToken); 
      try {
        await registerDeviceKeyWithServer(rawToken);
      } catch {}

    } catch (e) {
      console.error('signIn failed:', e);
      if (rawToken) {
        await revoke(authConfig, { tokenToRevoke: rawToken, sendClientId: true }).catch(() => {});
      }
      await clearToken();
      setToken(null);
      setUser(null);
      setActiveWorkspace(null);
      setEmail(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    setLoading(true);
    try {
      if (token) {
        await loadAppData(token);
      }
    } finally {
      setLoading(false);
    }
  };

  const switchWorkspace = async (workspaceId: string) => {
    if (!user) return;
    const newWorkspace = user.workspaces.find(
      w => w.workspace_id === workspaceId,
    );

    if (newWorkspace) {
      setLoading(true); // Show loading while app data re-fetches
      setActiveWorkspace(newWorkspace);
      await AsyncStorage.setItem(
        KC_LAST_WORKSPACE_KEY,
        newWorkspace.workspace_id,
      );
      // Components will now see the new activeWorkspace and can re-fetch data
      setLoading(false);
    }
  };

  const value = useMemo(
    () => ({
      token,
      user,
      activeWorkspace,
      role: activeWorkspace?.role || null, // V2: Role is derived
      email,
      loading,
      signIn, // V2: Expose single 'signIn'
      signOut,
      switchWorkspace,
      refreshUser,
    }),
    [token, user, activeWorkspace, email, loading],
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
};

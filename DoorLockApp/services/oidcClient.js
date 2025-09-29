// DoorLockApp/services/oidcClient.js
import {
  authorize,
  refresh,
  revoke,
  prefetchConfiguration,
} from 'react-native-app-auth';
import api from './apiService';

let cachedCfg = null;

async function getConfig() {
  if (cachedCfg) return cachedCfg;
  const { data } = await api.get('/auth/mobile-oidc-config');

  
  const apRaw = data.additionalParameters || {};
  const ap = Object.fromEntries(
    Object.entries(apRaw).map(([k, v]) => [k, v == null ? '' : String(v)]),
  );

  ap.prompt = 'login';

  const cfg = {
    issuer: data.issuer,
    clientId: data.clientId,
    redirectUrl: data.redirectUrl || 'com.doorlockapp://callback',
    scopes: data.scopes || ['openid', 'email', 'profile'],
    additionalParameters: ap,
    dangerouslyAllowInsecureHttpRequests: false,
  };
  try {
    await prefetchConfiguration({ issuer: cfg.issuer });
  } catch {}
  cachedCfg = cfg;
  return cfg;
}

export async function warmUp() {
  await getConfig();
}

export async function signIn() {
  const cfg = await getConfig();
  return authorize(cfg); 
}

export async function refreshTokens(refreshToken) {
  const cfg = await getConfig();
  return refresh(cfg, { refreshToken });
}

export async function signOutRemote({ accessToken, refreshToken } = {}) {
  const cfg = await getConfig();
  try {
    if (refreshToken)
      await revoke(cfg, { tokenToRevoke: refreshToken, sendClientId: true });
  } catch {}
  try {
    if (accessToken)
      await revoke(cfg, { tokenToRevoke: accessToken, sendClientId: true });
  } catch {}
}

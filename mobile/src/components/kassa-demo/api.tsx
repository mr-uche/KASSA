import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { fetch as expoFetch } from 'expo/fetch';
import type { File } from 'expo-file-system';

export type KassaScope = {
  businessId: string;
  businessName: string;
  branchId: string;
  branchName: string;
  branchAddress?: string | null;
  myRole?: string;
  myPermissions?: string[];
};
type Account = { id: string; email: string; fullName: string };
type LoginResponse = { user: Account; accessToken: string; refreshToken?: string };
type Business = {
  id: string;
  name: string;
  myPermissions: string[];
  myRole: string;
  branches: { id: string; name: string; address?: string | null; isActive: boolean }[];
};
export type CheckoutSale = {
  id: string;
  reference: string;
  createdAt: string;
  status: string;
  total: string;
  subtotal: string;
  currency: string;
  branchId: string;
  cashier?: string;
  customer?: string;
  items: { id: string; productId: string; name: string; quantity: number; unitPrice: string; lineTotal: string }[];
  payments: { channel: string; status: string; confirmedAt: string | null; provider?: string | null }[];
};
export type CatalogItem = {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  category: string;
  price: string;
  stock: number;
  lowStockThreshold: number;
};

function urlFor(path: string): string {
  // Public API address only. Never put the Paystack secret key in Expo environment variables.
  const address = (process.env.EXPO_PUBLIC_KASSA_API_URL || '').trim().replace(/\/+$/, '');
  if (!/^https:\/\//.test(address) &&
      !/^http:\/\/(localhost|127\.0\.0\.1|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(address)) {
    throw new Error('Set EXPO_PUBLIC_KASSA_API_URL to your backend URL (https://.../api/v1).');
  }
  return address.replace(/\/api\/v1$/, '') + '/api/v1/' + path.replace(/^\//, '');
}

class HttpError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

async function http<T>(path: string, token?: string, body?: unknown, method?: 'GET' | 'POST' | 'PATCH' | 'DELETE', signal?: AbortSignal): Promise<T> {
  const response = await fetch(urlFor(path), {
    method: method ?? (body === undefined ? 'GET' : 'POST'),
    signal,
    headers: {
      Accept: 'application/json',
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const result: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = result && typeof result === 'object' ? result as { message?: string | string[] } : null;
    const message = Array.isArray(error?.message) ? error.message.join(', ') : error?.message;
    throw new HttpError(typeof message === 'string' ? message : 'Request failed (' + response.status + ').', response.status);
  }
  return result as T;
}

export type MerchantBranchDraft = { name: string; address?: string; phone?: string };
export type MerchantStaffDraft = { fullName: string; role: string; phone?: string };

export type MerchantRegistration = {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  businessName: string;
  businessType: string;
  branchName: string;
  registeredName?: string;
  staffCount?: number;
  branches?: MerchantBranchDraft[];
  staff?: MerchantStaffDraft[];
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
};

// The server's existing registration and onboarding endpoints are authoritative.
// Do not send KASSA passwords to any third-party identity provider.
export async function registerMerchantUser(details: MerchantRegistration): Promise<void> {
  await http('auth/register', undefined, {
    fullName: details.fullName.trim(),
    email: details.email.trim().toLowerCase(),
    password: details.password,
    ...(details.phone?.trim() ? { phone: details.phone.trim() } : {}),
  });
}

// Can be retried after a network interruption without creating another account
// or another business for the same owner.
export async function onboardMerchantBusiness(details: MerchantRegistration): Promise<void> {
  const signedIn = await http<LoginResponse>('auth/login', undefined, {
    email: details.email.trim().toLowerCase(), password: details.password, rememberMe: false,
  });
  const existing = await http<Business[]>('businesses/mine', signedIn.accessToken);
  if (existing.length > 0) return;
  await http('businesses/onboarding', signedIn.accessToken, {
    businessName: details.businessName.trim(),
    businessType: details.businessType.trim(),
    ...(details.registeredName?.trim() ? { registeredName: details.registeredName.trim() } : {}),
    ...(details.staffCount !== undefined ? { staffCount: details.staffCount } : {}),
    branches: details.branches?.length ? details.branches.map(branch => ({
      name: branch.name.trim(),
      ...(branch.address?.trim() ? { address: branch.address.trim() } : {}),
      ...(branch.phone?.trim() ? { phone: branch.phone.trim() } : {}),
    })) : [{ name: details.branchName.trim() || 'Main Branch' }],
    ...(details.bankAccountNumber ? {
      settlementBank: details.bankName?.trim(),
      accountNumber: details.bankAccountNumber,
      accountName: details.bankAccountName?.trim(),
    } : {}),
    staff: (details.staff ?? []).filter(member => member.fullName.trim()).map(member => ({
      fullName: member.fullName.trim(),
      role: member.role,
      ...(member.phone?.trim() ? { phone: member.phone.trim() } : {}),
    })),
  });
}

const SESSION_KEY = 'kassa.remembered-session.v1';
export const supportsRememberedLogin = Platform.OS === 'android' || Platform.OS === 'ios';
type RememberedSession = { refreshToken: string; businessId?: string; branchId?: string };
const storageOptions = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
async function loadRememberedSession(): Promise<RememberedSession | null> {
  if (!supportsRememberedLogin) return null;
  const raw = await SecureStore.getItemAsync(SESSION_KEY, storageOptions);
  if (!raw) return null;
  let saved: RememberedSession;
  try { saved = JSON.parse(raw) as RememberedSession; }
  catch { await SecureStore.deleteItemAsync(SESSION_KEY, storageOptions); return null; }
  if (!saved || typeof saved.refreshToken !== 'string' || !saved.refreshToken) {
    await SecureStore.deleteItemAsync(SESSION_KEY, storageOptions);
    return null;
  }
  return saved;
}
async function writeRememberedSession(saved: RememberedSession | null) {
  if (!supportsRememberedLogin) return;
  if (saved) await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(saved), storageOptions);
  else await SecureStore.deleteItemAsync(SESSION_KEY, storageOptions);
}

async function getPermittedScopes(token: string, signal?: AbortSignal): Promise<KassaScope[]> {
  const businesses = await http<Business[]>('businesses/mine', token, undefined, 'GET', signal);
  return businesses
      .filter(b => b.myRole === 'Owner' || b.myPermissions.includes('*') ||
        b.myPermissions.some(permission => [
          'View dashboard', 'Manage sales', 'View transactions', 'Manage sales & transactions',
          'Manage customers', 'Manage products & inventory', 'View reports & analytics',
          'Manage staff & branches', 'Manage business settings', 'View financial overview',
        ].includes(permission)))
      .flatMap(b => b.branches.filter(branch => branch.isActive).map(branch => ({
        businessId: b.id, businessName: b.name, branchId: branch.id, branchName: branch.name,
        branchAddress: branch.address ?? null, myRole: b.myRole, myPermissions: b.myPermissions,
      })));
}
function chooseScope(scopes: KassaScope[], saved: RememberedSession | null): KassaScope | null {
  return scopes.find(item => item.businessId === saved?.businessId && item.branchId === saved?.branchId)
    ?? (scopes.length === 1 ? scopes[0] : null);
}

type Session = {
  restoring: boolean;
  restoreError: string;
  restoreSession(): Promise<KassaScope | null>;
  user: Account | null;
  scope: KassaScope | null;
  scopes: KassaScope[];
  signIn(email: string, password: string, rememberMe?: boolean): Promise<KassaScope[]>;
  selectScope(scope: KassaScope): void;
  signOut(): Promise<void>;
  request<T>(path: string, body?: unknown, method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'): Promise<T>;
  uploadReceipt(path: string, file: File): Promise<void>;
  downloadReceipt(path: string): Promise<Uint8Array>;
};
const SessionContext = createContext<Session | null>(null);

export function KassaSessionProvider({ children }: { children: React.ReactNode }) {
  // Only the opaque refresh token and selected branch IDs are persisted, never passwords or access tokens.
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [user, setUser] = useState<Account | null>(null);
  const [scopes, setScopes] = useState<KassaScope[]>([]);
  const [scope, setScope] = useState<KassaScope | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [restoreError, setRestoreError] = useState('');
  const generation = useRef(0);
  const currentRefresh = useRef<string | null>(null);
  const remembered = useRef<RememberedSession | null>(null);
  const storageQueue = useRef<Promise<void>>(Promise.resolve());
  const refreshInFlight = useRef<{ token: string; promise: Promise<string> } | null>(null);

  // Serialize writes so a branch change cannot re-create a token after logout.
  const persist = useCallback((saved: RememberedSession | null) => {
    remembered.current = saved;
    const operation = storageQueue.current.catch(() => undefined).then(() => writeRememberedSession(saved));
    storageQueue.current = operation;
    return operation;
  }, []);

  const clearMemory = useCallback(() => {
    generation.current += 1;
    currentRefresh.current = null;
    refreshInFlight.current = null;
    setAccessToken(null); setRefreshToken(null); setUser(null); setScopes([]); setScope(null);
  }, []);

  const restoreSession = useCallback(async (): Promise<KassaScope | null> => {
    const attempt = ++generation.current;
    setRestoring(true);
    setRestoreError('');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const saved = await loadRememberedSession();
      if (generation.current !== attempt || !saved) return null;
      remembered.current = saved;
      const refreshed = await http<LoginResponse>('auth/refresh', undefined,
        { refreshToken: saved.refreshToken }, 'POST', controller.signal);
      const permitted = await getPermittedScopes(refreshed.accessToken, controller.signal);
      if (generation.current !== attempt) return null;
      if (!permitted.length) {
        await persist(null);
        setRestoreError('No active branch is assigned to this account. Contact your business owner.');
        return null;
      }
      const selected = chooseScope(permitted, saved);
      currentRefresh.current = saved.refreshToken;
      setAccessToken(refreshed.accessToken);
      setRefreshToken(saved.refreshToken);
      setUser(refreshed.user); setScopes(permitted); setScope(selected);
      return selected;
    } catch (error) {
      if (generation.current !== attempt) return null;
      if (error instanceof HttpError && error.status === 401) {
        try { await persist(null); } catch {
          setRestoreError('Could not clear the expired saved session. Sign in again.');
        }
      } else {
        // Temporary connectivity errors must not erase a valid remembered session.
        setRestoreError('Could not restore your session. Connect to the internet and retry, or sign in again.');
      }
      return null;
    } finally {
      clearTimeout(timer);
      if (generation.current === attempt) setRestoring(false);
    }
  }, [persist]);

  useEffect(() => {
    void Promise.resolve().then(restoreSession);
    return () => { generation.current += 1; };
  }, [restoreSession]);

  const signIn = useCallback(async (email: string, password: string, rememberMe = true) => {
    const attempt = ++generation.current;
    // Keep refresh capability while this app process is open; the checkbox controls device persistence.
    const login = await http<LoginResponse>('auth/login', undefined, {
      email: email.trim().toLowerCase(), password, rememberMe: true,
    });
    const permitted = await getPermittedScopes(login.accessToken);
    if (!permitted.length) throw new Error('No active branch with sales access is assigned to this account.');
    if (generation.current !== attempt) throw new Error('Sign-in was interrupted. Try again.');
    const selected = chooseScope(permitted, null);
    const saved = rememberMe && supportsRememberedLogin && login.refreshToken
      ? { refreshToken: login.refreshToken, businessId: selected?.businessId, branchId: selected?.branchId }
      : null;
    try { await persist(saved); }
    catch {
      // Never silently claim that a login was remembered when device storage failed.
      throw new Error('Unable to update secure login storage. Please try again.');
    }
    if (generation.current !== attempt) throw new Error('Sign-in was interrupted. Try again.');
    currentRefresh.current = login.refreshToken ?? null;
    setAccessToken(login.accessToken);
    setRefreshToken(login.refreshToken ?? null);
    setUser(login.user); setScopes(permitted); setScope(selected);
    setRestoreError(''); setRestoring(false);
    return permitted;
  }, [persist]);

  const selectScope = useCallback((choice: KassaScope) => {
    const allowed = scopes.find(item => item.businessId === choice.businessId && item.branchId === choice.branchId);
    if (!allowed) throw new Error('This branch is not available to your account.');
    setScope(allowed);
    if (remembered.current) {
      void persist({ ...remembered.current, businessId: allowed.businessId, branchId: allowed.branchId })
        .catch(() => Alert.alert('Branch preference', 'This branch could not be remembered on your device.'));
    }
  }, [scopes, persist]);

  const signOut = useCallback(async () => {
    const token = currentRefresh.current ?? remembered.current?.refreshToken;
    clearMemory();
    setRestoreError('');
    const cleared = persist(null).then(() => true, () => false);
    const revoked = token
      ? http('auth/logout', undefined, { refreshToken: token }).then(() => true, () => false)
      : Promise.resolve(false);
    const [localCleared, serverRevoked] = await Promise.all([cleared, revoked]);
    if (!localCleared && !serverRevoked) {
      Alert.alert('Sign-out warning', 'Secure storage could not be cleared and the session could not be revoked. Reconnect and sign out again before sharing this device.');
    }
  }, [clearMemory, persist]);

  const refreshAccess = useCallback(async (token: string): Promise<string> => {
    if (currentRefresh.current !== token) throw new Error('Your session changed. Sign in again.');
    if (refreshInFlight.current?.token === token) return refreshInFlight.current.promise;
    const attempt = generation.current;
    const promise = (async () => {
      try {
        const refreshed = await http<LoginResponse>('auth/refresh', undefined, { refreshToken: token });
        if (generation.current !== attempt || currentRefresh.current !== token)
          throw new Error('Your session changed. Sign in again.');
        setAccessToken(refreshed.accessToken);
        return refreshed.accessToken;
      } catch (error) {
        if (generation.current === attempt && currentRefresh.current === token &&
            error instanceof HttpError && error.status === 401) {
          await signOut();
          router.replace('/login');
          throw new Error('Your session expired. Sign in again.');
        }
        throw error;
      } finally {
        if (refreshInFlight.current?.token === token) refreshInFlight.current = null;
      }
    })();
    refreshInFlight.current = { token, promise };
    return promise;
  }, [signOut]);

  const request = useCallback(async <T,>(path: string, body?: unknown, method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'): Promise<T> => {
    if (!accessToken || (refreshToken && currentRefresh.current !== refreshToken))
      throw new Error('Sign in to make a sale.');
    try {
      return await http<T>(path, accessToken, body, method);
    } catch (error) {
      if (!refreshToken || !(error instanceof HttpError) || error.status !== 401) throw error;
      const renewed = await refreshAccess(refreshToken);
      return http<T>(path, renewed, body, method);
    }
  }, [accessToken, refreshToken, refreshAccess]);

  // Keep expense receipts on the same authenticated backend as merchant data.
  // The Expo fetch implementation handles the File as a multipart Blob.
  const authorizedFileFetch = useCallback(async (
    path: string, makeOptions: (token: string) => RequestInit,
  ) => {
    if (!accessToken || (refreshToken && currentRefresh.current !== refreshToken)) throw new Error('Sign in before accessing receipts.');
    const send = (token: string) => expoFetch(urlFor(path), makeOptions(token));
    let response = await send(accessToken);
    if (response.status === 401 && refreshToken) {
      const renewed = await refreshAccess(refreshToken);
      response = await send(renewed);
    }
    if (!response.ok) {
      const detail = await response.json().catch(() => null) as { message?: string | string[] } | null;
      throw new Error(Array.isArray(detail?.message) ? detail.message.join(', ')
        : detail?.message || 'Receipt request failed (' + response.status + ').');
    }
    return response;
  }, [accessToken, refreshToken, refreshAccess]);

  const uploadReceipt = useCallback(async (path: string, file: File): Promise<void> => {
    const body = new FormData();
    body.append('file', file);
    await authorizedFileFetch(path, token => ({
      method: 'POST', headers: { Authorization: 'Bearer ' + token },
      body,
    }));
  }, [authorizedFileFetch]);

  const downloadReceipt = useCallback(async (path: string): Promise<Uint8Array> => {
    const response = await authorizedFileFetch(path, token => ({
      method: 'GET', headers: { Authorization: 'Bearer ' + token },
    }));
    return response.bytes();
  }, [authorizedFileFetch]);

  return (
    <SessionContext.Provider value={{ user, scope, scopes, restoring, restoreError, restoreSession, signIn, selectScope, signOut, request, uploadReceipt, downloadReceipt }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useKassaSession(): Session {
  const session = useContext(SessionContext);
  if (!session) throw new Error('KassaSessionProvider is missing');
  return session;
}

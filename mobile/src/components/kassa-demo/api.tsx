import React, { createContext, useCallback, useContext, useState } from 'react';
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

async function http<T>(path: string, token?: string, body?: unknown, method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'): Promise<T> {
  const response = await fetch(urlFor(path), {
    method: method ?? (body === undefined ? 'GET' : 'POST'),
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
    throw new Error(typeof message === 'string' ? message : 'Request failed (' + response.status + ').');
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

type Session = {
  user: Account | null;
  scope: KassaScope | null;
  scopes: KassaScope[];
  signIn(email: string, password: string): Promise<KassaScope[]>;
  selectScope(scope: KassaScope): void;
  signOut(): Promise<void>;
  request<T>(path: string, body?: unknown, method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'): Promise<T>;
  uploadReceipt(path: string, file: File): Promise<void>;
  downloadReceipt(path: string): Promise<Uint8Array>;
};
const SessionContext = createContext<Session | null>(null);

export function KassaSessionProvider({ children }: { children: React.ReactNode }) {
  // Tokens remain in memory; they are never written to AsyncStorage or public logs.
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [user, setUser] = useState<Account | null>(null);
  const [scopes, setScopes] = useState<KassaScope[]>([]);
  const [scope, setScope] = useState<KassaScope | null>(null);

  const signIn = useCallback(async (email: string, password: string) => {
    const login = await http<LoginResponse>('auth/login', undefined, {
      email: email.trim().toLowerCase(), password, rememberMe: true,
    });
    const businesses = await http<Business[]>('businesses/mine', login.accessToken);
    const permitted = businesses
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
    if (!permitted.length) throw new Error('No active branch with sales access is assigned to this account.');
    setAccessToken(login.accessToken);
    setRefreshToken(login.refreshToken ?? null);
    setUser(login.user);
    setScopes(permitted);
    setScope(permitted.length === 1 ? permitted[0] : null);
    return permitted;
  }, []);

  const selectScope = useCallback((choice: KassaScope) => {
    if (!scopes.some(item => item.businessId === choice.businessId && item.branchId === choice.branchId)) {
      throw new Error('This branch is not available to your account.');
    }
    setScope(choice);
  }, [scopes]);

  const signOut = useCallback(async () => {
    const token = refreshToken;
    setAccessToken(null); setRefreshToken(null); setUser(null); setScopes([]); setScope(null);
    if (token) await http('auth/logout', undefined, { refreshToken: token }).catch(() => undefined);
  }, [refreshToken]);

  const request = useCallback(async <T,>(path: string, body?: unknown, method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'): Promise<T> => {
    if (!accessToken) throw new Error('Sign in to make a sale.');
    try {
      return await http<T>(path, accessToken, body, method);
    } catch (error) {
      if (!refreshToken || !(error instanceof Error) || !/unauthorized|expired|sign in|401/i.test(error.message)) {
        throw error;
      }
      const refreshed = await http<LoginResponse>('auth/refresh', undefined, { refreshToken });
      setAccessToken(refreshed.accessToken);
      return http<T>(path, refreshed.accessToken, body, method);
    }
  }, [accessToken, refreshToken]);


  // Keep expense receipts on the same authenticated backend as merchant data.
  // The Expo fetch implementation handles the File as a multipart Blob.
  const authorizedFileFetch = useCallback(async (
    path: string, makeOptions: (token: string) => RequestInit,
  ) => {
    if (!accessToken) throw new Error('Sign in before accessing receipts.');
    const send = (token: string) => expoFetch(urlFor(path), makeOptions(token));
    let response = await send(accessToken);
    if (response.status === 401 && refreshToken) {
      const refreshed = await http<LoginResponse>('auth/refresh', undefined, { refreshToken });
      setAccessToken(refreshed.accessToken);
      response = await send(refreshed.accessToken);
    }
    if (!response.ok) {
      const detail = await response.json().catch(() => null) as { message?: string | string[] } | null;
      throw new Error(Array.isArray(detail?.message) ? detail.message.join(', ')
        : detail?.message || 'Receipt request failed (' + response.status + ').');
    }
    return response;
  }, [accessToken, refreshToken]);

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
    <SessionContext.Provider value={{ user, scope, scopes, signIn, selectScope, signOut, request, uploadReceipt, downloadReceipt }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useKassaSession(): Session {
  const session = useContext(SessionContext);
  if (!session) throw new Error('KassaSessionProvider is missing');
  return session;
}

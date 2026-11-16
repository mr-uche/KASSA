import React, { createContext, useCallback, useContext, useState } from 'react';

export type KassaScope = {
  businessId: string;
  businessName: string;
  branchId: string;
  branchName: string;
  branchAddress?: string | null;
  myRole?: string;
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

async function http<T>(path: string, token?: string, body?: unknown): Promise<T> {
  const response = await fetch(urlFor(path), {
    method: body === undefined ? 'GET' : 'POST',
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

type Session = {
  user: Account | null;
  scope: KassaScope | null;
  scopes: KassaScope[];
  signIn(email: string, password: string): Promise<KassaScope[]>;
  selectScope(scope: KassaScope): void;
  signOut(): Promise<void>;
  request<T>(path: string, body?: unknown): Promise<T>;
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
      .filter(b => b.myPermissions.includes('*') || b.myPermissions.includes('Manage sales & transactions'))
      .flatMap(b => b.branches.filter(branch => branch.isActive).map(branch => ({
        businessId: b.id, businessName: b.name, branchId: branch.id, branchName: branch.name,
        branchAddress: branch.address ?? null, myRole: b.myRole,
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

  const request = useCallback(async <T,>(path: string, body?: unknown): Promise<T> => {
    if (!accessToken) throw new Error('Sign in to make a sale.');
    try {
      return await http<T>(path, accessToken, body);
    } catch (error) {
      if (!refreshToken || !(error instanceof Error) || !/unauthorized|expired|sign in|401/i.test(error.message)) {
        throw error;
      }
      const refreshed = await http<LoginResponse>('auth/refresh', undefined, { refreshToken });
      setAccessToken(refreshed.accessToken);
      return http<T>(path, refreshed.accessToken, body);
    }
  }, [accessToken, refreshToken]);

  return (
    <SessionContext.Provider value={{ user, scope, scopes, signIn, selectScope, signOut, request }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useKassaSession(): Session {
  const session = useContext(SessionContext);
  if (!session) throw new Error('KassaSessionProvider is missing');
  return session;
}

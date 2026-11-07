import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react';

import {
  getCurrentUser,
  signIn as apiSignIn,
  signInAdminGate as apiSignInAdminGate,
  signOut as apiSignOut,
  type LoginResult,
  type SessionUser,
} from '@/constants/marketplaceApi';

type AuthContextValue = {
  user: SessionUser | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  signIn: (
    identifier: string,
    password: string,
    rememberMe: boolean,
    mfaCode?: string,
  ) => Promise<LoginResult>;
  signInAdminGate: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setUser(await getCurrentUser());
      setError(null);
    } catch (requestError: unknown) {
      setUser(null);
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Your session could not be checked.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const signIn = useCallback(async (
    identifier: string,
    password: string,
    rememberMe: boolean,
    mfaCode?: string,
  ) => {
    const result = await apiSignIn(identifier, password, rememberMe, mfaCode);
    if (!result.mfaRequired) {
      setUser(result.user);
      setError(null);
    }
    return result;
  }, []);

  const signInAdminGate = useCallback(async (username: string, password: string) => {
    const nextUser = await apiSignInAdminGate(username, password);
    setUser(nextUser);
    setError(null);
  }, []);

  const signOut = useCallback(async () => {
    await apiSignOut();
    setUser(null);
    setError(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, error, refresh, signIn, signInAdminGate, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider.');
  return context;
}

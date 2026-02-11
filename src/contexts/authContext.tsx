import { createContext, useCallback, useEffect, useState } from 'react';
import type { AuthUser } from '@/services/auth';
import {
  getStoredToken,
  getStoredUser,
  setStoredAuth,
  clearStoredAuth,
  login as apiLogin,
  register as apiRegister,
} from '@/services/auth';

interface AuthContextValue {
  isAuthenticated: boolean;
  user: AuthUser | null;
  /** 是否已从 localStorage 恢复过登录态（刷新后先为 false，恢复完成后为 true） */
  authReady: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: AuthUser | null) => void;
}

export const AuthContext = createContext<AuthContextValue>({
  isAuthenticated: false,
  user: null,
  authReady: false,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  setUser: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const token = getStoredToken();
    const storedUser = getStoredUser();
    if (token && storedUser) {
      setUser(storedUser);
    }
    setAuthReady(true);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const data = await apiLogin(username, password);
    setStoredAuth(data.access_token, data.user);
    setUser(data.user);
  }, []);

  const register = useCallback(async (username: string, password: string) => {
    const data = await apiRegister(username, password);
    setStoredAuth(data.access_token, data.user);
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    clearStoredAuth();
    setUser(null);
  }, []);

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        authReady,
        login,
        register,
        logout,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AuthUser } from '../types';
import { fetchCurrentUser, loginRequest, logoutRequest, registerRequest } from '../services/authApi';

const AUTH_STORAGE_KEY = 'quizquest_auth';

interface AuthState {
  token: string;
  user: AuthUser;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const readPersistedAuth = (): AuthState | null => {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthState;
    if (!parsed?.token || !parsed?.user?.id) return null;
    return parsed;
  } catch {
    return null;
  }
};

const persistAuth = (state: AuthState | null) => {
  if (!state) {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state));
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const bootstrapAuth = async () => {
      const persisted = readPersistedAuth();
      if (!persisted) {
        setIsLoading(false);
        return;
      }

      try {
        const currentUser = await fetchCurrentUser(persisted.token);
        setToken(persisted.token);
        setUser(currentUser);
        persistAuth({ token: persisted.token, user: currentUser });
      } catch {
        persistAuth(null);
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const data = await loginRequest(email, password);
    setToken(data.token);
    setUser(data.user);
    persistAuth(data);
  };

  const register = async (name: string, email: string, password: string) => {
    const data = await registerRequest({ name, email, password });
    setToken(data.token);
    setUser(data.user);
    persistAuth(data);
  };

  const logout = async () => {
    if (token) {
      try {
        await logoutRequest(token);
      } catch {
        // local logout still proceeds if server session cleanup fails
      }
    }
    setToken(null);
    setUser(null);
    persistAuth(null);
  };

  const refreshUser = async () => {
    if (!token) return;
    const currentUser = await fetchCurrentUser(token);
    setUser(currentUser);
    persistAuth({ token, user: currentUser });
  };

  const value = useMemo<AuthContextValue>(() => ({
    user,
    token,
    isAuthenticated: Boolean(user && token),
    isLoading,
    login,
    register,
    logout,
    refreshUser,
  }), [user, token, isLoading, login, register, logout, refreshUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

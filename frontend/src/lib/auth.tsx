import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { apiClient, ApiError } from './api-client';
import type { AuthConfig, AuthUser } from '../types/auth';

type AuthState =
  | { status: 'loading'; user: null; config: AuthConfig | null }
  | { status: 'authenticated'; user: AuthUser; config: AuthConfig }
  | { status: 'unauthenticated'; user: null; config: AuthConfig };

type AuthContextValue = AuthState & {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading', user: null, config: null });

  useEffect(() => {
    let active = true;
    async function bootstrap() {
      try {
        const [config, me] = await Promise.all([
          apiClient<AuthConfig>('/auth/config'),
          apiClient<{ user: AuthUser }>('/auth/me').catch((error: unknown) => {
            if (error instanceof ApiError && error.status === 401) {
              return null;
            }
            throw error;
          }),
        ]);
        if (!active) return;
        if (me) {
          setState({ status: 'authenticated', user: me.user, config });
        } else {
          setState({ status: 'unauthenticated', user: null, config });
        }
      } catch {
        if (!active) return;
        setState({
          status: 'unauthenticated',
          user: null,
          config: { demo: false, demoEmail: null },
        });
      }
    }
    void bootstrap();
    return () => {
      active = false;
    };
  }, []);

  async function login(email: string, password: string) {
    const { user } = await apiClient<{ user: AuthUser }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    setState((prev) => ({ status: 'authenticated', user, config: prev.config ?? { demo: false, demoEmail: null } }));
  }

  async function register(email: string, password: string, name?: string) {
    const { user } = await apiClient<{ user: AuthUser }>('/auth/register', {
      method: 'POST',
      body: { email, password, name },
    });
    setState((prev) => ({ status: 'authenticated', user, config: prev.config ?? { demo: false, demoEmail: null } }));
  }

  async function logout() {
    try {
      await apiClient('/auth/logout', { method: 'POST' });
    } finally {
      setState((prev) => ({ status: 'unauthenticated', user: null, config: prev.config ?? { demo: false, demoEmail: null } }));
    }
  }

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  apiClient,
  ApiError,
  resetSessionRequests,
  SESSION_EXPIRED_EVENT,
} from "./api-client";
import { createQueryClient } from "./query-client";
import type { AuthConfig, AuthUser } from "../types/auth";

type AuthState =
  | { status: "loading"; user: null; config: AuthConfig | null }
  | { status: "authenticated"; user: AuthUser; config: AuthConfig }
  | { status: "unauthenticated"; user: null; config: AuthConfig };

type AuthContextValue = AuthState & {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [cache, setCache] = useState(() => ({
    client: createQueryClient(),
    generation: 0,
  }));
  const currentClient = useRef(cache.client);
  const authAttempt = useRef(0);
  const [state, setState] = useState<AuthState>({
    status: "loading",
    user: null,
    config: null,
  });

  const replaceCache = useCallback(() => {
    resetSessionRequests();
    currentClient.current.clear();
    const client = createQueryClient();
    currentClient.current = client;
    setCache((previous) => ({ client, generation: previous.generation + 1 }));
  }, []);

  useEffect(() => {
    const expire = () => {
      authAttempt.current += 1;
      replaceCache();
      setState((prev) => ({
        status: "unauthenticated",
        user: null,
        config: prev.config ?? { demo: false, demoEmail: null },
      }));
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, expire);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, expire);
  }, [replaceCache]);

  useEffect(() => {
    let active = true;
    const attempt = authAttempt.current;
    async function bootstrap() {
      try {
        const [config, me] = await Promise.all([
          apiClient<AuthConfig>("/auth/config"),
          apiClient<{ user: AuthUser }>("/auth/me").catch((error: unknown) => {
            if (error instanceof ApiError && error.status === 401) {
              return null;
            }
            throw error;
          }),
        ]);
        if (!active || attempt !== authAttempt.current) return;
        if (me) {
          setState({ status: "authenticated", user: me.user, config });
        } else {
          setState({ status: "unauthenticated", user: null, config });
        }
      } catch {
        if (!active || attempt !== authAttempt.current) return;
        setState({
          status: "unauthenticated",
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
    const attempt = ++authAttempt.current;
    const { user } = await apiClient<{ user: AuthUser }>("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    if (attempt !== authAttempt.current) return;
    replaceCache();
    setState((prev) => ({
      status: "authenticated",
      user,
      config: prev.config ?? { demo: false, demoEmail: null },
    }));
  }

  async function register(email: string, password: string, name?: string) {
    const attempt = ++authAttempt.current;
    const { user } = await apiClient<{ user: AuthUser }>("/auth/register", {
      method: "POST",
      body: { email, password, name },
    });
    if (attempt !== authAttempt.current) return;
    replaceCache();
    setState((prev) => ({
      status: "authenticated",
      user,
      config: prev.config ?? { demo: false, demoEmail: null },
    }));
  }

  async function logout() {
    const attempt = ++authAttempt.current;
    replaceCache();
    setState((prev) => ({
      status: "loading",
      user: null,
      config: prev.config,
    }));
    try {
      await apiClient("/auth/logout", { method: "POST" });
    } finally {
      if (attempt === authAttempt.current) {
        setState((prev) => ({
          status: "unauthenticated",
          user: null,
          config: prev.config ?? { demo: false, demoEmail: null },
        }));
      }
    }
  }

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {/* A new provider also detaches old mutation observers/callbacks. */}
      <QueryClientProvider key={cache.generation} client={cache.client}>
        {children}
      </QueryClientProvider>
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}

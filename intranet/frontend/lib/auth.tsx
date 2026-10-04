"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, tokenStore } from "./api";

export interface Me {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: number | null;
  role_detail: { slug: string; name: string } | null;
  department: number | null;
  is_super_admin: boolean;
  preferred_language: string;
  timezone: string;
  emergency_contact: string;
  bank_account: string;
  is_2fa_enabled: boolean;
  permissions: string[];
  avatar: string | null;
  job_title: string;
  bio: string;
  phone: string;
  secondary_email: string;
  linkedin_url: string;
  twitter_url: string;
  facebook_url: string;
  website_url: string;
  whatsapp: string;
}

interface AuthState {
  me: Me | null;
  loading: boolean;
  login: (email: string, password: string, totp?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
  can: (perm: string) => boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshMe = useCallback(async () => {
    if (!tokenStore.access) {
      setMe(null);
      setLoading(false);
      return;
    }
    try {
      setMe(await api<Me>("/auth/me/"));
    } catch {
      setMe(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  const login = useCallback(
    async (email: string, password: string, totp?: string) => {
      const data = await api<{ access: string; refresh: string; user: Me }>("/auth/login/", {
        method: "POST",
        auth: false,
        body: { email, password, totp_code: totp || "" },
      });
      tokenStore.set(data.access, data.refresh);
      setMe(data.user);
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await api("/auth/logout/", { method: "POST", body: { refresh: tokenStore.refresh } });
    } catch {
      /* ignore */
    }
    tokenStore.clear();
    setMe(null);
  }, []);

  const can = useCallback(
    (perm: string) => !!me && (me.is_super_admin || me.permissions.includes(perm)),
    [me],
  );

  const value = useMemo(
    () => ({ me, loading, login, logout, refreshMe, can }),
    [me, loading, login, logout, refreshMe, can],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans <AuthProvider>");
  return ctx;
}

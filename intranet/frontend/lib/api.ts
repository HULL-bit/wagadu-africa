// Client API centralisé : injection du jeton, rafraîchissement automatique,
// file d'attente hors-ligne minimale (mutations rejouées à la reconnexion).

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "/api/v1";

const ACCESS_KEY = "wh_access";
const REFRESH_KEY = "wh_refresh";

export const tokenStore = {
  get access() {
    return typeof window === "undefined" ? null : localStorage.getItem(ACCESS_KEY);
  },
  get refresh() {
    return typeof window === "undefined" ? null : localStorage.getItem(REFRESH_KEY);
  },
  set(access: string, refresh?: string) {
    localStorage.setItem(ACCESS_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

function humanizeApiError(status: number, data: unknown): string {
  if (typeof data === "string" && data.trim()) return data.slice(0, 300);
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    if (typeof d.detail === "string") return d.detail;
    const parts: string[] = [];
    for (const [key, val] of Object.entries(d)) {
      const text = Array.isArray(val) ? val.filter(Boolean).join(" ") : String(val);
      if (!text) continue;
      parts.push(key === "non_field_errors" ? text : `${key} : ${text}`);
    }
    if (parts.length) return parts.join(" · ");
  }
  return `Erreur ${status}`;
}

export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(status: number, data: unknown) {
    super(humanizeApiError(status, data));
    this.status = status;
    this.data = data;
  }
}

async function refreshAccess(): Promise<boolean> {
  const refresh = tokenStore.refresh;
  if (!refresh) return false;
  const res = await fetch(`${BASE}/auth/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });
  if (!res.ok) return false;
  const data = await res.json();
  tokenStore.set(data.access, data.refresh);
  return true;
}

export interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  auth?: boolean;
  retry?: boolean;
}

export async function api<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { body, auth = true, retry = true, headers, ...rest } = opts;
  const finalHeaders = new Headers(headers);
  if (body !== undefined && !(body instanceof FormData)) {
    finalHeaders.set("Content-Type", "application/json");
  }
  if (auth && tokenStore.access) {
    finalHeaders.set("Authorization", `Bearer ${tokenStore.access}`);
  }

  const res = await fetch(`${BASE}${path}`, {
    ...rest,
    headers: finalHeaders,
    body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
  });

  if (res.status === 401 && auth && retry) {
    if (await refreshAccess()) {
      return api<T>(path, { ...opts, retry: false });
    }
    tokenStore.clear();
  }

  if (res.status === 204 || res.status === 205) return undefined as T;

  const data = res.headers.get("content-type")?.includes("application/json")
    ? await res.json()
    : await res.text();

  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}

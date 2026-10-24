export type Tokens = { accessToken: string; refreshToken: string };

const KEY = 'suwayomi-auth';
const listeners = new Set<() => void>();

function storage(persistent: boolean): Storage | null {
  try {
    return persistent ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

function load(persistent: boolean): Tokens | null {
  try {
    const raw = storage(persistent)?.getItem(KEY);
    return raw ? (JSON.parse(raw) as Tokens) : null;
  } catch {
    return null;
  }
}

let current: Tokens | null = load(true);
let persistent = true;
if (!current) {
  current = load(false);
  persistent = current === null;
}

export function getTokens(): Tokens | null {
  return current;
}

export function getAccessToken(): string | null {
  return current?.accessToken ?? null;
}

const IMAGE_COOKIE = 'suwayomi-server-token';

function writeImageCookie(token: string | null): void {
  if (token) {
    document.cookie = `${IMAGE_COOKIE}=${token}; path=/; SameSite=Lax`;
  } else {
    document.cookie = `${IMAGE_COOKIE}=; path=/; Max-Age=0; SameSite=Lax`;
  }
}

export function setTokens(tokens: Tokens | null, remember = persistent): void {
  current = tokens;
  persistent = remember;
  try {
    storage(true)?.removeItem(KEY);
    storage(false)?.removeItem(KEY);
    if (tokens) storage(remember)?.setItem(KEY, JSON.stringify(tokens));
  } catch {
  }
  writeImageCookie(tokens?.accessToken ?? null);
  listeners.forEach((l) => l());
}

if (current?.accessToken) writeImageCookie(current.accessToken);

export function clearTokens(): void {
  setTokens(null);
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isAccessTokenExpired(skewSeconds = 15): boolean {
  const token = getAccessToken();
  if (!token) return false;
  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const { exp } = JSON.parse(json) as { exp?: number };
    if (typeof exp !== 'number') return false;
    return Date.now() / 1000 >= exp - skewSeconds;
  } catch {
    return false;
  }
}

/**
 * unlockStorage.ts
 * AEO Citation Layer: local storage for the entitlement unlock token.
 *
 * This token is Canopy Guard's own paid-access credential, not a provider
 * API key, so localStorage is the right place for it (same as any other
 * "you already paid, stay unlocked" token). Provider keys never touch this
 * file or anywhere else in the app's persistent storage — see providers.ts.
 */

const KEY_PREFIX = 'cg_citation_unlock_';

export interface StoredUnlock {
  token: string;
  plan: 'one-time' | 'subscription';
}

export function getStoredUnlock(domain: string): StoredUnlock | null {
  try {
    const raw = localStorage.getItem(`${KEY_PREFIX}${domain}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return typeof parsed?.token === 'string' ? (parsed as StoredUnlock) : null;
  } catch {
    return null;
  }
}

export function setStoredUnlock(domain: string, value: StoredUnlock): void {
  try {
    localStorage.setItem(`${KEY_PREFIX}${domain}`, JSON.stringify(value));
  } catch {
    // Storage unavailable (private browsing, quota) — degrades to locked.
  }
}

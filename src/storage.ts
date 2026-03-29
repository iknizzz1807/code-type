// Storage utilities

const STORAGE_KEYS = {
  profile: 'codetype-profile',
  snippets: 'codetype-snippets',
  history: 'codetype-history',
} as const;

interface StorageValue {
  value: string;
}

declare global {
  interface Window {
    storage?: {
      get: (key: string) => Promise<StorageValue | null>;
      set: (key: string, value: string) => Promise<void>;
    };
  }
}

export const safeGet = async <T>(key: string): Promise<T | null> => {
  try {
    if (window.storage) {
      const r = await window.storage.get(key);
      return r ? JSON.parse(r.value) : null;
    }
    // Fallback to localStorage
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch {
    return null;
  }
};

export const safeSet = async <T>(key: string, val: T): Promise<void> => {
  try {
    if (window.storage) {
      await window.storage.set(key, JSON.stringify(val));
    } else {
      // Fallback to localStorage
      localStorage.setItem(key, JSON.stringify(val));
    }
  } catch {
    // Silent fail
  }
};

export { STORAGE_KEYS };

export const globalInMemoryCache: Record<string, string> = {};

export const safeSessionStorage = {
  getItem: (key: string): string | null => {
    try {
      return typeof window !== 'undefined' && window.sessionStorage ? window.sessionStorage.getItem(key) : null;
    } catch (e) {
      console.warn("SessionStorage access denied. Falling back to in-memory state store.", e);
      return globalInMemoryCache[key] || null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.setItem(key, value);
      }
    } catch (e) {
      console.warn("SessionStorage write denied. Caching in-memory volatile store.", e);
      globalInMemoryCache[key] = value;
    }
  }
};

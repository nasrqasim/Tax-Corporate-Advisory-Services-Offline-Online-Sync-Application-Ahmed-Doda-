/**
 * Safe Persistent Storage Abstraction
 * Supports browser localStorage, Electron, Android WebView, and Node.js testing environment.
 */

class SafeStorage {
  private memStorage = new Map<string, string>();

  public getItem(key: string): string | null {
    if (typeof localStorage !== 'undefined') {
      try {
        return localStorage.getItem(key);
      } catch {
        // Fallback to memory
      }
    }
    return this.memStorage.get(key) || null;
  }

  public setItem(key: string, value: string): void {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(key, value);
      } catch {
        // Fallback to memory
      }
    }
    this.memStorage.set(key, value);
  }

  public removeItem(key: string): void {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(key);
      } catch {
        // Fallback to memory
      }
    }
    this.memStorage.delete(key);
  }

  public clear(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.clear();
      } catch {
        // Fallback to memory
      }
    }
    this.memStorage.clear();
  }
}

export const safeStorage = new SafeStorage();

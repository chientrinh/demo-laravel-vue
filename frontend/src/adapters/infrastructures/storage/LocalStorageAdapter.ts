import type { IStorage } from "../interfaces/IStorage";

export class LocalStorageAdapter implements IStorage {
  get(key: string): string | null {
    try {
      if (typeof window === "undefined") return null;
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  set(key: string, value: string): void {
    try {
      if (typeof window === "undefined") return;
      window.localStorage.setItem(key, value);
    } catch {
      /* localStorage unavailable (private mode) — value not persisted */
    }
  }

  remove(key: string): void {
    try {
      if (typeof window === "undefined") return;
      window.localStorage.removeItem(key);
    } catch {
      /* localStorage unavailable (private mode) — nothing to remove */
    }
  }
}

export const storage: IStorage = new LocalStorageAdapter();
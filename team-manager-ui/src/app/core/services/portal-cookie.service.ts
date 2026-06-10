import { Injectable, signal } from '@angular/core';

export interface PortalCookieEntry {
  id: string;
  name: string;
  keyName: string;
}

const CONFIG_STORAGE_KEY = 'portalCookieConfig';
const DEFAULT_KEY_NAME = 'portalCookie';

@Injectable({ providedIn: 'root' })
export class PortalCookieService {
  private _entries = signal<PortalCookieEntry[]>(this._loadEntries());

  get entries() { return this._entries.asReadonly(); }

  getAll(): PortalCookieEntry[] {
    return this._entries();
  }

  add(name: string, keyName: string): PortalCookieEntry {
    const entry: PortalCookieEntry = { id: crypto.randomUUID(), name: name.trim(), keyName: keyName.trim() };
    const updated = [...this._entries(), entry];
    this._save(updated);
    return entry;
  }

  update(id: string, name: string, keyName: string) {
    const updated = this._entries().map(e =>
      e.id === id ? { ...e, name: name.trim(), keyName: keyName.trim() } : e
    );
    this._save(updated);
  }

  remove(id: string) {
    const updated = this._entries().filter(e => e.id !== id);
    this._save(updated);
    const entry = this._entries().find(e => e.id === id);
    if (entry) localStorage.removeItem(entry.keyName);
  }

  getValueFor(entry: PortalCookieEntry): string {
    return localStorage.getItem(entry.keyName) ?? '';
  }

  setValueFor(entry: PortalCookieEntry, value: string) {
    localStorage.setItem(entry.keyName, value);
    localStorage.setItem(`portalCookieUpdatedAt_${entry.id}`, new Date().toISOString());
    this._entries.set([...this._entries()]);
  }

  clearEntry(entry: PortalCookieEntry) {
    localStorage.removeItem(entry.keyName);
    this._entries.set([...this._entries()]);
  }

  getUpdatedAtFor(entry: PortalCookieEntry): string | null {
    return localStorage.getItem(`portalCookieUpdatedAt_${entry.id}`) ?? null;
  }

  /** Backward-compat: returns value of the first entry (used by sync components) */
  getValue(): string {
    const first = this._entries()[0];
    return first ? (localStorage.getItem(first.keyName) ?? '') : '';
  }

  /** Backward-compat: sets value on first entry */
  setValue(value: string) {
    const entries = this._entries();
    if (!entries.length) {
      const entry = this.add('Default', DEFAULT_KEY_NAME);
      localStorage.setItem(entry.keyName, value);
      localStorage.setItem(`portalCookieUpdatedAt_${entry.id}`, new Date().toISOString());
    } else {
      this.setValueFor(entries[0], value);
    }
  }

  /** Force signal refresh (e.g. after external localStorage write) */
  refresh() {
    this._entries.set([...this._entries()]);
  }

  /** Backward-compat: clears first entry */
  clear() {
    const first = this._entries()[0];
    if (first) this.clearEntry(first);
  }

  /** Backward-compat: returns updated-at for first entry, also checks legacy keys */
  getUpdatedAt(): string | null {
    const first = this._entries()[0];
    if (first) {
      return this.getUpdatedAtFor(first)
        ?? localStorage.getItem('portalCookieUpdatedAt')
        ?? localStorage.getItem('updatedAt');
    }
    return localStorage.getItem('portalCookieUpdatedAt') ?? localStorage.getItem('updatedAt');
  }

  private _loadEntries(): PortalCookieEntry[] {
    try {
      const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (!raw) return [{ id: crypto.randomUUID(), name: 'Default', keyName: DEFAULT_KEY_NAME }];
      const parsed = JSON.parse(raw);
      // Migrate old single-entry format: { keyName: string }
      if (!Array.isArray(parsed) && parsed.keyName) {
        const migrated: PortalCookieEntry[] = [{ id: crypto.randomUUID(), name: 'Default', keyName: parsed.keyName }];
        localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(migrated));
        return migrated;
      }
      return Array.isArray(parsed) ? parsed : [{ id: crypto.randomUUID(), name: 'Default', keyName: DEFAULT_KEY_NAME }];
    } catch {
      return [{ id: crypto.randomUUID(), name: 'Default', keyName: DEFAULT_KEY_NAME }];
    }
  }

  private _save(entries: PortalCookieEntry[]) {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(entries));
    this._entries.set(entries);
  }
}

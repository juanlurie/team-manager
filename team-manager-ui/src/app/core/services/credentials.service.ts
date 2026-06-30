import { Injectable, signal } from '@angular/core';

export interface CredentialEntry {
  id: string;
  name: string;
  keyName: string;
}

const CONFIG_STORAGE_KEY = 'credentialsConfig';
const DEFAULT_KEY_NAME = 'portalCookie';

@Injectable({ providedIn: 'root' })
export class CredentialsService {
  private _entries = signal<CredentialEntry[]>(this._loadEntries());

  get entries() { return this._entries.asReadonly(); }

  getAll(): CredentialEntry[] {
    return this._entries();
  }

  add(name: string, keyName: string): CredentialEntry {
    const entry: CredentialEntry = { id: crypto.randomUUID(), name: name.trim(), keyName: keyName.trim() };
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
    const entry = this._entries().find(e => e.id === id);
    const updated = this._entries().filter(e => e.id !== id);
    this._save(updated);
    if (entry) localStorage.removeItem(entry.keyName);
  }

  getValueFor(entry: CredentialEntry): string {
    return localStorage.getItem(entry.keyName) ?? '';
  }

  setValueFor(entry: CredentialEntry, value: string) {
    localStorage.setItem(entry.keyName, value);
    localStorage.setItem(`credentialUpdatedAt_${entry.id}`, new Date().toISOString());
    this._entries.set([...this._entries()]);
  }

  clearEntry(entry: CredentialEntry) {
    localStorage.removeItem(entry.keyName);
    this._entries.set([...this._entries()]);
  }

  getUpdatedAtFor(entry: CredentialEntry): string | null {
    return localStorage.getItem(`credentialUpdatedAt_${entry.id}`)
      ?? localStorage.getItem(`portalCookieUpdatedAt_${entry.id}`) // migrate old key
      ?? null;
  }

  /** Backward-compat: returns value of the first entry */
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
      localStorage.setItem(`credentialUpdatedAt_${entry.id}`, new Date().toISOString());
    } else {
      this.setValueFor(entries[0], value);
    }
  }

  /** Force signal refresh */
  refresh() {
    this._entries.set([...this._entries()]);
  }

  /** Backward-compat: clears first entry */
  clear() {
    const first = this._entries()[0];
    if (first) this.clearEntry(first);
  }

  /** Backward-compat: updated-at for first entry */
  getUpdatedAt(): string | null {
    const first = this._entries()[0];
    if (first) {
      return this.getUpdatedAtFor(first)
        ?? localStorage.getItem('portalCookieUpdatedAt')
        ?? localStorage.getItem('updatedAt');
    }
    return localStorage.getItem('portalCookieUpdatedAt') ?? localStorage.getItem('updatedAt');
  }

  private _loadEntries(): CredentialEntry[] {
    try {
      // Migrate from old key name
      const oldRaw = localStorage.getItem('portalCookieConfig');
      const raw = localStorage.getItem(CONFIG_STORAGE_KEY) ?? oldRaw;

      if (!raw) return [{ id: crypto.randomUUID(), name: 'Default', keyName: DEFAULT_KEY_NAME }];

      const parsed = JSON.parse(raw);

      let entries: CredentialEntry[];
      // Migrate old single-entry format: { keyName: string }
      if (!Array.isArray(parsed) && parsed.keyName) {
        entries = [{ id: crypto.randomUUID(), name: 'Default', keyName: parsed.keyName }];
      } else {
        entries = Array.isArray(parsed) ? parsed : [{ id: crypto.randomUUID(), name: 'Default', keyName: DEFAULT_KEY_NAME }];
      }

      // Write under new key and remove old
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(entries));
      if (oldRaw) localStorage.removeItem('portalCookieConfig');

      return entries;
    } catch {
      return [{ id: crypto.randomUUID(), name: 'Default', keyName: DEFAULT_KEY_NAME }];
    }
  }

  private _save(entries: CredentialEntry[]) {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(entries));
    this._entries.set(entries);
  }
}

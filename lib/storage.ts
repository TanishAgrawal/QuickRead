import { browser } from 'wxt/browser';
import { normalizePreferences, type Preferences } from './preferences';

// Separate keys let dragging and speed changes save without overwriting other settings.
export async function loadPreferences(): Promise<Preferences> {
  return normalizePreferences(await browser.storage.local.get(null));
}

export async function savePreferences(patch: Partial<Preferences>): Promise<void> {
  await browser.storage.local.set(patch);
}

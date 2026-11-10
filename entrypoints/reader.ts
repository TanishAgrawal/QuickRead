import type { ReaderController } from '../lib/reader';
import { readSelection } from '../lib/selection';
import { loadPreferences } from '../lib/storage';

type ReaderWindow = Window & { __quickreadReader?: ReaderController };

export default defineUnlistedScript(async () => {
  // Snapshot before awaiting storage, mounting UI, or moving focus.
  const text = readSelection();
  const target = window as ReaderWindow;
  let reader = target.__quickreadReader;
  if (reader && !reader.isValid()) {
    reader.close();
    reader = undefined;
  }
  if (!reader) {
    const preferences = await loadPreferences();
    // Another activation may have completed while storage was loading.
    reader = target.__quickreadReader;
    if (!reader) {
      const { createReader } = await import('../lib/reader');
      reader = target.__quickreadReader ?? createReader(preferences, () => { delete target.__quickreadReader; });
      target.__quickreadReader = reader;
    }
  }
  reader.load(text);
  return { status: text.trim() ? 'ready' : 'empty' };
});

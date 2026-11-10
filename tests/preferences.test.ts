import { describe, expect, it } from 'vitest';
import { bindingFromEvent, defaultPreferences, normalizePreferences } from '../lib/preferences';

describe('preferences recovery', () => {
  it('recovers from absent, malformed, or non-finite stored preferences', () => {
    expect(normalizePreferences(null)).toEqual(defaultPreferences);
    expect(normalizePreferences({ wpm: NaN, jumpWords: 'bad', position: { x: Infinity, y: 5 } })).toEqual(defaultPreferences);
  });

  it('bounds numbers and rejects duplicate shortcut assignments', () => {
    const preferences = normalizePreferences({
      wpm: 0, jumpWords: 10000, sentencePauseMs: -100,
      bindings: { pause: 'Space', close: 'Space', backward: 'ArrowLeft', forward: 'ArrowRight' },
    });
    expect(preferences).toMatchObject({ wpm: 60, jumpWords: 100, sentencePauseMs: 0, bindings: defaultPreferences.bindings });
  });

  it('accepts distinct custom bindings and ignores modifier-only/Tab/IME input', () => {
    expect(bindingFromEvent(new KeyboardEvent('keydown', { code: 'KeyP', ctrlKey: true, shiftKey: true }))).toBe('Control+Shift+KeyP');
    expect(bindingFromEvent(new KeyboardEvent('keydown', { code: 'ShiftLeft', shiftKey: true }))).toBeNull();
    expect(bindingFromEvent(new KeyboardEvent('keydown', { code: 'Tab' }))).toBeNull();
    expect(bindingFromEvent(new KeyboardEvent('keydown', { code: 'KeyP', isComposing: true }))).toBeNull();
    const bindings = { pause: 'KeyP', backward: 'KeyB', forward: 'KeyF', close: 'Escape' };
    expect(normalizePreferences({ bindings }).bindings).toEqual(bindings);
  });
});

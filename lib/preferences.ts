export interface KeyBindings {
  pause: string;
  backward: string;
  forward: string;
  close: string;
}

export interface Preferences {
  wpm: number;
  minorPauseMs: number;
  sentencePauseMs: number;
  paragraphPauseMs: number;
  jumpWords: number;
  bindings: KeyBindings;
  position: { x: number; y: number } | null;
}

export const defaultPreferences: Preferences = {
  wpm: 300,
  minorPauseMs: 100,
  sentencePauseMs: 250,
  paragraphPauseMs: 400,
  jumpWords: 5,
  bindings: {
    pause: 'Space',
    backward: 'ArrowLeft',
    forward: 'ArrowRight',
    close: 'Escape',
  },
  position: null,
};

const bindingPattern = /^(Control\+)?(Alt\+)?(Shift\+)?(Meta\+)?(Space|Escape|ArrowLeft|ArrowRight|ArrowUp|ArrowDown|Key[A-Z]|Digit[0-9]|Home|End|PageUp|PageDown|Backspace|Delete|Enter|Comma|Period|Slash|Semicolon|Quote|BracketLeft|BracketRight|Backslash|Minus|Equal|Backquote|F[1-9]|F1[0-2])$/;

function numberInRange(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, Math.round(value)))
    : fallback;
}

export function normalizePreferences(value: unknown): Preferences {
  const saved = (value && typeof value === 'object' ? value : {}) as Partial<Preferences>;
  const bindings = saved.bindings;
  const keys = bindings && ['pause', 'backward', 'forward', 'close'].map(
    (action) => bindings[action as keyof KeyBindings],
  );
  const validBindings = keys && keys.every((key) => typeof key === 'string' && bindingPattern.test(key))
    && new Set(keys).size === 4;
  const position = saved.position;
  return {
    wpm: numberInRange(saved.wpm, 300, 60, 1200),
    minorPauseMs: numberInRange(saved.minorPauseMs, 100, 0, 2000),
    sentencePauseMs: numberInRange(saved.sentencePauseMs, 250, 0, 2000),
    paragraphPauseMs: numberInRange(saved.paragraphPauseMs, 400, 0, 2000),
    jumpWords: numberInRange(saved.jumpWords, 5, 1, 100),
    bindings: { ...(validBindings ? bindings : defaultPreferences.bindings) } as KeyBindings,
    position: position && Number.isFinite(position.x) && Number.isFinite(position.y)
      ? { x: position.x, y: position.y }
      : null,
  };
}

export function bindingFromEvent(event: KeyboardEvent): string | null {
  if (event.isComposing || event.code === 'Tab') return null;
  const binding = [
    event.ctrlKey && 'Control',
    event.altKey && 'Alt',
    event.shiftKey && 'Shift',
    event.metaKey && 'Meta',
    event.code,
  ].filter(Boolean).join('+');
  return bindingPattern.test(binding) ? binding : null;
}

export function bindingLabel(binding: string): string {
  return binding.replace('Control', 'Ctrl').replace(/Key(?=[A-Z])/g, '')
    .replace(/Digit(?=\d)/g, '').replace('ArrowLeft', '←').replace('ArrowRight', '→')
    .replace('ArrowUp', '↑').replace('ArrowDown', '↓');
}

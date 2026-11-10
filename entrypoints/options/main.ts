import { browser } from 'wxt/browser';
import { bindingFromEvent, bindingLabel, defaultPreferences, normalizePreferences, type KeyBindings, type Preferences } from '../../lib/preferences';
import { loadPreferences, savePreferences } from '../../lib/storage';

const form = document.querySelector<HTMLFormElement>('#settings')!;
const status = document.querySelector<HTMLParagraphElement>('#save-status')!;
const save = document.querySelector<HTMLButtonElement>('#save')!;
const bindingActions: (keyof KeyBindings)[] = ['pause', 'close', 'backward', 'forward'];
const numericFields = ['wpm', 'jumpWords', 'minorPauseMs', 'sentencePauseMs', 'paragraphPauseMs'] as const;
let bindings = { ...defaultPreferences.bindings };

function field(name: string): HTMLInputElement {
  return form.elements.namedItem(name) as HTMLInputElement;
}

function populate(preferences: Preferences): void {
  for (const key of numericFields) field(key).value = String(preferences[key]);
  bindings = { ...preferences.bindings };
  for (const action of bindingActions) field(action).value = bindingLabel(bindings[action]);
}

for (const action of bindingActions) {
  field(action).addEventListener('keydown', (event) => {
    if (event.code === 'Tab') return;
    event.preventDefault();
    const binding = bindingFromEvent(event);
    if (!binding) return;
    bindings[action] = binding;
    field(action).value = bindingLabel(binding);
    status.textContent = 'Shortcut changed. Save to apply it.';
  });
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  if (new Set(Object.values(bindings)).size !== bindingActions.length) {
    status.textContent = 'Choose a different shortcut for each action.';
    return;
  }
  const settings = normalizePreferences({
    ...Object.fromEntries(numericFields.map((key) => [key, Number(field(key).value)])),
    bindings,
  });
  save.disabled = true;
  try {
    await savePreferences({
      wpm: settings.wpm,
      jumpWords: settings.jumpWords,
      minorPauseMs: settings.minorPauseMs,
      sentencePauseMs: settings.sentencePauseMs,
      paragraphPauseMs: settings.paragraphPauseMs,
      bindings: settings.bindings,
    });
    populate(settings);
    status.textContent = 'Saved. Your preferences also apply to open readers.';
  } catch {
    status.textContent = 'Could not save preferences. Reload the extension and try again.';
  } finally {
    save.disabled = false;
  }
});

document.querySelector('#defaults')!.addEventListener('click', () => {
  populate(defaultPreferences);
  status.textContent = 'Defaults restored in the form. Save to apply them.';
});

document.querySelector('#shortcuts')!.addEventListener('click', () => {
  void browser.tabs.create({ url: 'chrome://extensions/shortcuts' }).catch(() => {
    status.textContent = 'Open chrome://extensions/shortcuts to change activation.';
  });
});

void loadPreferences().then((preferences) => {
  populate(preferences);
  save.disabled = false;
}).catch(() => {
  populate(defaultPreferences);
  status.textContent = 'Could not load saved preferences. Reload the extension before saving.';
});

void browser.commands.getAll().then((commands) => {
  const shortcut = commands.find((command) => command.name === '_execute_action')?.shortcut;
  document.querySelector('#activation-key')!.textContent = shortcut || 'Unassigned — choose one in Chrome';
}).catch(() => {
  document.querySelector('#activation-key')!.textContent = 'Check Chrome shortcut settings';
});

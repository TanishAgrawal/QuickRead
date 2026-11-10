import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    name: 'QuickRead',
    description: 'Read highlighted webpage text word by word. Your reading stays on this device.',
    permissions: ['activeTab', 'scripting', 'storage'],
    icons: {
      16: 'icons/icon-16.png',
      32: 'icons/icon-32.png',
      48: 'icons/icon-48.png',
      128: 'icons/icon-128.png',
    },
    action: {
      default_title: 'QuickRead · Read selected text',
      default_icon: {
        16: 'icons/icon-16.png',
        32: 'icons/icon-32.png',
        48: 'icons/icon-48.png',
      },
    },
    commands: {
      _execute_action: {
        suggested_key: { default: 'Alt+Shift+F' },
      },
    },
  },
});

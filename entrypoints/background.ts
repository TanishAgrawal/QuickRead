import { browser } from 'wxt/browser';

export default defineBackground(() => {
  browser.action.onClicked.addListener(async (tab) => {
    if (tab.id === undefined) return;
    const tabId = tab.id;
    try {
      await browser.scripting.executeScript({ target: { tabId }, files: ['/reader.js'] });
      await browser.action.setBadgeText({ tabId, text: '' });
      await browser.action.setTitle({ tabId, title: 'QuickRead · Read selected text' });
    } catch {
      // Do not log page URLs, selected text, or browser errors containing browsing data.
      await browser.action.setBadgeText({ tabId, text: '!' }).catch(() => {});
      await browser.action.setBadgeBackgroundColor({ tabId, color: '#b45309' }).catch(() => {});
      await browser.action.setTitle({
        tabId,
        title: 'QuickRead cannot read this page. Try a regular webpage. Chrome pages, the Web Store, and the built-in PDF viewer are restricted. Local files need file access enabled.',
      }).catch(() => {});
    }
  });

  browser.runtime.onMessage.addListener((message, sender) => {
    if (sender.id === browser.runtime.id && message?.type === 'quickread:open-options') {
      return browser.runtime.openOptionsPage().then(() => true);
    }
    return undefined;
  });
});

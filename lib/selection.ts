/** Snapshot only highlighted text, including partial words; never expand the selection. */
export function readSelection(source: Window = window): string {
  const active = source.document.activeElement;
  if (active?.tagName === 'IFRAME') {
    try {
      const frame = (active as HTMLIFrameElement).contentWindow;
      if (frame) return readSelection(frame);
    } catch {
      // Cross-origin frames are intentionally outside activeTab's main-origin access.
      return '';
    }
  }
  if (active?.tagName === 'TEXTAREA' || active?.tagName === 'INPUT') {
    const input = active as HTMLInputElement | HTMLTextAreaElement;
    if (input.type === 'password') return '';
    const start = input.selectionStart;
    const end = input.selectionEnd;
    return start !== null && end !== null ? input.value.slice(start, end) : '';
  }
  return source.getSelection()?.toString() ?? '';
}

export function isTypingTarget(event: Event): boolean {
  return event.composedPath().some((target) => target instanceof HTMLElement && (
    target.matches('input, textarea, select, [role="textbox"]') || target.isContentEditable
  ));
}

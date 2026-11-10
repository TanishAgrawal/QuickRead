import { browser } from 'wxt/browser';
import { Playback, tokenize, type PlaybackState, type Word } from './playback';
import { bindingFromEvent, bindingLabel, normalizePreferences, type Preferences } from './preferences';
import { isTypingTarget, readSelection } from './selection';
import { loadPreferences, savePreferences } from './storage';
import styles from './reader.css?inline';

export interface ReaderController {
  load(text: string): void;
  close(): void;
  isValid(): boolean;
}

export function createReader(initialPreferences: Preferences, onClose: () => void): ReaderController {
  let preferences = initialPreferences;
  let disposed = false;
  let moving: { pointer: number; offsetX: number; offsetY: number } | null = null;
  let resizing: { pointer: number; x: number; y: number; width: number; height: number } | null = null;
  let scrub: { pointer: number; wasPlaying: boolean } | null = null;
  let awaitingSelection = false;
  let size = { width: 344, height: 300 };
  let mode: 'word' | 'line' = 'word';
  let lineWords: Word[] = [];
  let lineElements: HTMLSpanElement[] = [];
  let lineAnimation: Animation | null = null;
  let lineCenters: number[] | null = null;
  let lineIndex = -1;
  let position = preferences.position;
  const events = new AbortController();
  const host = document.createElement('quickread-reader');
  const root = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = styles;
  root.append(style);
  const panel = document.createElement('section');
  panel.className = 'panel';
  panel.setAttribute('aria-label', 'QuickRead reader');
  // Only static markup goes through innerHTML; selected text always uses textContent.
  panel.innerHTML = `
    <header class="header">
      <span class="brand"><span class="mark" aria-hidden="true">q.</span> QuickRead</span>
      <span class="header-actions">
        <button class="icon settings" type="button" aria-label="Open QuickRead settings" title="Settings">⚙</button>
        <button class="icon close" type="button" aria-label="Close reader" title="Close">×</button>
      </span>
    </header>
    <div class="mode-switch" role="group" aria-label="Reading mode">
      <button class="word-mode" type="button" aria-pressed="true">Word</button>
      <button class="line-mode" type="button" aria-pressed="false">Line</button>
    </div>
    <div class="stage">
      <span class="word" aria-label="Current word">Select text</span>
      <div class="line-viewport" aria-label="Line reading area" hidden>
        <div class="line-context" aria-hidden="true"><div class="line-stream"></div></div>
        <span class="line-focus" aria-label="Current word"></span>
      </div>
    </div>
    <div class="timeline"><input class="progress" type="range" min="0" max="1" step="1" value="0" aria-label="Reading position" disabled></div>
    <div class="meta"><span class="status" role="status" aria-live="polite">Highlight text, then activate QuickRead.</span><span class="count"></span></div>
    <div class="controls">
      <div class="transport">
        <button class="back" type="button" aria-label="Jump backward">↶ <span></span></button>
        <button class="play primary" type="button" aria-label="Start" disabled>Start</button>
        <button class="forward" type="button" aria-label="Jump forward"><span></span> ↷</button>
      </div>
      <label class="speed"><input type="number" min="60" max="1200" step="10" aria-label="Words per minute"><span>WPM</span></label>
    </div>
    <div class="footer"><p class="hint"></p><button class="reset" type="button" title="Clear this selection and choose new text">Reset</button></div>
    <button class="resize-handle" type="button" aria-label="Resize reader" title="Drag to resize; use arrow keys when focused"></button>
  `;
  root.append(panel);
  document.documentElement.append(host);
  const query = <T extends Element>(selector: string) => panel.querySelector<T>(selector)!;
  const word = query<HTMLSpanElement>('.word');
  const status = query<HTMLSpanElement>('.status');
  const count = query<HTMLSpanElement>('.count');
  const progress = query<HTMLInputElement>('.progress');
  const play = query<HTMLButtonElement>('.play');
  const back = query<HTMLButtonElement>('.back');
  const forward = query<HTMLButtonElement>('.forward');
  const speed = query<HTMLInputElement>('.speed input');
  const header = query<HTMLElement>('.header');
  const hint = query<HTMLParagraphElement>('.hint');
  const resizeHandle = query<HTMLButtonElement>('.resize-handle');
  const wordMode = query<HTMLButtonElement>('.word-mode');
  const lineMode = query<HTMLButtonElement>('.line-mode');
  const lineViewport = query<HTMLDivElement>('.line-viewport');
  const lineStream = query<HTMLDivElement>('.line-stream');
  const lineFocus = query<HTMLSpanElement>('.line-focus');

  function cancelLineAnimation(): void {
    if (!lineAnimation) return;
    // Preserve the actual displayed position when pausing or changing modes.
    const transform = getComputedStyle(lineStream).transform;
    lineAnimation.cancel();
    lineAnimation = null;
    lineStream.style.transform = transform;
  }

  function ensureLineElements(): void {
    if (lineElements.length === lineWords.length) return;
    const fragment = document.createDocumentFragment();
    lineElements = lineWords.map((item, index) => {
      const span = document.createElement('span');
      span.className = 'line-token';
      span.textContent = item.text;
      fragment.append(span);
      if (index < lineWords.length - 1) fragment.append(' ');
      return span;
    });
    lineStream.replaceChildren(fragment);
    lineCenters = null;
  }

  function drawLine(state: PlaybackState): void {
    const current = lineElements[state.index];
    if (!current) {
      cancelLineAnimation();
      lineStream.style.transform = '';
      lineFocus.textContent = '';
      return;
    }
    const needsMeasurement = lineCenters === null;
    if (needsMeasurement) {
      const streamLeft = lineStream.getBoundingClientRect().left;
      // Measure subpixel centers only when text size or viewport geometry changes.
      lineCenters = lineElements.map((element) => {
        const bounds = element.getBoundingClientRect();
        return bounds.left - streamLeft + bounds.width / 2;
      });
    }
    const previousIndex = lineIndex;
    const indexChanged = previousIndex !== state.index;
    if (indexChanged || needsMeasurement) {
      lineElements[previousIndex]?.removeAttribute('aria-current');
      current.setAttribute('aria-current', 'true');
      lineFocus.textContent = state.word;
      lineFocus.style.transform = 'translate(-50%, -50%)';
      const focusWidth = lineFocus.getBoundingClientRect().width;
      const available = Math.max(1, lineViewport.clientWidth - 8);
      if (focusWidth > available) {
        lineFocus.style.transform = `translate(-50%, -50%) scale(${available / focusWidth})`;
      }
      const target = `translate3d(${lineViewport.clientWidth / 2 - (lineCenters?.[state.index] ?? 0)}px, 0, 0)`;
      cancelLineAnimation();
      const from = getComputedStyle(lineStream).transform;
      lineStream.style.transform = target;
      // Only ordinary playback advances animate. Seeking and resizing reframe immediately.
      if (state.playing && previousIndex + 1 === state.index && !needsMeasurement) {
        const duration = Math.min(150, 60_000 / preferences.wpm * (1 - playback.wordProgress) * 0.6);
        const animation = lineStream.animate([{ transform: from }, { transform: target }], {
          duration,
          easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)',
        });
        lineAnimation = animation;
        animation.onfinish = () => {
          if (lineAnimation !== animation) return;
          animation.cancel();
          lineAnimation = null;
        };
      }
      lineIndex = state.index;
    } else if (lineAnimation) {
      if (state.playing && lineAnimation.playState === 'paused') lineAnimation.play();
      else if (!state.playing && lineAnimation.playState === 'running') lineAnimation.pause();
    }
  }

  function syncLine(state: PlaybackState): void {
    const showLine = mode === 'line' && state.total > 0;
    lineViewport.hidden = !showLine;
    word.hidden = showLine;
    if (!showLine) {
      cancelLineAnimation();
      lineIndex = -1;
      return;
    }
    ensureLineElements();
    drawLine(state);
  }

  function fitWord(): void {
    word.style.transform = '';
    const available = Math.max(1, host.getBoundingClientRect().width - 40);
    const stageHeight = query('.stage').getBoundingClientRect().height;
    const lineFontSize = `${Math.max(18, Math.min(32, available * 0.07, (stageHeight - 16) / 1.5))}px`;
    if (lineStream.style.fontSize !== lineFontSize) {
      lineStream.style.fontSize = lineFontSize;
      lineFocus.style.fontSize = lineFontSize;
      lineCenters = null;
    }
    word.style.fontSize = `${Math.max(18, Math.min(100, available * 0.125, (stageHeight - 16) / 1.2))}px`;
    const width = word.getBoundingClientRect().width;
    if (width > available) word.style.transform = `scale(${available / width})`;
  }

  function render(state: PlaybackState): void {
    word.hidden = mode === 'line' && state.total > 0;
    lineViewport.hidden = !word.hidden;
    word.textContent = state.word || 'Select text';
    word.title = state.word;
    if (mode === 'word' || state.total === 0) fitWord();
    count.textContent = state.total ? `${state.index + 1} / ${state.total}` : '';
    progress.max = String(Math.max(0, state.total - 1));
    progress.value = String(state.index);
    progress.disabled = state.total < 2;
    const percent = state.total > 1 ? state.index / (state.total - 1) * 100 : state.total ? 100 : 0;
    progress.style.setProperty('--progress', `${percent}%`);
    progress.setAttribute('aria-valuetext', state.total ? `Word ${state.index + 1} of ${state.total}: ${state.word}` : 'No selection');
    play.textContent = state.playing ? 'Pause' : state.finished ? 'Replay' : state.started ? 'Resume' : 'Start';
    play.setAttribute('aria-label', play.textContent);
    play.disabled = back.disabled = forward.disabled = state.total === 0;
    // Keep the screen reader status stable during playback; do not announce every word.
    status.textContent = !state.total ? awaitingSelection ? 'Highlight new text on the page.' : 'Highlight text, then activate QuickRead.'
      : state.finished ? 'Finished' : state.playing ? 'Reading' : state.started ? 'Paused' : 'Ready — press Start';
    syncLine(state);
  }

  const playback = new Playback(preferences, render);

  function setPosition(next: { x: number; y: number }): void {
    const bounds = host.getBoundingClientRect();
    position = {
      x: Math.max(0, Math.min(next.x, window.innerWidth - bounds.width)),
      y: Math.max(0, Math.min(next.y, window.innerHeight - bounds.height)),
    };
    host.style.setProperty('left', `${position.x}px`, 'important');
    host.style.setProperty('top', `${position.y}px`, 'important');
  }

  function setSize(next: { width: number; height: number }): void {
    size = {
      width: Math.min(window.innerWidth, Math.max(296, next.width)),
      height: Math.min(window.innerHeight, Math.max(280, next.height)),
    };
    host.style.setProperty('--reader-width', `${size.width}px`);
    host.style.setProperty('--reader-height', `${size.height}px`);
    if (position) setPosition(position);
    lineCenters = null;
    fitWord();
    syncLine(playback.state);
  }

  function load(text: string, waitForSelection = false): void {
    scrub = null;
    awaitingSelection = waitForSelection;
    lineWords = tokenize(text);
    lineElements = [];
    cancelLineAnimation();
    lineCenters = null;
    lineIndex = -1;
    lineStream.replaceChildren();
    lineFocus.textContent = '';
    playback.load(text);
  }

  function setMode(next: 'word' | 'line'): void {
    mode = next;
    wordMode.setAttribute('aria-pressed', String(mode === 'word'));
    lineMode.setAttribute('aria-pressed', String(mode === 'line'));
    render(playback.state);
  }

  function updateControls(): void {
    speed.value = String(preferences.wpm);
    query('.back span').textContent = String(preferences.jumpWords);
    query('.forward span').textContent = String(preferences.jumpWords);
    back.title = `Back ${preferences.jumpWords} words (${bindingLabel(preferences.bindings.backward)})`;
    forward.title = `Forward ${preferences.jumpWords} words (${bindingLabel(preferences.bindings.forward)})`;
    hint.textContent = `${bindingLabel(preferences.bindings.pause)} pause · ${bindingLabel(preferences.bindings.backward)} / ${bindingLabel(preferences.bindings.forward)} seek`;
    query('.close').setAttribute('title', `Close (${bindingLabel(preferences.bindings.close)})`);
  }

  const listen = (target: EventTarget, type: string, listener: EventListener, capture = false) => {
    target.addEventListener(type, listener, { signal: events.signal, capture });
  };

  function close(): void {
    if (disposed) return;
    disposed = true;
    cancelLineAnimation();
    playback.dispose();
    events.abort();
    try { browser.storage.onChanged.removeListener(onStorageChanged); }
    catch { /* An extension reload can invalidate the previous reader's API context. */ }
    const focusWasInside = document.activeElement === host;
    host.remove();
    if (focusWasInside) previousFocus?.focus({ preventScroll: true });
    onClose();
  }

  const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  listen(wordMode, 'click', () => setMode('word'));
  listen(lineMode, 'click', () => setMode('line'));
  listen(play, 'click', () => playback.toggle());
  listen(back, 'click', () => playback.seek(-preferences.jumpWords));
  listen(forward, 'click', () => playback.seek(preferences.jumpWords));
  listen(query('.reset'), 'click', () => {
    window.getSelection()?.removeAllRanges();
    load('', true);
    observeSelectionFrames(window);
  });

  function captureNewSelection(event: Event): void {
    if (!awaitingSelection || event.composedPath().includes(host)) return;
    const text = readSelection();
    if (text.trim()) load(text);
  }
  listen(document, 'pointerup', captureNewSelection);
  listen(document, 'keyup', captureNewSelection);
  function observeSelectionFrames(source: Window): void {
    for (const frame of source.document.querySelectorAll('iframe')) {
      try {
        const child = frame.contentWindow;
        if (!child) continue;
        listen(child.document, 'pointerup', captureNewSelection);
        listen(child.document, 'keyup', captureNewSelection);
        observeSelectionFrames(child);
      } catch { /* Cross-origin frames remain outside the current access scope. */ }
    }
  }

  listen(progress, 'pointerdown', (raw) => {
    const event = raw as PointerEvent;
    if (event.button !== 0 || progress.disabled) return;
    scrub = { pointer: event.pointerId, wasPlaying: playback.state.playing };
    playback.pause();
  });
  listen(progress, 'input', () => {
    playback.seekTo(Number(progress.value), scrub ? false : playback.state.playing);
  });
  function endScrub(raw: Event): void {
    const event = raw as PointerEvent;
    if (!scrub || event.pointerId !== scrub.pointer) return;
    const shouldResume = scrub.wasPlaying && !document.hidden;
    scrub = null;
    if (shouldResume) playback.resume();
  }
  listen(document, 'pointerup', endScrub, true);
  listen(document, 'pointercancel', endScrub, true);
  listen(query('.close'), 'click', close);
  listen(query('.settings'), 'click', () => {
    playback.pause();
    void browser.runtime.sendMessage({ type: 'quickread:open-options' }).catch(() => {
      status.textContent = 'Reload the extension to reconnect settings.';
    });
  });
  listen(speed, 'change', () => {
    if (!speed.validity.valid || !speed.value) {
      speed.value = String(preferences.wpm);
      return;
    }
    preferences = normalizePreferences({ ...preferences, wpm: Number(speed.value) });
    playback.updatePreferences(preferences);
    void savePreferences({ wpm: preferences.wpm }).catch(() => {
      status.textContent = 'Speed changed for this session; could not save it.';
    });
    updateControls();
  });

  listen(document, 'keydown', (raw) => {
    const event = raw as KeyboardEvent;
    if (event.repeat || event.isComposing || event.defaultPrevented || isTypingTarget(event)) return;
    if (event.composedPath().includes(resizeHandle)) return;
    const binding = bindingFromEvent(event);
    const action = (Object.keys(preferences.bindings) as (keyof Preferences['bindings'])[])
      .find((key) => preferences.bindings[key] === binding);
    if (!action) return;
    if (action !== 'close' && playback.state.total === 0) return;
    // Space/Enter on a focused button keeps its normal button activation behavior.
    if ((event.code === 'Space' || event.code === 'Enter') && event.composedPath().some(
      (target) => target instanceof HTMLButtonElement,
    )) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (action === 'pause') playback.toggle();
    if (action === 'backward') playback.seek(-preferences.jumpWords);
    if (action === 'forward') playback.seek(preferences.jumpWords);
    if (action === 'close') close();
  }, true);

  listen(header, 'pointerdown', (raw) => {
    const event = raw as PointerEvent;
    if (event.button !== 0 || (event.target as Element).closest('button')) return;
    const bounds = host.getBoundingClientRect();
    moving = { pointer: event.pointerId, offsetX: event.clientX - bounds.left, offsetY: event.clientY - bounds.top };
    header.setPointerCapture(event.pointerId);
    event.preventDefault();
  });
  listen(header, 'pointermove', (raw) => {
    const event = raw as PointerEvent;
    if (!moving || event.pointerId !== moving.pointer) return;
    setPosition({ x: event.clientX - moving.offsetX, y: event.clientY - moving.offsetY });
  });
  function endDrag(): void {
    if (!moving) return;
    moving = null;
    void savePreferences({ position }).catch(() => {
      status.textContent = 'Position changed for this session; could not save it.';
    });
  }
  listen(header, 'pointerup', endDrag);
  listen(header, 'pointercancel', endDrag);
  listen(header, 'lostpointercapture', endDrag);

  listen(resizeHandle, 'pointerdown', (raw) => {
    const event = raw as PointerEvent;
    if (event.button !== 0) return;
    const bounds = host.getBoundingClientRect();
    resizing = { pointer: event.pointerId, x: event.clientX, y: event.clientY, width: bounds.width, height: bounds.height };
    resizeHandle.setPointerCapture(event.pointerId);
    event.preventDefault();
  });
  listen(resizeHandle, 'pointermove', (raw) => {
    const event = raw as PointerEvent;
    if (!resizing || event.pointerId !== resizing.pointer) return;
    setSize({ width: resizing.width + event.clientX - resizing.x, height: resizing.height + event.clientY - resizing.y });
  });
  const endResize = () => { resizing = null; };
  listen(resizeHandle, 'pointerup', endResize);
  listen(resizeHandle, 'pointercancel', endResize);
  listen(resizeHandle, 'lostpointercapture', endResize);
  listen(resizeHandle, 'keydown', (raw) => {
    const event = raw as KeyboardEvent;
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.code)) return;
    event.preventDefault();
    const amount = event.shiftKey ? 40 : 16;
    setSize({
      width: size.width + (event.code === 'ArrowRight' ? amount : event.code === 'ArrowLeft' ? -amount : 0),
      height: size.height + (event.code === 'ArrowDown' ? amount : event.code === 'ArrowUp' ? -amount : 0),
    });
  });
  listen(window, 'resize', () => {
    setSize(size);
  });
  listen(document, 'visibilitychange', () => {
    if (document.hidden) {
      scrub = null;
      playback.pause();
    }
  });
  listen(window, 'pagehide', close);

  let refresh = 0;
  function onStorageChanged(_changes: unknown, area: string): void {
    if (area !== 'local') return;
    const request = ++refresh;
    void loadPreferences().then((saved) => {
      if (disposed || request !== refresh) return;
      preferences = saved;
      playback.updatePreferences(preferences);
      updateControls();
    }).catch(() => {});
  }
  browser.storage.onChanged.addListener(onStorageChanged);
  updateControls();
  setSize(size);
  render(playback.state);
  setPosition(position ?? { x: window.innerWidth - host.getBoundingClientRect().width - 24, y: 24 });

  return {
    load,
    close,
    isValid() {
      try { return !disposed && host.isConnected && Boolean(browser.runtime.id); }
      catch { return false; }
    },
  };
}

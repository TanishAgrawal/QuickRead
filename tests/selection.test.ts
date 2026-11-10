import { afterEach, describe, expect, it } from 'vitest';
import { readSelection } from '../lib/selection';

afterEach(() => { window.getSelection()?.removeAllRanges(); document.body.replaceChildren(); });

describe('selection boundaries', () => {
  it('returns exactly the selected substring without adding surrounding words', () => {
    document.body.innerHTML = '<p>before partial after</p>';
    const node = document.querySelector('p')!.firstChild!;
    const range = document.createRange();
    range.setStart(node, 9);
    range.setEnd(node, 13);
    window.getSelection()!.addRange(range);
    expect(readSelection()).toBe('rtia');
  });

  it('keeps selection order across inline markup', () => {
    document.body.innerHTML = '<p>one <em>two</em> three</p>';
    const range = document.createRange();
    range.selectNodeContents(document.querySelector('p')!);
    window.getSelection()!.addRange(range);
    expect(readSelection()).toBe('one two three');
  });

  it('returns empty text for a collapsed selection', () => {
    document.body.innerHTML = '<p>not highlighted</p>';
    const range = document.createRange();
    range.setStart(document.querySelector('p')!.firstChild!, 3);
    range.collapse(true);
    window.getSelection()!.addRange(range);
    expect(readSelection()).toBe('');
  });

  it('reads selected text in a textarea without taking the whole field', () => {
    const input = document.createElement('textarea');
    input.value = 'before highlighted after';
    document.body.append(input);
    input.focus();
    input.setSelectionRange(7, 18);
    expect(readSelection()).toBe('highlighted');
  });

  it('never reads password fields', () => {
    const input = document.createElement('input');
    input.type = 'password';
    input.value = 'private';
    document.body.append(input);
    input.focus();
    input.select();
    expect(readSelection()).toBe('');
  });

  it('reads a selection from a focused same-origin iframe', () => {
    const frame = document.createElement('iframe');
    document.body.append(frame);
    frame.contentDocument!.body.textContent = 'inside frame';
    const range = frame.contentDocument!.createRange();
    range.selectNodeContents(frame.contentDocument!.body);
    frame.contentWindow!.getSelection()!.addRange(range);
    frame.focus();
    expect(readSelection()).toBe('inside frame');
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Playback, tokenize, wordDuration, type PlaybackState } from '../lib/playback';
import { defaultPreferences } from '../lib/preferences';

describe('word order and punctuation', () => {
  it('preserves partial words, punctuation, Unicode, and source order', () => {
    expect(tokenize('  artial\t“hello,”  naïve 世界!\n\nNext\u00a0word ')).toEqual([
      { text: 'artial', paragraphEnd: false },
      { text: '“hello,”', paragraphEnd: false },
      { text: 'naïve', paragraphEnd: false },
      { text: '世界!', paragraphEnd: true },
      { text: 'Next', paragraphEnd: false },
      { text: 'word', paragraphEnd: false },
    ]);
  });

  it('distinguishes wrapped lines from paragraphs, including Windows line endings', () => {
    expect(tokenize('one\ntwo\r\n \r\nthree').map((word) => word.paragraphEnd)).toEqual([false, true, false]);
    expect(tokenize(' \n\t')).toEqual([]);
  });

  it.each([
    ['word', false, 200], ['word,', false, 300], ['word;', false, 300],
    ['word:', false, 300], ['word.”', false, 450], ['really?!', false, 450],
    ['word…', false, 450], ['结束。', false, 450], ['word.', true, 600],
    ['word,', true, 600], ['3.14', false, 200],
  ])('times %s with paragraph=%s for %s ms', (text, paragraphEnd, expected) => {
    expect(wordDuration({ text, paragraphEnd }, defaultPreferences)).toBe(expected);
  });

  it('applies speed to the base duration and configurable pauses independently', () => {
    expect(wordDuration({ text: 'end.', paragraphEnd: false }, {
      ...defaultPreferences, wpm: 600, sentencePauseMs: 80,
    })).toBe(180);
  });
});

describe('playback transitions', () => {
  let playback: Playback;
  let states: PlaybackState[];
  beforeEach(() => {
    vi.useFakeTimers();
    states = [];
    playback = new Playback(defaultPreferences, (state) => states.push(state));
  });
  afterEach(() => { playback.dispose(); vi.useRealTimers(); });

  it('loads the first word ready without advancing until Start', () => {
    playback.load('first second');
    vi.advanceTimersByTime(5000);
    expect(playback.state).toMatchObject({ word: 'first', started: false, playing: false });
    expect(vi.getTimerCount()).toBe(0);
    playback.resume();
    vi.advanceTimersByTime(200);
    expect(playback.state).toMatchObject({ word: 'second', started: true, playing: true });
  });

  it('shows the first word immediately and gives the final word its full duration', () => {
    playback.load('first last.');
    playback.resume();
    expect(playback.state.word).toBe('first');
    vi.advanceTimersByTime(199);
    expect(playback.state.word).toBe('first');
    vi.advanceTimersByTime(1);
    expect(playback.state.word).toBe('last.');
    vi.advanceTimersByTime(449);
    expect(playback.state.playing).toBe(true);
    vi.advanceTimersByTime(1);
    expect(playback.state).toMatchObject({ word: 'last.', playing: false, finished: true });
    expect(states.map((state) => state.word)).toEqual(['first', 'first', 'last.', 'last.']);
  });

  it('preserves remaining display time while paused and does not create duplicate timers', () => {
    playback.load('one two three');
    playback.resume();
    vi.advanceTimersByTime(80);
    playback.pause();
    playback.pause();
    vi.advanceTimersByTime(5000);
    expect(playback.state.word).toBe('one');
    playback.resume();
    playback.resume();
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(119);
    expect(playback.state.word).toBe('one');
    vi.advanceTimersByTime(1);
    expect(playback.state.word).toBe('two');
  });

  it.each(['ready', 'paused', 'playing'] as const)('relative seeking preserves %s state and clamps boundaries', (state) => {
    playback.load('zero one two three four five six seven eight');
    if (state !== 'ready') playback.resume();
    if (state === 'paused') {
      vi.advanceTimersByTime(80);
      playback.pause();
    }
    const expectedState = { playing: state === 'playing', started: state !== 'ready' };
    playback.seek(5);
    expect(playback.state).toMatchObject({ index: 5, word: 'five', ...expectedState });
    playback.seek(100);
    expect(playback.state).toMatchObject({ word: 'eight', ...expectedState });
    playback.seek(-5);
    expect(playback.state).toMatchObject({ word: 'three', ...expectedState });
    playback.seek(-100);
    expect(playback.state).toMatchObject({ word: 'zero', ...expectedState });
    expect(vi.getTimerCount()).toBe(state === 'playing' ? 1 : 0);
    if (state !== 'playing') {
      vi.advanceTimersByTime(5000);
      expect(playback.state).toMatchObject({ word: 'zero', ...expectedState });
      playback.resume();
    }
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(199);
    expect(playback.state.word).toBe('zero');
    vi.advanceTimersByTime(1);
    expect(playback.state.word).toBe('one');
  });

  it('replays from the beginning after completion and can rewind from completion', () => {
    playback.load('one two');
    playback.resume();
    vi.runAllTimers();
    playback.resume();
    expect(playback.state).toMatchObject({ index: 0, playing: true, finished: false });
    vi.runAllTimers();
    playback.seek(-1);
    expect(playback.state).toMatchObject({ index: 0, playing: false, finished: false });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('replaces a session without retaining the previous timer', () => {
    playback.load('old words');
    playback.resume();
    vi.advanceTimersByTime(150);
    playback.load('new selection');
    playback.resume();
    vi.advanceTimersByTime(50);
    expect(playback.state.word).toBe('new');
    vi.advanceTimersByTime(150);
    expect(playback.state.word).toBe('selection');
  });

  it('updates speed while playing and stays paused when settings change while paused', () => {
    playback.load('one two three');
    playback.resume();
    playback.updatePreferences({ ...defaultPreferences, wpm: 600 });
    vi.advanceTimersByTime(100);
    expect(playback.state.word).toBe('two');
    playback.pause();
    playback.updatePreferences({ ...defaultPreferences, wpm: 60 });
    vi.advanceTimersByTime(10000);
    expect(playback.state).toMatchObject({ word: 'two', playing: false });
  });

  it('handles an empty selection and disposes pending playback', () => {
    playback.load(' \n');
    playback.resume();
    playback.seek(5);
    expect(playback.state).toMatchObject({ total: 0, playing: false });
    expect(vi.getTimerCount()).toBe(0);
    playback.load('one two');
    playback.resume();
    playback.dispose();
    vi.advanceTimersByTime(5000);
    expect(playback.state.word).toBe('one');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('clears a running session and loads a new selection into Ready', () => {
    playback.load('old selection');
    playback.resume();
    playback.load('');
    vi.advanceTimersByTime(5000);
    expect(playback.state).toMatchObject({ word: '', total: 0, playing: false, started: false });
    expect(vi.getTimerCount()).toBe(0);
    playback.load('different text');
    expect(playback.state).toMatchObject({ word: 'different', index: 0, total: 2, playing: false, started: false });
  });

  it('absolute seeking preserves Ready, paused, and playing states and clamps endpoints', () => {
    playback.load('zero one two three');
    playback.seekTo(2);
    expect(playback.state).toMatchObject({ word: 'two', playing: false, started: false });
    playback.resume();
    playback.seekTo(1);
    expect(playback.state).toMatchObject({ word: 'one', playing: true });
    expect(vi.getTimerCount()).toBe(1);
    playback.pause();
    playback.seekTo(100);
    expect(playback.state).toMatchObject({ word: 'three', playing: false, started: true });
    playback.seekTo(-100);
    expect(playback.state.word).toBe('zero');
    playback.seekTo(NaN);
    expect(playback.state.word).toBe('zero');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('previews a scrub without advancing, then resumes at the chosen word', () => {
    playback.load('zero one two three');
    playback.resume();
    playback.pause();
    playback.seekTo(2, false);
    vi.advanceTimersByTime(5000);
    expect(playback.state.word).toBe('two');
    playback.resume();
    vi.advanceTimersByTime(199);
    expect(playback.state.word).toBe('two');
    vi.advanceTimersByTime(1);
    expect(playback.state.word).toBe('three');
  });

  it('provides smooth word progress that freezes on pause and resets when seeking', () => {
    playback.load('zero one two');
    expect(playback.wordProgress).toBe(0);
    playback.resume();
    vi.advanceTimersByTime(80);
    expect(playback.wordProgress).toBeCloseTo(0.4);
    playback.pause();
    vi.advanceTimersByTime(5000);
    expect(playback.wordProgress).toBeCloseTo(0.4);
    playback.resume();
    expect(playback.wordProgress).toBeCloseTo(0.4);
    playback.seekTo(2, false);
    expect(playback.wordProgress).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not restart the reading clock when only position or controls change', () => {
    playback.load('first second');
    playback.resume();
    vi.advanceTimersByTime(80);
    playback.updatePreferences({ ...defaultPreferences, position: { x: 200, y: 100 }, jumpWords: 3 });
    expect(playback.wordProgress).toBeCloseTo(0.4);
    vi.advanceTimersByTime(119);
    expect(playback.state.word).toBe('first');
    vi.advanceTimersByTime(1);
    expect(playback.state.word).toBe('second');
  });

  it('holds scroll progress during punctuation pauses instead of moving more slowly', () => {
    playback.load('first, next');
    playback.resume();
    vi.advanceTimersByTime(100);
    expect(playback.wordProgress).toBeCloseTo(0.5);
    vi.advanceTimersByTime(100);
    expect(playback.wordProgress).toBe(1);
    vi.advanceTimersByTime(99);
    expect(playback.wordProgress).toBe(1);
    expect(playback.state.word).toBe('first,');
    vi.advanceTimersByTime(1);
    expect(playback.state.word).toBe('next');
    expect(playback.wordProgress).toBe(0);
    playback.load('');
    expect(playback.wordProgress).toBe(0);
  });
});

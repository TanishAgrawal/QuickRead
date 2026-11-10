import type { Preferences } from './preferences';

export interface Word {
  text: string;
  paragraphEnd: boolean;
}

export function tokenize(text: string): Word[] {
  const matches = [...text.matchAll(/\S+/gu)];
  return matches.map((match, index) => {
    const next = matches[index + 1];
    const separator = text.slice((match.index ?? 0) + match[0].length, next?.index ?? text.length);
    return { text: match[0], paragraphEnd: /\r?\n\s*\r?\n/u.test(separator) };
  });
}

export function wordDuration(word: Word, preferences: Preferences): number {
  const ending = word.text.replace(/["'”’»）)\]}]+$/gu, '');
  const minor = /[,;:，；：]$/u.test(ending) ? preferences.minorPauseMs : 0;
  const sentence = /[.!?…。！？]$/u.test(ending) ? preferences.sentencePauseMs : 0;
  const paragraph = word.paragraphEnd ? preferences.paragraphPauseMs : 0;
  return 60_000 / preferences.wpm + Math.max(minor, sentence, paragraph);
}

export interface PlaybackState {
  word: string;
  index: number;
  total: number;
  playing: boolean;
  started: boolean;
  finished: boolean;
}

/** One timer at a time. Hidden tabs pause instead of racing through missed words. */
export class Playback {
  private words: Word[] = [];
  private index = 0;
  private playing = false;
  private started = false;
  private finished = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private deadline = 0;
  private remaining: number | undefined;

  constructor(private preferences: Preferences, private onChange: (state: PlaybackState) => void) {}

  get state(): PlaybackState {
    return {
      word: this.words[this.index]?.text ?? '',
      index: this.index,
      total: this.words.length,
      playing: this.playing,
      started: this.started,
      finished: this.finished,
    };
  }

  /** Position within the word's base reading time; hold still during extra pauses. */
  get wordProgress(): number {
    const word = this.words[this.index];
    if (!word) return 0;
    const duration = wordDuration(word, this.preferences);
    const remaining = this.playing && this.timer !== undefined
      ? Math.max(0, this.deadline - Date.now())
      : this.remaining ?? (this.finished ? 0 : duration);
    return Math.max(0, Math.min(1, (duration - remaining) / (60_000 / this.preferences.wpm)));
  }

  load(text: string): void {
    this.clearTimer();
    this.words = tokenize(text);
    this.index = 0;
    this.playing = false;
    this.started = false;
    this.finished = false;
    this.remaining = undefined;
    this.emit();
  }

  pause(): void {
    if (!this.playing) return;
    this.remaining = Math.max(0, this.deadline - Date.now());
    this.clearTimer();
    this.playing = false;
    this.emit();
  }

  resume(): void {
    if (this.playing || !this.words.length) return;
    if (this.finished) {
      this.index = 0;
      this.finished = false;
      this.remaining = undefined;
    }
    this.playing = true;
    this.started = true;
    this.emit();
    this.schedule();
  }

  toggle(): void {
    if (this.playing) this.pause();
    else this.resume();
  }

  seek(delta: number): void {
    this.seekTo(this.index + delta);
  }

  seekTo(index: number, playing = this.playing): void {
    if (!Number.isFinite(index)) return;
    if (!this.words.length) return;
    this.clearTimer();
    this.index = Math.max(0, Math.min(this.words.length - 1, Math.round(index)));
    this.finished = false;
    this.remaining = undefined;
    this.playing = playing;
    this.started ||= playing;
    this.emit();
    this.schedule();
  }

  updatePreferences(preferences: Preferences): void {
    const timingChanged = preferences.wpm !== this.preferences.wpm
      || preferences.minorPauseMs !== this.preferences.minorPauseMs
      || preferences.sentencePauseMs !== this.preferences.sentencePauseMs
      || preferences.paragraphPauseMs !== this.preferences.paragraphPauseMs;
    this.preferences = preferences;
    if (!timingChanged) return;
    this.remaining = undefined;
    this.clearTimer();
    this.schedule();
  }

  dispose(): void {
    this.clearTimer();
    this.playing = false;
  }

  private emit(): void {
    this.onChange(this.state);
  }

  private clearTimer(): void {
    if (this.timer !== undefined) clearTimeout(this.timer);
    this.timer = undefined;
  }

  private schedule(): void {
    const word = this.words[this.index];
    if (!this.playing || !word) return;
    const delay = this.remaining ?? wordDuration(word, this.preferences);
    this.remaining = undefined;
    this.deadline = Date.now() + delay;
    this.timer = setTimeout(() => {
      this.timer = undefined;
      if (this.index + 1 >= this.words.length) {
        this.playing = false;
        this.finished = true;
      } else {
        this.index++;
      }
      this.emit();
      this.schedule();
    }, delay);
  }
}

export type FitMode = 'width' | 'height' | 'original';
export type ReadingMode = 'ltr' | 'rtl' | 'webtoon';
export type ReaderTheme = 'system' | 'light' | 'dark';

export type ReaderPrefs = {
  fit: FitMode;
  mode: ReadingMode;
  theme: ReaderTheme;
  brightness: number;
  showChapterSubtitle: boolean;
  showProgressBar: boolean;
  rememberLastChapter: boolean;
  showTapZoneHint: boolean;
};

const KEY = 'suwayomi-reader-prefs';
export const DEFAULT_READER_PREFS: ReaderPrefs = {
  fit: 'width',
  mode: 'ltr',
  theme: 'dark',
  brightness: 100,
  showChapterSubtitle: true,
  showProgressBar: true,
  rememberLastChapter: true,
  showTapZoneHint: true,
};

export function loadPrefs(): ReaderPrefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_READER_PREFS;
    const stored = JSON.parse(raw) as Partial<ReaderPrefs>;
    return {
      ...DEFAULT_READER_PREFS,
      ...stored,
      brightness: Math.min(140, Math.max(40, Number(stored.brightness ?? DEFAULT_READER_PREFS.brightness))),
    };
  } catch {
    return DEFAULT_READER_PREFS;
  }
}

export function savePrefs(prefs: ReaderPrefs): void {
  localStorage.setItem(KEY, JSON.stringify(prefs));
}

export function resetPrefs(): void {
  localStorage.removeItem(KEY);
}

export const READING_MODE_META_KEY = 'neyomi.readingMode';

export const CHAPTER_SORT_META_KEY = 'neyomi.chapterSort';

export function isReadingMode(value: unknown): value is ReadingMode {
  return value === 'ltr' || value === 'rtl' || value === 'webtoon';
}

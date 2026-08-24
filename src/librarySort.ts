export type SortKey = 'title' | 'added' | 'unread' | 'lastRead' | 'chapters' | 'latest';
export type SortDir = 'asc' | 'desc';
export type LibrarySort = { key: SortKey; dir: SortDir };

export const SORT_OPTIONS: { key: SortKey; label: string; naturalDir: SortDir }[] = [
  { key: 'title', label: 'Title', naturalDir: 'asc' },
  { key: 'added', label: 'Date added', naturalDir: 'desc' },
  { key: 'unread', label: 'Unread', naturalDir: 'desc' },
  { key: 'lastRead', label: 'Last read', naturalDir: 'desc' },
  { key: 'latest', label: 'Latest chapter', naturalDir: 'desc' },
  { key: 'chapters', label: 'Chapter count', naturalDir: 'desc' },
];

export const DEFAULT_SORT: LibrarySort = { key: 'title', dir: 'asc' };

const KEY = 'suwayomi-library-sort';

export function loadSort(): LibrarySort {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SORT;
    const stored = JSON.parse(raw) as Partial<LibrarySort>;
    const key = SORT_OPTIONS.some((o) => o.key === stored.key) ? (stored.key as SortKey) : DEFAULT_SORT.key;
    const dir = stored.dir === 'asc' || stored.dir === 'desc' ? stored.dir : DEFAULT_SORT.dir;
    return { key, dir };
  } catch {
    return DEFAULT_SORT;
  }
}

export function saveSort(sort: LibrarySort): void {
  localStorage.setItem(KEY, JSON.stringify(sort));
}

export type SortableManga = {
  title: string;
  unreadCount: number;
  inLibraryAt: string;
  chapters: { totalCount: number };
  lastReadChapter?: { lastReadAt: string } | null;
  latestUploadedChapter?: { uploadDate: string } | null;
};

const num = (value?: string | null) => (value ? Number(value) : 0);

function valueFor(manga: SortableManga, key: SortKey): number | string {
  switch (key) {
    case 'title':
      return manga.title;
    case 'added':
      return num(manga.inLibraryAt);
    case 'unread':
      return manga.unreadCount;
    case 'lastRead':
      return num(manga.lastReadChapter?.lastReadAt);
    case 'latest':
      return num(manga.latestUploadedChapter?.uploadDate);
    case 'chapters':
      return manga.chapters.totalCount;
  }
}

export function sortLibrary<T extends SortableManga>(items: T[], sort: LibrarySort): T[] {
  const factor = sort.dir === 'asc' ? 1 : -1;

  return [...items].sort((a, b) => {
    const left = valueFor(a, sort.key);
    const right = valueFor(b, sort.key);

    let result: number;
    if (typeof left === 'string' || typeof right === 'string') {
      result = String(left).localeCompare(String(right), undefined, { sensitivity: 'base' });
    } else {
      result = left - right;
    }

    if (result === 0 && sort.key !== 'title') {
      return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
    }
    return result * factor;
  });
}

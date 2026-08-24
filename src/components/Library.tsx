import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'urql';
import { BookmarkedChaptersQuery, LibraryFullQuery } from '../operations';
import { MangaCard } from './MangaCard';
import { PageHeader, CoverGridSkeleton, EmptyState, ErrorState } from './ui';
import { MoreVerticalIcon, SearchIcon, SortIcon } from './icons';
import { chapterLabel } from '../format';
import { Brand } from './Brand';
import {
  DEFAULT_SORT,
  SORT_OPTIONS,
  loadSort,
  saveSort,
  sortLibrary,
  type SortKey,
} from '../librarySort';

const GRID = 'grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8';
const num = (s?: string | null) => (s ? Number(s) : 0);

type Tab = 'library' | 'bookmarks' | 'history';

export function Library() {
  const [tab, setTab] = useState<Tab>('library');
  const [sort, setSort] = useState(loadSort);
  const [sortOpen, setSortOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [{ data, fetching, error }] = useQuery({ query: LibraryFullQuery, variables: { first: 500 } });
  const rawNodes = useMemo(() => data?.mangas.nodes ?? [], [data]);
  const nodes = useMemo(() => {
    const term = search.trim().toLowerCase();
    const matched = term ? rawNodes.filter((m) => m.title.toLowerCase().includes(term)) : rawNodes;
    return sortLibrary(matched, sort);
  }, [rawNodes, sort, search]);

  function applySort(key: SortKey) {
    const next =
      key === sort.key
        ? { key, dir: sort.dir === 'asc' ? ('desc' as const) : ('asc' as const) }
        : { key, dir: SORT_OPTIONS.find((o) => o.key === key)?.naturalDir ?? DEFAULT_SORT.dir };
    setSort(next);
    saveSort(next);
  }

  const reading = useMemo(
    () =>
      rawNodes
        .filter((m) => m.unreadCount > 0 && m.lastReadChapter && m.firstUnreadChapter)
        .sort((a, b) => num(b.lastReadChapter?.lastReadAt) - num(a.lastReadChapter?.lastReadAt)),
    [rawNodes],
  );

  const history = useMemo(
    () =>
      rawNodes
        .filter((m) => m.lastReadChapter)
        .sort((a, b) => num(b.lastReadChapter?.lastReadAt) - num(a.lastReadChapter?.lastReadAt)),
    [rawNodes],
  );

  return (
    <>
      <PageHeader
        title={
          <>
            <span className="md:hidden"><Brand link compact /></span>
            <span className="hidden md:inline">Library</span>
          </>
        }
        actions={
          <>
            <div className="relative">
              <button
                onClick={() => setSortOpen((v) => !v)}
                aria-label="Sort library"
                title="Sort library"
                className={`grid h-10 w-10 place-items-center rounded-full transition-colors ${
                  sortOpen ? 'bg-white/10 text-white' : 'text-zinc-200 hover:bg-white/5'
                }`}
              >
                <SortIcon className="h-5.5 w-5.5" />
              </button>
              {sortOpen && (
                <>
                  <button
                    aria-hidden="true"
                    tabIndex={-1}
                    onClick={() => setSortOpen(false)}
                    className="fixed inset-0 z-40 cursor-default"
                  />
                  <div className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-xl border border-white/10 bg-surface/98 py-1 shadow-2xl shadow-black/60 backdrop-blur-xl">
                    {SORT_OPTIONS.map((option) => {
                      const active = option.key === sort.key;
                      return (
                        <button
                          key={option.key}
                          onClick={() => applySort(option.key)}
                          className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-white/[0.06] ${
                            active ? 'text-brand-300' : 'text-zinc-300'
                          }`}
                        >
                          <span className="flex-1">{option.label}</span>
                          {active && (
                            <span className="text-xs tabular-nums text-brand-400">
                              {sort.dir === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
            <Link to="/sources" className="grid h-10 w-10 place-items-center rounded-full text-zinc-200 md:hidden" aria-label="Search">
              <SearchIcon className="h-5.5 w-5.5" />
            </Link>
          </>
        }
      >
        <div className="mx-4 mb-3 grid grid-cols-3 overflow-hidden rounded-xl bg-white/[0.05] p-0.5 sm:mx-6">
          <TabButton active={tab === 'library'} onClick={() => setTab('library')}>
            Library
          </TabButton>
          <TabButton active={tab === 'bookmarks'} onClick={() => setTab('bookmarks')}>
            Bookmarks
          </TabButton>
          <TabButton active={tab === 'history'} onClick={() => setTab('history')}>
            History
          </TabButton>
        </div>
        {tab !== 'history' && (
          <div className="mx-4 mb-3 sm:mx-6">
            <label className="relative block">
              <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Filter your library…"
                className="w-full rounded-xl border border-white/[0.09] bg-surface py-2.5 pl-10 pr-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-brand-500/60"
              />
            </label>
          </div>
        )}
      </PageHeader>

      <main className="mx-auto max-w-[1280px] px-4 py-4 sm:px-6 sm:py-6">
        {error && <ErrorState message={`Failed to load library: ${error.message}`} />}
        {!data && fetching && <CoverGridSkeleton />}

        {data && nodes.length === 0 && (
          <EmptyState title="Your library is empty" hint="Head to Browse to add manga from a source." />
        )}

        {data && nodes.length > 0 && tab === 'library' && (
          <div className="space-y-8">
            {reading.length > 0 && (
              <section>
                <SectionHead title="Continue Reading" onViewAll={() => setTab('history')} />
                <ul className="space-y-2">
                  {reading.slice(0, 4).map((m) => (
                    <ContinueRow key={m.id} m={m} />
                  ))}
                </ul>
              </section>
            )}
            <section>
              <SectionHead title="Saved Titles" />
              <ul className={GRID}>
                {nodes.map((m) => (
                  <li key={m.id}>
                    <MangaCard id={m.id} title={m.title} thumbnailUrl={m.thumbnailUrl} unreadCount={m.unreadCount} />
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}

        {tab === 'bookmarks' && <BookmarkedChapters search={search} />}

        {data && tab === 'history' &&
          (history.length > 0 ? (
            <ul className={GRID}>
              {history.map((m) => (
                <li key={m.id}>
                  <MangaCard id={m.id} title={m.title} thumbnailUrl={m.thumbnailUrl} unreadCount={m.unreadCount} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No reading history yet" />
          ))}

      </main>
    </>
  );
}

type LibNode = {
  id: number;
  title: string;
  thumbnailUrl?: string | null;
  unreadCount: number;
  chapters: { totalCount: number };
  firstUnreadChapter?: { id: number; name: string; chapterNumber: number } | null;
};

function ContinueRow({ m }: { m: LibNode }) {
  const total = m.chapters.totalCount;
  const pct = total > 0 ? Math.round(((total - m.unreadCount) / total) * 100) : 0;
  const to = m.firstUnreadChapter ? `/manga/${m.id}/chapter/${m.firstUnreadChapter.id}` : `/manga/${m.id}`;
  return (
    <li>
      <div className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-surface/80 p-2.5 transition-colors hover:border-white/15 hover:bg-raised">
        <Link
          to={`/manga/${m.id}`}
          aria-label={`${m.title} details`}
          className="h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-zinc-800 ring-1 ring-white/5"
        >
          {m.thumbnailUrl && (
            <img src={m.thumbnailUrl} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
          )}
        </Link>
        <Link to={to} className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-zinc-100">{m.title}</p>
          <p className="mt-0.5 truncate text-xs text-zinc-500">
            {m.firstUnreadChapter ? chapterLabel(m.firstUnreadChapter.name, m.firstUnreadChapter.chapterNumber) : ''}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-500 to-magenta-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="shrink-0 text-xs font-medium tabular-nums text-zinc-300">{pct}%</span>
          </div>
        </Link>
        <MoreVerticalIcon className="h-5 w-5 shrink-0 text-zinc-500" />
      </div>
    </li>
  );
}

function SectionHead({ title, onViewAll }: { title: string; onViewAll?: () => void }) {
  return (
    <div className="mb-3 flex items-baseline justify-between">
      <h2 className="text-lg font-semibold tracking-tight text-zinc-100">{title}</h2>
      {onViewAll && (
        <button onClick={onViewAll} className="text-xs font-medium text-brand-400 hover:text-brand-300">
          View All
        </button>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`min-w-0 rounded-[0.65rem] px-1.5 py-2.5 text-[11px] font-medium transition-colors sm:text-sm ${
        active
          ? 'brand-gradient text-on-brand shadow'
          : 'text-zinc-300 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

function BookmarkedChapters({ search }: { search: string }) {
  const context = useMemo(() => ({ additionalTypenames: ['ChapterType'] }), []);
  const [{ data, fetching, error }] = useQuery({
    query: BookmarkedChaptersQuery,
    variables: { first: 500 },
    context,
  });

  const term = search.trim().toLowerCase();
  const chapters = (data?.chapters.nodes ?? []).filter(
    (chapter) =>
      !term ||
      chapter.manga.title.toLowerCase().includes(term) ||
      (chapter.name ?? '').toLowerCase().includes(term),
  );

  const grouped = useMemo(() => {
    const map = new Map<number, { title: string; thumbnailUrl?: string | null; items: typeof chapters }>();
    for (const chapter of chapters) {
      const entry = map.get(chapter.manga.id) ?? {
        title: chapter.manga.title,
        thumbnailUrl: chapter.manga.thumbnailUrl,
        items: [] as typeof chapters,
      };
      entry.items.push(chapter);
      map.set(chapter.manga.id, entry);
    }
    return [...map.entries()];
  }, [chapters]);

  if (error) return <ErrorState message={`Failed to load bookmarks: ${error.message}`} />;
  if (fetching && chapters.length === 0) return <CoverGridSkeleton count={4} />;
  if (grouped.length === 0) {
    return (
      <EmptyState
        title="No bookmarked chapters"
        hint="Tap the bookmark icon while reading to flag a chapter for later."
      />
    );
  }

  return (
    <div className="space-y-6">
      {grouped.map(([mangaId, group]) => (
        <section key={mangaId}>
          <SectionHead title={group.title} />
          <ul className="space-y-2">
            {group.items.map((chapter) => (
              <li key={chapter.id}>
                <Link
                  to={`/manga/${mangaId}/chapter/${chapter.id}`}
                  className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-surface p-2.5 transition-colors hover:border-white/15 hover:bg-raised"
                >
                  <div className="h-16 w-12 shrink-0 overflow-hidden rounded-lg bg-zinc-800">
                    {group.thumbnailUrl && (
                      <img src={group.thumbnailUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-sm ${chapter.isRead ? 'text-zinc-500' : 'text-zinc-100'}`}>
                      {chapterLabel(chapter.name, chapter.chapterNumber)}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {chapter.isRead
                        ? 'Read'
                        : chapter.lastPageRead > 0
                          ? `Resume p${chapter.lastPageRead + 1}`
                          : 'Unread'}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

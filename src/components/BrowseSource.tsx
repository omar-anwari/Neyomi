import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery } from 'urql';
import { SourceInfoQuery, BrowseSourceMutation, SourceFiltersQuery } from '../operations';
import { PageHeader, LoadMoreButton, EmptyState, ErrorState, Skeleton } from './ui';
import { SearchIcon, BookmarkIcon, SlidersIcon, SettingsIcon } from './icons';
import { mangaStatusLabel } from '../format';
import type { FetchSourceMangaType, MangaStatus, FilterChangeInput } from '../gql/graphql';
import { FilterSheet, buildFilterChanges, type AnyFilter, type FilterState } from './SourceFilters';

type BrowseType = FetchSourceMangaType; // 'POPULAR' | 'LATEST' | 'SEARCH'

type ResultManga = {
  id: number;
  title: string;
  thumbnailUrl?: string | null;
  inLibrary: boolean;
  status: MangaStatus;
  genre: string[];
};

export function BrowseSource() {
  const { sourceId } = useParams();
  const source = sourceId ?? '';

  const [{ data: infoData }] = useQuery({
    query: SourceInfoQuery,
    variables: { id: source },
    pause: !source,
  });
  const info = infoData?.source;

  const [type, setType] = useState<BrowseType>('POPULAR');
  const [queryInput, setQueryInput] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');

  const [items, setItems] = useState<ResultManga[]>([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [{ data: filterData, error: filterError }] = useQuery({
    query: SourceFiltersQuery,
    variables: { id: source },
    pause: !source,
  });
  const filters = (filterData?.source.filters ?? []) as unknown as AnyFilter[];

  const [sheetOpen, setSheetOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState<FilterState>({});
  const [appliedFilters, setAppliedFilters] = useState<FilterChangeInput[]>([]);
  const appliedCount = appliedFilters.length;

  const [, browse] = useMutation(BrowseSourceMutation);
  const reqIdRef = useRef(0);

  const loadPage = useCallback(
    async (nextPage: number, reset: boolean) => {
      const reqId = ++reqIdRef.current;
      setFetching(true);
      setError(null);
      const res = await browse({
        source,
        type,
        page: nextPage,
        query: type === 'SEARCH' ? submittedQuery : undefined,
        filters: type === 'SEARCH' && appliedFilters.length > 0 ? appliedFilters : undefined,
      });
      if (reqId !== reqIdRef.current) return;
      setFetching(false);
      if (res.error) {
        setError(res.error.graphQLErrors[0]?.message ?? res.error.message);
        return;
      }
      const payload = res.data?.fetchSourceManga;
      if (!payload) return;
      setHasNext(payload.hasNextPage);
      setPage(nextPage);
      setItems((prev) => {
        const base = reset ? [] : prev;
        const seen = new Set(base.map((m) => m.id));
        return [...base, ...payload.mangas.filter((m) => !seen.has(m.id))];
      });
    },
    [browse, source, type, submittedQuery, appliedFilters],
  );

  useEffect(() => {
    if (!source) return;
    if (type === 'SEARCH' && submittedQuery === '' && appliedFilters.length === 0) return;
    setItems([]);
    loadPage(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, type, submittedQuery, appliedFilters]);

  function selectType(t: BrowseType) {
    setQueryInput('');
    setSubmittedQuery('');
    if (t !== 'SEARCH') setAppliedFilters([]);
    setType(t);
  }

  function applyFilters() {
    setAppliedFilters(buildFilterChanges(filters, draftFilters));
    setSheetOpen(false);
    setType('SEARCH');
  }

  function resetFilters() {
    setDraftFilters({});
    setAppliedFilters([]);
  }

  function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = queryInput.trim();
    if (q === '') {
      selectType('POPULAR');
      return;
    }
    setType('SEARCH');
    setSubmittedQuery(q);
  }

  const isSearchPending = type === 'SEARCH' && submittedQuery === '' && appliedCount === 0;
  const showEmpty = !fetching && items.length === 0 && !error && !isSearchPending;

  return (
    <div className="min-h-dvh">
      <PageHeader
        title={info?.displayName ?? 'Discover'}
        subtitle="Browse & search"
        backTo="/sources"
        actions={
          info?.isConfigurable ? (
            <Link
              to={`/sources/${encodeURIComponent(source)}/settings`}
              aria-label="Source settings"
              title="Source settings"
              className="grid h-10 w-10 place-items-center rounded-full text-zinc-300 hover:bg-white/5"
            >
              <SettingsIcon className="h-5 w-5" />
            </Link>
          ) : undefined
        }
      >
        <div className="space-y-3 px-4 pb-3 sm:px-6">
          <form onSubmit={onSearchSubmit} className="relative">
            <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="search"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="Search manga, author…"
              className={`w-full rounded-full border bg-white/5 py-2.5 pl-10 pr-4 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:bg-zinc-900 ${
                type === 'SEARCH' ? 'border-brand-500/50' : 'border-white/10 focus:border-white/20'
              }`}
            />
          </form>

          <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Pill active={type === 'POPULAR'} onClick={() => selectType('POPULAR')}>
              Popular
            </Pill>
            {info?.supportsLatest && (
              <Pill active={type === 'LATEST'} onClick={() => selectType('LATEST')}>
                Latest
              </Pill>
            )}
            {type === 'SEARCH' && submittedQuery && (
              <Pill active onClick={() => {}}>
                “{submittedQuery}”
              </Pill>
            )}
            {filters.length > 0 && (
              <Pill active={appliedCount > 0} onClick={() => setSheetOpen(true)}>
                <span className="flex items-center gap-1.5">
                  <SlidersIcon className="h-4 w-4" />
                  {appliedCount > 0 ? `Filters · ${appliedCount}` : 'Filters'}
                </span>
              </Pill>
            )}
          </div>
        </div>
      </PageHeader>

      <main className="px-4 py-4 sm:px-6 sm:py-6">
        {error && <ErrorState message={error} />}
        {filterError && (
          <ErrorState message={`Couldn't load this source's filters: ${filterError.message}`} />
        )}

        {isSearchPending && (
          <EmptyState title="Search this source" hint="Type a title and press Enter." />
        )}

        {items.length > 0 && (
          <>
            <h2 className="mb-3 text-lg font-semibold tracking-tight text-zinc-100">
              {type === 'SEARCH' ? 'Results' : type === 'LATEST' ? 'Latest' : 'Popular & Trending'}
            </h2>
            <ul className="space-y-2">
              {items.map((m) => (
                <ResultRow key={m.id} m={m} />
              ))}
            </ul>
          </>
        )}

        {fetching && items.length === 0 && (
          <ul className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <li key={i} className="flex gap-3 rounded-2xl border border-white/5 bg-zinc-900/40 p-3">
                <Skeleton className="h-24 w-16 shrink-0 rounded-lg" />
                <div className="flex-1 space-y-2 py-1">
                  <Skeleton className="h-4 w-3/4 rounded" />
                  <Skeleton className="h-3 w-1/2 rounded" />
                  <Skeleton className="h-3 w-1/3 rounded" />
                </div>
              </li>
            ))}
          </ul>
        )}
        {fetching && items.length > 0 && (
          <p className="mt-6 text-center text-sm text-zinc-500">Loading…</p>
        )}

        {showEmpty && <EmptyState title="No results" />}

        {hasNext && !fetching && <LoadMoreButton onClick={() => loadPage(page + 1, false)} />}
      </main>

      {sheetOpen && (
        <FilterSheet
          filters={filters}
          state={draftFilters}
          onChange={setDraftFilters}
          onApply={applyFilters}
          onReset={resetFilters}
          onClose={() => setSheetOpen(false)}
          busy={fetching}
        />
      )}
    </div>
  );
}

function ResultRow({ m }: { m: ResultManga }) {
  return (
    <li>
      <Link
        to={`/manga/${m.id}`}
        className="flex gap-3 rounded-2xl border border-white/5 bg-zinc-900/40 p-3 transition-colors hover:border-white/10 hover:bg-zinc-900"
      >
        <div className="h-24 w-16 shrink-0 overflow-hidden rounded-lg bg-zinc-800 ring-1 ring-white/5">
          {m.thumbnailUrl && (
            <img src={m.thumbnailUrl} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="line-clamp-2 text-sm font-semibold text-zinc-100">{m.title}</p>
            <BookmarkIcon className={`h-5 w-5 shrink-0 ${m.inLibrary ? 'text-brand-400' : 'text-zinc-600'}`} />
          </div>
          {m.genre.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {m.genre.slice(0, 2).map((g) => (
                <span key={g} className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-zinc-400">
                  {g}
                </span>
              ))}
            </div>
          )}
          {(m.status !== 'UNKNOWN' || m.inLibrary) && (
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
              {m.status !== 'UNKNOWN' && <span>{mangaStatusLabel(m.status)}</span>}
              {m.inLibrary && <span className="font-medium text-brand-400">In library</span>}
            </div>
          )}
        </div>
      </Link>
    </li>
  );
}

function Pill({
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
      className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
        active
          ? 'bg-gradient-to-r from-brand-500 to-magenta-500 text-on-brand shadow'
          : 'border border-white/10 bg-white/5 text-zinc-300 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from 'urql';
import { BrowseSourceMutation, SourcesQuery } from '../operations';
import type { MangaStatus } from '../gql/graphql';
import { mangaStatusLabel } from '../format';
import { BookmarkIcon, MoreVerticalIcon, SearchIcon, SlidersIcon, StarIcon } from './icons';
import { EmptyState, ErrorState, PageHeader, Skeleton } from './ui';

type ResultManga = {
  id: number;
  title: string;
  thumbnailUrl?: string | null;
  inLibrary: boolean;
  status: MangaStatus;
  genre: string[];
  sourceName: string;
};

export function SourcesList() {
  const [{ data: sourceData, fetching: sourceFetching, error: sourceError }] = useQuery({ query: SourcesQuery });
  const sources = useMemo(() => sourceData?.sources.nodes ?? [], [sourceData]);
  const [searchParams, setSearchParams] = useSearchParams();
  const routeQuery = searchParams.get('q') ?? '';
  const [query, setQuery] = useState(routeQuery);
  const [sourceId, setSourceId] = useState('all');
  const [items, setItems] = useState<ResultManga[]>([]);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, browse] = useMutation(BrowseSourceMutation);
  const requestRef = useRef(0);
  const term = query.trim();

  useEffect(() => setQuery(routeQuery), [routeQuery]);

  useEffect(() => {
    function onGlobalSearch(event: Event) {
      setQuery((event as CustomEvent<string>).detail);
    }
    window.addEventListener('suwayomi-global-search', onGlobalSearch);
    return () => window.removeEventListener('suwayomi-global-search', onGlobalSearch);
  }, []);

  const selectedSources = useMemo(
    () => (sourceId === 'all' ? sources : sources.filter((source) => source.id === sourceId)),
    [sourceId, sources],
  );

  useEffect(() => {
    if (term || sources.length === 0) return;
    const source = sourceId === 'all' ? sources[0] : sources.find((item) => item.id === sourceId);
    if (!source) return;

    const requestId = ++requestRef.current;
    setFetching(true);
    setError(null);
    browse({ source: source.id, type: 'POPULAR', page: 1 }).then((result) => {
      if (requestId !== requestRef.current) return;
      setFetching(false);
      if (result.error) {
        setError(result.error.graphQLErrors[0]?.message ?? result.error.message);
        setItems([]);
        return;
      }
      setItems(
        (result.data?.fetchSourceManga?.mangas ?? []).map((manga) => ({
          ...manga,
          sourceName: source.displayName,
        })),
      );
    });
  }, [browse, sourceId, sources, term]);

  useEffect(() => {
    if (!term || selectedSources.length === 0) return;
    const requestId = ++requestRef.current;
    const timer = window.setTimeout(async () => {
      setFetching(true);
      setError(null);

      const found: ResultManga[] = [];
      const failures: string[] = [];

      for (let index = 0; index < selectedSources.length; index += 4) {
        const group = selectedSources.slice(index, index + 4);
        const results = await Promise.all(
          group.map(async (source) => {
            const result = await browse({ source: source.id, type: 'SEARCH', page: 1, query: term });
            return { source, result };
          }),
        );
        if (requestId !== requestRef.current) return;

        for (const { source, result } of results) {
          if (result.error) {
            failures.push(source.displayName);
            continue;
          }
          for (const manga of result.data?.fetchSourceManga?.mangas ?? []) {
            found.push({ ...manga, sourceName: source.displayName });
          }
        }
      }

      if (requestId !== requestRef.current) return;
      const seen = new Set<number>();
      setItems(found.filter((manga) => (seen.has(manga.id) ? false : (seen.add(manga.id), true))));
      setFetching(false);
      setError(
        failures.length === selectedSources.length
          ? 'Search failed for every installed source.'
          : failures.length > 0
            ? `${failures.length} source${failures.length === 1 ? '' : 's'} could not be searched.`
            : null,
      );
    }, 350);

    return () => window.clearTimeout(timer);
  }, [browse, selectedSources, term]);

  function updateQuery(value: string) {
    setQuery(value);
    if (value) setSearchParams({ q: value }, { replace: true });
    else setSearchParams({}, { replace: true });
  }

  const searchingAll = sourceId === 'all';
  const heading = term ? 'Search Results' : 'Popular & Trending';

  return (
    <div className="min-h-dvh">
      <PageHeader title="Discover" />

      <main className="mx-auto max-w-5xl px-4 py-4 sm:px-6 sm:py-6">
        <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
          <section>
            <form onSubmit={(event) => event.preventDefault()}>
              <label className="relative block">
                <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
                <input
                  value={query}
                  onChange={(event) => updateQuery(event.target.value)}
                  placeholder="Search manga, author…"
                  autoFocus
                  className="w-full rounded-xl border border-white/[0.09] bg-surface py-3.5 pl-11 pr-3 text-sm outline-none placeholder:text-zinc-500 focus:border-brand-500/60"
                />
              </label>
            </form>

            <div className="mt-3 rounded-xl border border-white/[0.07] bg-surface p-4">
              <label className="block text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
                Search scope
                <select
                  value={sourceId}
                  onChange={(event) => setSourceId(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-white/[0.08] bg-app px-3 py-2.5 text-sm normal-case tracking-normal text-zinc-200 outline-none focus:border-brand-500/50"
                >
                  <option value="all">All installed sources</option>
                  {sources.map((source) => (
                    <option key={source.id} value={source.id}>
                      {source.displayName}
                    </option>
                  ))}
                </select>
              </label>
              {sourceId !== 'all' && (
                <Link
                  to={`/sources/${encodeURIComponent(sourceId)}`}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-brand-500/40 bg-brand-500/15 px-4 py-2.5 text-sm font-semibold text-brand-300 transition-colors hover:bg-brand-500/25"
                >
                  <SlidersIcon className="h-4 w-4" />
                  Browse this source
                </Link>
              )}
              <p className="mt-3 text-xs leading-5 text-zinc-500">
                {term
                  ? searchingAll
                    ? `Searching ${sources.length} installed source${sources.length === 1 ? '' : 's'} automatically.`
                    : 'Searching the selected source automatically.'
                  : 'Start typing to search. Results update after a short pause.'}
                {sourceId !== 'all' && ' Browse the source directly for its own filters and settings.'}
              </p>
            </div>
          </section>

          <div className="min-w-0 space-y-6">
          {sources.length > 0 && (
            <section>
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h2 className="text-lg font-semibold">Installed sources</h2>
                <span className="text-xs text-zinc-500">{sources.length}</span>
              </div>
              <ul className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {sources.map((source) => (
                  <li key={source.id} className="shrink-0">
                    <Link
                      to={`/sources/${encodeURIComponent(source.id)}`}
                      className="flex w-24 flex-col items-center gap-2 rounded-xl border border-white/[0.07] bg-surface p-3 transition-colors hover:border-white/15 hover:bg-raised"
                    >
                      <span className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-zinc-800">
                        {source.iconUrl && (
                          <img src={source.iconUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                        )}
                      </span>
                      <span className="w-full truncate text-center text-[11px] font-medium text-zinc-300">
                        {source.displayName}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">{heading}</h2>
              <span className="text-xs text-zinc-500" aria-live="polite">
                {fetching ? 'Searching…' : term ? `${items.length} found` : ''}
              </span>
            </div>

            {sourceError && <ErrorState message={sourceError.message} />}
            {error && <ErrorState message={error} />}
            {(sourceFetching || fetching) && items.length === 0 && (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-32 w-full rounded-xl" />
                ))}
              </div>
            )}
            {items.length > 0 && (
              <ol className="space-y-2">
                {items.slice(0, 40).map((manga, index) => (
                  <ResultRow key={manga.id} manga={manga} rank={index + 1} />
                ))}
              </ol>
            )}
            {!sourceFetching && !fetching && !sourceError && sources.length === 0 && (
              <EmptyState title="No sources installed" hint="Install sources in Suwayomi to search for manga." />
            )}
            {!fetching && term && items.length === 0 && sources.length > 0 && !sourceError && !error && (
              <EmptyState title="No global results" hint={`Nothing matched “${term}” in the selected sources.`} />
            )}
          </section>
          </div>
        </div>
      </main>
    </div>
  );
}

function ResultRow({ manga, rank }: { manga: ResultManga; rank: number }) {
  return (
    <li>
      <Link
        to={`/manga/${manga.id}`}
        className="relative flex gap-3 rounded-xl border border-white/[0.08] bg-surface/85 p-2.5 transition hover:border-white/15 hover:bg-raised"
      >
        <span className="absolute left-1 top-1 z-10 rounded-md bg-black/75 px-1.5 py-1 text-[10px] font-semibold text-zinc-200">
          {rank}
        </span>
        <div className="h-28 w-20 shrink-0 overflow-hidden rounded-lg bg-zinc-800">
          {manga.thumbnailUrl && (
            <img src={manga.thumbnailUrl} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
          )}
        </div>
        <div className="min-w-0 flex-1 py-1">
          <div className="flex items-start gap-2">
            <h3 className="line-clamp-2 flex-1 text-sm font-semibold sm:text-base">{manga.title}</h3>
            <BookmarkIcon className={`h-5 w-5 shrink-0 ${manga.inLibrary ? 'text-brand-400' : 'text-zinc-500'}`} />
          </div>
          {manga.genre.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {manga.genre.slice(0, 2).map((genre) => (
                <span key={genre} className="rounded-md bg-brand-500/10 px-2 py-0.5 text-[11px] text-brand-300">
                  {genre}
                </span>
              ))}
            </div>
          )}
          <p className="mt-2 truncate text-xs text-zinc-500">
            {mangaStatusLabel(manga.status)} · {manga.sourceName}
          </p>
          <p className="mt-1 flex items-center gap-1 text-xs text-amber-300">
            <StarIcon className="h-3.5 w-3.5" /> Popular
          </p>
        </div>
        <MoreVerticalIcon className="mt-auto h-5 w-5 shrink-0 text-zinc-500" />
      </Link>
    </li>
  );
}

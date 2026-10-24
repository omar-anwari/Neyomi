import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useClient, useMutation, useQuery } from 'urql';
import {
  MangaDetailQuery,
  MangaChaptersQuery,
  UpdateMangaLibraryMutation,
  UpdateChaptersMutation,
  ChapterIdRangeQuery,
  SetMangaMetaMutation,
  FetchMangaAndChaptersMutation,
} from '../operations';
import { mangaStatusLabel, formatEpochMs, chapterLabel } from '../format';
import { CHAPTER_SORT_META_KEY } from '../readerPrefs';
import { Chip, Skeleton, LoadMoreButton, ErrorState, Spinner } from './ui';
import {
  BookOpenIcon,
  CheckIcon,
  ChevronLeftIcon,
  BookmarkIcon,
  ExternalLinkIcon,
  HomeIcon,
  CompassIcon,
  LibraryIcon,
  SparklesIcon,
  UserIcon,
} from './icons';
import { sourceLinkLabel } from '../format';

const CHAPTER_PAGE = 100;
const CHAPTER_CONTEXT = { additionalTypenames: ['ChapterType'] };
const READ_BUTTON =
  'brand-gradient flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold text-on-brand shadow-lg shadow-brand-500/30 transition hover:brightness-110';

export function MangaDetail() {
  const { id } = useParams();
  return <MangaDetailView key={id} />;
}

function MangaDetailView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const mangaId = Number(id);

  const [{ data, fetching, error }, reexecuteDetail] = useQuery({
    query: MangaDetailQuery,
    variables: { id: mangaId },
    pause: !Number.isFinite(mangaId),
    context: CHAPTER_CONTEXT,
  });
  const manga = data?.manga;

  const [{ data: firstChapterData }] = useQuery({
    query: MangaChaptersQuery,
    variables: { mangaId, first: 1, order: [{ by: 'SOURCE_ORDER', byType: 'ASC' }] },
    pause: !manga || manga.firstUnreadChapter != null,
    context: CHAPTER_CONTEXT,
  });
  const firstChapter = firstChapterData?.chapters.nodes[0];

  const [, fetchMangaChapters] = useMutation(FetchMangaAndChaptersMutation);
  const [initializing, setInitializing] = useState(false);
  const initRef = useRef(false);
  useEffect(() => {
    if (!manga || initRef.current) return;
    if (manga.initialized) {
      initRef.current = true;
      return;
    }
    initRef.current = true;
    setInitializing(true);
    fetchMangaChapters({ id: mangaId }).then(() => {
      setInitializing(false);
      reexecuteDetail({ requestPolicy: 'network-only' });
    });
  }, [manga, mangaId, fetchMangaChapters, reexecuteDetail]);

  const [savedOverride, setSavedOverride] = useState<boolean | null>(null);
  const [, updateLibrary] = useMutation(UpdateMangaLibraryMutation);
  const inLibrary = savedOverride ?? manga?.inLibrary ?? false;
  async function toggleLibrary() {
    if (!manga) return;
    const next = !inLibrary;
    setSavedOverride(next);
    const res = await updateLibrary({ id: mangaId, inLibrary: next });
    if (res.error) setSavedOverride(!next);
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-glass md:block md:h-auto md:min-h-dvh md:overflow-visible">
      <div className="relative min-h-0 flex-1 overflow-y-auto md:min-h-dvh md:flex-none md:overflow-visible">
      <div className="absolute inset-x-0 top-0 hidden h-[62vh] sm:block sm:h-[68vh]">
        {manga?.thumbnailUrl && (
          <img src={manga.thumbnailUrl} alt="" className="h-full w-full object-cover object-top opacity-35 blur-sm" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-glass/40 via-glass/55 to-glass" />
      </div>

      <div className="pt-safe absolute inset-x-0 top-0 z-20">
        <div className="flex h-14 items-center justify-between px-3">
          <button
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="grid h-10 w-10 place-items-center rounded-full bg-black/30 text-white backdrop-blur transition-colors hover:bg-black/50"
          >
            <ChevronLeftIcon className="h-6 w-6" />
          </button>
          <div className="flex items-center gap-1.5">
            {manga?.realUrl && (
              <a
                href={manga.realUrl}
                target="_blank"
                rel="noreferrer noopener"
                aria-label={sourceLinkLabel(manga.source?.displayName)}
                title={sourceLinkLabel(manga.source?.displayName)}
                className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-black/30 text-white backdrop-blur transition-colors hover:bg-black/50"
              >
                <ExternalLinkIcon className="h-5 w-5" />
              </a>
            )}
          </div>
        </div>
      </div>

      {error && <ErrorState message={`Failed to load: ${error.message}`} />}

      <div className="relative z-10 mx-auto max-w-3xl px-4 pt-20 sm:px-6 sm:pt-[34vh]">
        {!manga && fetching && <DetailSkeleton />}

        {manga && (
          <>
            <div className="flex gap-5 sm:gap-6">
              <div className="w-[45%] max-w-48 shrink-0 sm:w-40">
                <div className="aspect-2/3 overflow-hidden rounded-xl bg-zinc-800 shadow-2xl shadow-black/60 ring-1 ring-white/10 sm:rounded-2xl">
                  {manga.thumbnailUrl && (
                    <img
                      src={manga.thumbnailUrl}
                      alt={manga.title}
                      fetchPriority="high"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
              </div>

              <div className="min-w-0 flex-1 pt-3">
                <h1 className="text-[1.65rem] font-black leading-[1.1] tracking-[-0.04em] drop-shadow sm:text-3xl">
                  {manga.title}
                </h1>
                {manga.author && <p className="mt-3 text-sm text-zinc-400">By <span className="text-brand-400">{manga.author}</span></p>}
                {manga.artist && manga.artist !== manga.author && (
                  <p className="text-sm text-zinc-400">Art: {manga.artist}</p>
                )}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {manga.genre.slice(0, 3).map((genre) => <Chip key={genre}>{genre}</Chip>)}
                </div>
                <p className="mt-5 text-xs text-zinc-500">{mangaStatusLabel(manga.status)} · {manga.source?.displayName}</p>
              </div>
            </div>

            <div className="mt-5">
              {manga.firstUnreadChapter ? (
                <Link to={`/manga/${mangaId}/chapter/${manga.firstUnreadChapter.id}`} className={READ_BUTTON}>
                  <BookOpenIcon className="h-5 w-5" />
                  {manga.lastReadChapter ? 'Continue reading' : 'Start reading'}
                </Link>
              ) : firstChapter ? (
                <Link to={`/manga/${mangaId}/chapter/${firstChapter.id}`} className={READ_BUTTON}>
                  <BookOpenIcon className="h-5 w-5" />
                  Read again
                </Link>
              ) : (
                <div className="flex w-full items-center justify-center rounded-xl bg-white/5 px-6 py-3.5 text-sm font-medium text-zinc-500">
                  {firstChapterData && !initializing ? 'No chapters yet' : 'Loading chapters…'}
                </div>
              )}
              <div className="mt-2 flex gap-2">
                <button
                  onClick={toggleLibrary}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                    inLibrary
                      ? 'border-brand-500/40 bg-brand-500/15 text-brand-300'
                      : 'border-white/10 bg-surface text-zinc-300 hover:bg-white/10'
                  }`}
                >
                  <BookmarkIcon className="h-5 w-5" />
                  {inLibrary ? 'Bookmarked' : 'Bookmark'}
                </button>
                {manga.realUrl && (
                  <a
                    href={manga.realUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    title={sourceLinkLabel(manga.source?.displayName)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-surface px-4 py-3 text-sm font-medium text-zinc-300 transition-colors hover:bg-white/10"
                  >
                    <ExternalLinkIcon className="h-5 w-5" />
                    <span className="truncate">{manga.source?.displayName ?? 'Open source'}</span>
                  </a>
                )}
              </div>
            </div>

            {manga.description && (
              <div className="mt-7 border-b border-white/[0.08] pb-5">
                <h2 className="mb-1.5 text-lg font-semibold text-zinc-100">Synopsis</h2>
                <Description text={manga.description} />
              </div>
            )}

            <ChapterList
              mangaId={mangaId}
              initializing={initializing}
              thumbnailUrl={manga.thumbnailUrl}
              storedDesc={
                manga.meta.find((entry) => entry.key === CHAPTER_SORT_META_KEY)?.value !== 'asc'
              }
            />
          </>
        )}
        </div>
      </div>
      <DetailBottomNav />
    </div>
  );
}

function Description({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div>
      <p className={`whitespace-pre-line text-sm leading-relaxed text-zinc-300 ${expanded ? '' : 'line-clamp-3'}`}>
        {text}
      </p>
      <button onClick={() => setExpanded((v) => !v)} className="mt-1 text-sm font-medium text-brand-400 hover:text-brand-300">
        {expanded ? 'Less' : 'More'}
      </button>
    </div>
  );
}

function ChapterList({
  mangaId,
  initializing,
  thumbnailUrl,
  storedDesc,
}: {
  mangaId: number;
  initializing: boolean;
  thumbnailUrl?: string | null;
  storedDesc: boolean;
}) {
  const [limit, setLimit] = useState(CHAPTER_PAGE);
  const [desc, setDesc] = useState(storedDesc);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [, setMangaMeta] = useMutation(SetMangaMetaMutation);

  function toggleSort() {
    const next = !desc;
    setDesc(next);
    void setMangaMeta({
      mangaId,
      key: CHAPTER_SORT_META_KEY,
      value: next ? 'desc' : 'asc',
    });
  }

  const [{ data, fetching, error }] = useQuery({
    query: MangaChaptersQuery,
    variables: {
      mangaId,
      first: limit,
      order: [{ by: 'SOURCE_ORDER', byType: desc ? 'DESC' : 'ASC' }],
      filter: unreadOnly ? { isRead: { equalTo: false } } : undefined,
    },
    context: CHAPTER_CONTEXT,
  });
  const list = data?.chapters;
  const nodes = list?.nodes ?? [];
  const showLoading = initializing || (fetching && nodes.length === 0);

  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const [anchor, setAnchor] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [truncated, setTruncated] = useState(false);
  const [, updateChapters] = useMutation(UpdateChaptersMutation);
  const client = useClient();

  function exitSelection() {
    setSelecting(false);
    setSelected(new Set());
    setAnchor(null);
    setTruncated(false);
  }

  async function extendBy(direction: 'earlier' | 'later') {
    if (selected.size !== 1) return;
    const [only] = [...selected];
    const chapter = nodes.find((c) => c.id === only);
    if (!chapter) return;

    setBusy(true);
    setTruncated(false);
    const filter =
      direction === 'earlier'
        ? { sourceOrder: { lessThan: chapter.sourceOrder } }
        : { sourceOrder: { greaterThan: chapter.sourceOrder } };
    const res = await client.query(ChapterIdRangeQuery, { mangaId, filter }).toPromise();
    setBusy(false);

    const range = res.data?.chapters;
    if (!range) return;
    const ids = range.nodes.map((n) => n.id);
    if (ids.length < range.totalCount) setTruncated(true);
    setSelected((prev) => new Set([...prev, ...ids]));
  }

  function beginSelection(id: number, index: number) {
    setSelecting(true);
    setSelected(new Set([id]));
    setAnchor(index);
  }

  function toggle(id: number, index: number, extend: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (extend && anchor != null) {
        const [from, to] = anchor < index ? [anchor, index] : [index, anchor];
        for (let i = from; i <= to; i += 1) next.add(nodes[i].id);
        return next;
      }
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setAnchor(index);
  }

  async function markSelected(read: boolean) {
    if (selected.size === 0) return;
    setBusy(true);
    const patch = read ? { isRead: true } : { isRead: false, lastPageRead: 0 };
    const res = await updateChapters({ ids: [...selected], patch });
    setBusy(false);
    if (!res.error) exitSelection();
  }

  const allSelected = nodes.length > 0 && selected.size === nodes.length;

  return (
    <section className="mt-5 pb-10">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-zinc-100">
          Chapters {list && list.totalCount > 0 && <span className="text-zinc-600">· {list.totalCount}</span>}
        </h2>
        <div className="flex shrink-0 items-center gap-1.5">
          {selecting ? (
            <>
              <button
                onClick={() => (allSelected ? setSelected(new Set()) : setSelected(new Set(nodes.map((c) => c.id))))}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/10"
              >
                {allSelected ? 'None' : 'All'}
              </button>
              <button
                onClick={exitSelection}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/10"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              {nodes.length > 0 && (
                <button
                  onClick={() => setSelecting(true)}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/10"
                >
                  Select
                </button>
              )}
              <button
                onClick={() => setUnreadOnly((v) => !v)}
                title={unreadOnly ? 'Showing unread only' : 'Show every chapter'}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  unreadOnly
                    ? 'border-brand-500/40 bg-brand-500/15 text-brand-300'
                    : 'border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10'
                }`}
              >
                Unread
              </button>
              <button
                onClick={toggleSort}
                title={desc ? 'Newest first' : 'Oldest first'}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/10"
              >
                {desc ? 'Newest' : 'Oldest'}
              </button>
            </>
          )}
        </div>
      </div>

      {error && <ErrorState message={`Failed to load chapters: ${error.message}`} />}

      {nodes.length > 0 && (
        <ul className="space-y-2">
          {nodes.map((chapter, index) => (
            <li key={chapter.id}>
              <ChapterRow
                mangaId={mangaId}
                chapter={chapter}
                thumbnailUrl={thumbnailUrl}
                selecting={selecting}
                checked={selected.has(chapter.id)}
                onLongPress={() => beginSelection(chapter.id, index)}
                onToggle={(extend) => toggle(chapter.id, index, extend)}
              />
            </li>
          ))}
        </ul>
      )}

      {showLoading && (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      )}

      {!showLoading && list && nodes.length === 0 && (
        <p className="rounded-2xl border border-white/5 bg-zinc-900/40 px-4 py-6 text-center text-sm text-zinc-500">
          No chapters found.
        </p>
      )}

      {list?.pageInfo.hasNextPage && (
        <LoadMoreButton onClick={() => setLimit((l) => l + CHAPTER_PAGE)} loading={fetching} />
      )}

      {selecting && (
        <div className="pb-safe fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-glass/95 px-4 py-3 backdrop-blur-xl">
          {selected.size === 1 && (
            <div className="mx-auto mb-2 flex max-w-3xl items-center gap-2">
              <span className="shrink-0 text-xs text-zinc-500">Also select</span>
              <button
                onClick={() => extendBy('earlier')}
                disabled={busy}
                title="Every chapter earlier in the series"
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/10 disabled:opacity-40"
              >
                Earlier chapters
              </button>
              <button
                onClick={() => extendBy('later')}
                disabled={busy}
                title="Every chapter later in the series"
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/10 disabled:opacity-40"
              >
                Later chapters
              </button>
            </div>
          )}
          {truncated && (
            <p className="mx-auto mb-2 max-w-3xl text-xs text-amber-300">
              The server returned fewer chapters than it reported — the range may be incomplete.
            </p>
          )}
          <div className="mx-auto flex max-w-3xl items-center gap-2">
            <span className="shrink-0 text-sm font-medium text-zinc-300">
              {selected.size} selected
            </span>
            <div className="ml-auto flex shrink-0 items-center gap-2">
              {busy && <Spinner className="h-4 w-4" />}
              <button
                onClick={() => markSelected(true)}
                disabled={selected.size === 0 || busy}
                className="rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-on-brand disabled:opacity-40"
              >
                Mark read
              </button>
              <button
                onClick={() => markSelected(false)}
                disabled={selected.size === 0 || busy}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-200 disabled:opacity-40"
              >
                Mark unread
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

const LONG_PRESS_MS = 450;

function ChapterRow({
  mangaId,
  chapter,
  thumbnailUrl,
  selecting,
  checked,
  onLongPress,
  onToggle,
}: {
  mangaId: number;
  chapter: {
    id: number;
    name: string;
    chapterNumber: number;
    isRead: boolean;
    isBookmarked: boolean;
    pageCount: number;
    scanlator?: string | null;
    uploadDate: string;
    lastPageRead: number;
  };
  thumbnailUrl?: string | null;
  selecting: boolean;
  checked: boolean;
  onLongPress: () => void;
  onToggle: (extend: boolean) => void;
}) {
  const timer = useRef<number | null>(null);
  const fired = useRef(false);

  function clear() {
    if (timer.current != null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }

  function onPointerDown() {
    if (selecting) return;
    fired.current = false;
    clear();
    timer.current = window.setTimeout(() => {
      fired.current = true;
      onLongPress();
    }, LONG_PRESS_MS);
  }

  useEffect(() => clear, []);

  const body = (
    <>
      <div className="h-14 w-11 shrink-0 overflow-hidden rounded-md bg-zinc-800">
        {thumbnailUrl && <img src={thumbnailUrl} alt="" className="h-full w-full object-cover" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm ${chapter.isRead ? 'text-zinc-500' : 'text-zinc-100'}`}>
          {chapterLabel(chapter.name, chapter.chapterNumber)}
        </p>
        <p className="mt-1 flex flex-wrap gap-x-2 text-xs text-zinc-500">
          {formatEpochMs(chapter.uploadDate) && <span>{formatEpochMs(chapter.uploadDate)}</span>}
          {chapter.scanlator && <span className="truncate">· {chapter.scanlator}</span>}
          {chapter.pageCount > 0 && <span>· {chapter.pageCount}p</span>}
          {!chapter.isRead && chapter.lastPageRead > 0 && (
            <span className="text-brand-400">· resume p{chapter.lastPageRead + 1}</span>
          )}
        </p>
      </div>
    </>
  );

  const shell = `flex w-full items-center gap-3 rounded-xl border p-2 text-left transition-colors ${
    checked
      ? 'border-brand-500/50 bg-brand-500/10'
      : 'border-white/[0.07] bg-surface hover:bg-white/5 active:bg-white/10'
  }`;

  if (selecting) {
    return (
      <button
        type="button"
        onClick={(event) => onToggle(event.shiftKey)}
        aria-pressed={checked}
        className={shell}
      >
        <Checkbox checked={checked} />
        {body}
      </button>
    );
  }

  return (
    <Link
      to={`/manga/${mangaId}/chapter/${chapter.id}`}
      onPointerDown={onPointerDown}
      onPointerUp={clear}
      onPointerLeave={clear}
      onPointerCancel={clear}
      onContextMenu={(event) => event.preventDefault()}
      onClick={(event) => {
        if (fired.current) {
          event.preventDefault();
          fired.current = false;
        }
      }}
      className={shell}
    >
      {body}
      <div className="flex shrink-0 items-center gap-2">
        {chapter.isBookmarked && <BookmarkIcon className="h-4 w-4 text-amber-400" />}
        <ChevronLeftIcon className="h-5 w-5 rotate-180 text-zinc-600" />
      </div>
    </Link>
  );
}

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <span
      className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-colors ${
        checked ? 'border-brand-400 bg-brand-500' : 'border-white/20 bg-white/5'
      }`}
    >
      {checked && <CheckIcon className="h-3.5 w-3.5 text-on-brand" />}
    </span>
  );
}

function DetailBottomNav() {
  const items = [
    { to: '/', label: 'Home', Icon: HomeIcon },
    { to: '/updates', label: 'Updates', Icon: SparklesIcon },
    { to: '/sources', label: 'Discover', Icon: CompassIcon },
    { to: '/library', label: 'Library', Icon: LibraryIcon },
    { to: '/settings', label: 'Profile', Icon: UserIcon },
  ];
  return (
    <nav className="pb-safe shrink-0 border-t border-white/[0.07] bg-glass/95 backdrop-blur-xl md:hidden">
      <div className="flex h-[4.25rem]">
        {items.map(({ to, label, Icon }) => (
          <Link key={to} to={to} className={`flex flex-1 flex-col items-center justify-center gap-0.5 ${to === '/library' ? 'text-brand-400' : 'text-zinc-500'}`}>
            <Icon className="h-5.5 w-5.5" />
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex gap-4 sm:gap-6">
      <Skeleton className="aspect-2/3 w-28 rounded-2xl sm:w-40" />
      <div className="flex-1 space-y-3 pt-2">
        <Skeleton className="h-7 w-3/4 rounded" />
        <Skeleton className="h-4 w-1/2 rounded" />
        <Skeleton className="h-6 w-2/3 rounded-full" />
      </div>
    </div>
  );
}

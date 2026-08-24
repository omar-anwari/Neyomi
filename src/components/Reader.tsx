import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from 'urql';
import {
  ReaderChapterQuery,
  NextChapterQuery,
  FetchChapterPagesMutation,
  UpdateChapterProgressMutation,
  SetMangaMetaMutation,
  UpdateChapterBookmarkMutation,
} from '../operations';
import { loadPrefs, savePrefs, type FitMode, type ReadingMode } from '../readerPrefs';
import { READING_MODE_META_KEY, isReadingMode } from '../readerPrefs';
import { BookmarkIcon, ExternalLinkIcon, MoreVerticalIcon, SettingsIcon, ChevronLeftIcon } from './icons';
import { sourceLinkLabel } from '../format';
import { Spinner } from './ui';
import { SIDE_ZONE, useWebtoonZoom, useZoomPan, type TapZone } from './zoomPan';

const PRELOAD_CONCURRENCY = 4;
const PROGRESS_DEBOUNCE_MS = 400;
const TAP_HINT_MS = 2300;

const FIT_CLASS: Record<FitMode, string> = {
  width: 'w-full h-auto',
  height: 'h-[100dvh] w-auto max-w-none',
  original: 'w-auto h-auto max-w-none',
};

const MODE_OPTIONS: [ReadingMode, string][] = [
  ['ltr', 'L → R'],
  ['rtl', 'R → L'],
  ['webtoon', 'Webtoon'],
];
const FIT_OPTIONS: [FitMode, string][] = [
  ['width', 'Width'],
  ['height', 'Height'],
  ['original', 'Original'],
];

function usePagePreloader(pages: string[]): number {
  const [loaded, setLoaded] = useState(0);
  useEffect(() => {
    setLoaded(0);
    if (pages.length === 0) return;
    let cancelled = false;
    let next = 0;
    let active = 0;
    const pump = () => {
      while (!cancelled && active < PRELOAD_CONCURRENCY && next < pages.length) {
        const img = new Image();
        active += 1;
        next += 1;
        const done = () => {
          if (cancelled) return;
          active -= 1;
          setLoaded((n) => n + 1);
          pump();
        };
        img.onload = done;
        img.onerror = done;
        img.src = pages[next - 1];
      }
    };
    pump();
    return () => {
      cancelled = true;
    };
  }, [pages]);
  return loaded;
}

export function Reader() {
  const { chapterId } = useParams();
  return <ReaderView key={chapterId} />;
}

function ReaderView() {
  const { mangaId, chapterId: chapterIdParam } = useParams();
  const chapterId = Number(chapterIdParam);
  const navigate = useNavigate();
  const location = useLocation();
  const arrivedAtEnd = (location.state as { atEnd?: boolean } | null)?.atEnd === true;

  const [prefs, setPrefs] = useState(loadPrefs);
  const setFit = (fit: FitMode) => setPrefs((p) => ({ ...p, fit }));
  useEffect(() => savePrefs(prefs), [prefs]);

  const [modeOverride, setModeOverride] = useState<ReadingMode | null>(null);
  const [, setMangaMeta] = useMutation(SetMangaMetaMutation);
  const [, setChapterBookmark] = useMutation(UpdateChapterBookmarkMutation);
  const [bookmarked, setBookmarked] = useState<boolean | null>(null);
  const mode = modeOverride ?? prefs.mode;

  const [uiVisible, setUiVisible] = useState(true);
  const toggleUi = useCallback(() => setUiVisible((v) => !v), []);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [{ data: chapterData }] = useQuery({
    query: ReaderChapterQuery,
    variables: { id: chapterId },
    pause: !Number.isFinite(chapterId),
  });
  const chapter = chapterData?.chapter;
  const metaMode = chapter?.manga.meta.find((entry) => entry.key === READING_MODE_META_KEY)?.value;

  useEffect(() => {
    setModeOverride(isReadingMode(metaMode) ? metaMode : null);
  }, [metaMode, chapter?.manga.id]);

  useEffect(() => {
    setBookmarked(chapter?.isBookmarked ?? null);
  }, [chapter?.id, chapter?.isBookmarked]);

  const toggleBookmark = useCallback(() => {
    if (!chapter) return;
    const next = !(bookmarked ?? chapter.isBookmarked);
    setBookmarked(next);
    void setChapterBookmark({ id: chapter.id, isBookmarked: next });
  }, [chapter, bookmarked, setChapterBookmark]);

  const setMode = useCallback(
    (next: ReadingMode) => {
      setModeOverride(next);
      const id = chapter?.manga.id;
      if (id == null) return;
      void setMangaMeta({ mangaId: id, key: READING_MODE_META_KEY, value: next });
    },
    [chapter?.manga.id, setMangaMeta],
  );

  const [{ data: nextData }] = useQuery({
    query: NextChapterQuery,
    variables: {
      mangaId: chapter?.mangaId ?? 0,
      sourceOrder: (chapter?.sourceOrder ?? -1) + 1,
    },
    pause: !chapter,
  });
  const nextChapter = nextData?.chapters.nodes[0] ?? null;

  const [{ data: prevData }] = useQuery({
    query: NextChapterQuery,
    variables: {
      mangaId: chapter?.mangaId ?? 0,
      sourceOrder: (chapter?.sourceOrder ?? 0) - 1,
    },
    pause: !chapter || chapter.sourceOrder <= 0,
  });
  const prevChapter = prevData?.chapters.nodes[0] ?? null;

  const [, fetchPages] = useMutation(FetchChapterPagesMutation);
  const [pages, setPages] = useState<string[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [refreshKey, setrefreshKey] = useState(0);
  const retryPages = useCallback(() => setrefreshKey((n) => n + 1), []);

  useEffect(() => {
    if (!Number.isFinite(chapterId)) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setPages([]);
    fetchPages({ chapterId }).then((res) => {
      if (cancelled) return;
      if (res.error) setLoadError(res.error.message);
      else setPages(res.data?.fetchChapterPages?.pages ?? []);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterId, refreshKey]);

  const [currentPage, setCurrentPage] = useState(0);
  const initialisedRef = useRef(false);
  useEffect(() => {
    if (initialisedRef.current || !chapter || pages.length === 0) return;
    initialisedRef.current = true;
    const savedPage = arrivedAtEnd
      ? pages.length - 1
      : prefs.rememberLastChapter
        ? chapter.lastPageRead
        : 0;
    setCurrentPage(Math.min(Math.max(savedPage, 0), pages.length - 1));
  }, [chapter, pages.length, prefs.rememberLastChapter, arrivedAtEnd]);

  const [, updateProgress] = useMutation(UpdateChapterProgressMutation);
  const lastSentRef = useRef<number>(-1);
  const timerRef = useRef<number | undefined>(undefined);
  const currentPageRef = useRef(0);
  currentPageRef.current = currentPage;

  const send = useCallback(
    (page: number, pageTotal: number) => {
      lastSentRef.current = page;
      const patch: { lastPageRead: number; isRead?: boolean } = { lastPageRead: page };
      if (pageTotal > 0 && page >= pageTotal - 1) patch.isRead = true;
      updateProgress({ id: chapterId, patch });
    },
    [chapterId, updateProgress],
  );

  useEffect(() => {
    if (!initialisedRef.current || pages.length === 0) return;
    const page = Math.min(currentPage, pages.length - 1);
    if (page === lastSentRef.current) return;
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => send(page, pages.length), PROGRESS_DEBOUNCE_MS);
  }, [currentPage, pages.length, send]);

  useEffect(() => {
    return () => {
      window.clearTimeout(timerRef.current);
      const page = Math.min(currentPageRef.current, pages.length - 1);
      if (pages.length > 0 && page !== lastSentRef.current && initialisedRef.current) {
        send(page, pages.length);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages.length]);

  const total = pages.length;
  const goNextChapter = useCallback(() => {
    if (nextChapter && chapter) {
      navigate(`/manga/${chapter.mangaId}/chapter/${nextChapter.id}`, { replace: true });
    }
  }, [nextChapter, chapter, navigate]);

  const goForward = useCallback(() => {
    if (currentPageRef.current >= total) goNextChapter();
    else setCurrentPage((p) => Math.min(p + 1, total));
  }, [total, goNextChapter]);
  const goPrevChapter = useCallback(() => {
    if (!prevChapter || !chapter) return;
    navigate(`/manga/${chapter.mangaId}/chapter/${prevChapter.id}`, {
      replace: true,
      state: { atEnd: true },
    });
  }, [prevChapter, chapter, navigate]);

  const goBackward = useCallback(() => {
    if (currentPageRef.current <= 0) {
      goPrevChapter();
      return;
    }
    setCurrentPage((p) => Math.max(p - 1, 0));
  }, [goPrevChapter]);
  const exit = useCallback(() => {
    if (window.history.length > 1) navigate(-1);
    else navigate(`/manga/${mangaId}`, { replace: true });
  }, [navigate, mangaId]);
  const toDetail = useCallback(() => navigate(`/manga/${mangaId}`, { replace: true }), [navigate, mangaId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') return exit();
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'SELECT' || tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return;
      if (mode === 'webtoon') return;
      switch (e.key) {
        case 'ArrowRight':
          mode === 'rtl' ? goBackward() : goForward();
          break;
        case 'ArrowLeft':
          mode === 'rtl' ? goForward() : goBackward();
          break;
        case ' ':
        case 'PageDown':
        case 'ArrowDown':
          e.preventDefault();
          goForward();
          break;
        case 'PageUp':
        case 'ArrowUp':
          e.preventDefault();
          goBackward();
          break;
        case 'Home':
          setCurrentPage(0);
          break;
        case 'End':
          setCurrentPage(total - 1);
          break;
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, goForward, goBackward, exit, total]);

  const loadedCount = usePagePreloader(pages);
  const loadPct = total > 0 ? Math.round((loadedCount / total) * 100) : 0;

  const ready = !loading && !loadError && total > 0;
  const [hintVisible, setHintVisible] = useState(false);
  const hintShownRef = useRef(false);
  useEffect(() => {
    if (hintShownRef.current || !ready || !prefs.showTapZoneHint) return;
    hintShownRef.current = true;
    setHintVisible(true);
    const timer = window.setTimeout(() => setHintVisible(false), TAP_HINT_MS);
    return () => window.clearTimeout(timer);
  }, [ready, prefs.showTapZoneHint]);

  return (
    <div
      className={`relative h-[100dvh] w-screen overflow-hidden text-zinc-100 ${
        prefs.theme === 'light'
          ? 'bg-white'
          : prefs.theme === 'system'
            ? 'bg-white dark:bg-black'
            : 'bg-black'
      }`}
    >
      {uiVisible && (
        <>
          <Toolbar
            title={chapter?.manga.title}
            subtitle={prefs.showChapterSubtitle ? chapter?.name : undefined}
            sourceUrl={chapter?.realUrl ?? chapter?.manga.realUrl ?? undefined}
            sourceName={chapter?.manga.source?.displayName}
            bookmarked={bookmarked ?? chapter?.isBookmarked ?? false}
            onToggleBookmark={toggleBookmark}
            loadPct={total > 0 ? loadPct : undefined}
            prefs={{ ...prefs, mode }}
            onFit={setFit}
            onMode={setMode}
            onExit={exit}
            open={settingsOpen}
            onToggleSettings={() => setSettingsOpen((v) => !v)}
          />
          {total > 0 && loadedCount < total && (
            <div className="pointer-events-none absolute inset-x-0 top-14 z-30 h-0.5 bg-white/10">
              <div
                className="h-full bg-brand-500 transition-[width] duration-200"
                style={{ width: `${loadPct}%` }}
              />
            </div>
          )}
        </>
      )}

      {loadError && (
        <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="max-w-sm text-sm text-red-400">Failed to load pages: {loadError}</p>
          <div className="flex gap-2">
            <button
              onClick={retryPages}
              className="rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-on-brand"
            >
              Try again
            </button>
            <button
              onClick={toDetail}
              className="rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-zinc-200"
            >
              Back to chapters
            </button>
          </div>
        </div>
      )}

      {!loadError && loading && (
        <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-zinc-500">
          <Spinner className="h-6 w-6" />
          Loading pages…
        </div>
      )}

      {!loadError && !loading && total > 0 && (
        <div className="h-full" style={{ filter: `brightness(${prefs.brightness}%)` }}>
          {mode === 'webtoon' ? (
            <WebtoonViewer
              pages={pages}
              fit={prefs.fit}
              initialPage={currentPage}
              onPageChange={setCurrentPage}
              onToggleUi={toggleUi}
              endPanel={<EndPanel next={nextChapter} onNext={goNextChapter} onExit={toDetail} />}
            />
          ) : currentPage >= total ? (
            <div className="flex h-full items-center justify-center">
              <EndPanel next={nextChapter} onNext={goNextChapter} onExit={toDetail} />
            </div>
          ) : (
            <PagedViewer
              src={pages[currentPage]}
              fit={prefs.fit}
              mode={mode}
              onForward={goForward}
              onBackward={goBackward}
              onToggleUi={toggleUi}
            />
          )}
        </div>
      )}

      {uiVisible && !loadError && !loading && total > 0 && mode !== 'webtoon' && (
        <div className="pb-safe absolute inset-x-0 bottom-0 z-40 border-t border-white/5 bg-black/70 backdrop-blur-xl">
          {prefs.showProgressBar && (
            <div className="px-5 pt-3">
              <p className="mb-2 text-center text-xs font-medium tabular-nums text-zinc-400">
                {Math.min(currentPage, total - 1) + 1} / {total}
              </p>
              <input
                type="range"
                min={0}
                max={Math.max(total - 1, 0)}
                value={Math.min(currentPage, total - 1)}
                onChange={(e) => setCurrentPage(Number(e.target.value))}
                className="manga-range w-full cursor-pointer"
                style={{ '--range-progress': `${total > 1 ? (Math.min(currentPage, total - 1) / (total - 1)) * 100 : 0}%` } as React.CSSProperties}
                aria-label="Page"
              />
            </div>
          )}
          <div className="grid grid-cols-3 pb-1 pt-3">
            <button
              onClick={goBackward}
              disabled={currentPage <= 0 && !prevChapter}
              title={currentPage <= 0 && prevChapter ? 'Previous chapter' : 'Previous page'}
              className="flex flex-col items-center gap-1 py-1 text-zinc-300 transition-colors hover:text-white disabled:opacity-30"
            >
              <ChevronLeftIcon className="h-6 w-6" />
              <span className="text-[11px] font-medium">
                {currentPage <= 0 && prevChapter ? 'Prev chapter' : 'Previous'}
              </span>
            </button>
            <button
              onClick={() => setSettingsOpen((v) => !v)}
              className={`flex flex-col items-center gap-1 py-1 transition-colors ${
                settingsOpen ? 'text-brand-400' : 'text-zinc-300 hover:text-white'
              }`}
            >
              <SettingsIcon className="h-6 w-6" />
              <span className="text-[11px] font-medium">Settings</span>
            </button>
            <button onClick={goForward} className="flex flex-col items-center gap-1 py-1 text-zinc-300 transition-colors hover:text-white">
              <ChevronLeftIcon className="h-6 w-6 rotate-180" />
              <span className="text-[11px] font-medium">Next</span>
            </button>
          </div>
        </div>
      )}

      {hintVisible && <TapZoneHint mode={mode} />}
    </div>
  );
}

function TapZoneHint({ mode }: { mode: ReadingMode }) {
  const sideWidth = `${SIDE_ZONE * 100}%`;
  const zones =
    mode === 'webtoon'
      ? [{ key: 'center', label: 'Controls', hint: 'Tap', width: '100%', icon: <SettingsIcon className="h-7 w-7" /> }]
      : [
          {
            key: 'left',
            label: mode === 'rtl' ? 'Next' : 'Previous',
            hint: 'Tap',
            width: sideWidth,
            icon: <ChevronLeftIcon className="h-7 w-7" />,
          },
          {
            key: 'center',
            label: 'Controls',
            hint: 'Tap',
            width: `${(1 - SIDE_ZONE * 2) * 100}%`,
            icon: <SettingsIcon className="h-7 w-7" />,
          },
          {
            key: 'right',
            label: mode === 'rtl' ? 'Previous' : 'Next',
            hint: 'Tap',
            width: sideWidth,
            icon: <ChevronLeftIcon className="h-7 w-7 rotate-180" />,
          },
        ];

  return (
    <div className="reader-hint pointer-events-none absolute inset-0 z-50 select-none">
      <div className="flex h-full w-full bg-black/55 backdrop-blur-[2px]">
        {zones.map((zone, i) => (
          <div
            key={zone.key}
            style={{ width: zone.width }}
            className={`flex h-full flex-col items-center justify-center gap-2 ${
              i > 0 ? 'border-l border-dashed border-white/25' : ''
            }`}
          >
            <div className="grid h-14 w-14 place-items-center rounded-full border border-white/20 bg-white/10 text-white">
              {zone.icon}
            </div>
            <p className="text-sm font-semibold text-white">{zone.label}</p>
            <p className="text-[11px] uppercase tracking-widest text-zinc-400">{zone.hint}</p>
          </div>
        ))}
      </div>
      <p className="absolute inset-x-0 bottom-24 text-center text-xs text-zinc-300">
        Double-tap or pinch to zoom · drag to pan
      </p>
    </div>
  );
}

function PagedViewer({
  src,
  fit,
  mode,
  onForward,
  onBackward,
  onToggleUi,
}: {
  src: string;
  fit: FitMode;
  mode: ReadingMode;
  onForward: () => void;
  onBackward: () => void;
  onToggleUi: () => void;
}) {
  const onZoneTap = useCallback(
    (zone: TapZone) => {
      if (zone === 'center') onToggleUi();
      else if (zone === 'left') (mode === 'rtl' ? onForward : onBackward)();
      else (mode === 'rtl' ? onBackward : onForward)();
    },
    [mode, onForward, onBackward, onToggleUi],
  );

  const { containerRef, contentRef, contentStyle, containerProps, scale } = useZoomPan({
    splitZones: true,
    onZoneTap,
    resetKey: `${src}|${fit}`,
  });

  return (
    <div
      ref={containerRef}
      {...containerProps}
      className={`flex h-full items-start justify-center overflow-hidden ${
        scale > 1 ? 'cursor-grab active:cursor-grabbing' : ''
      }`}
    >
      <img
        ref={contentRef}
        src={src}
        alt=""
        style={contentStyle}
        className={`${FIT_CLASS[fit]} my-auto select-none`}
        draggable={false}
      />
    </div>
  );
}

function WebtoonViewer({
  pages,
  fit,
  initialPage,
  onPageChange,
  onToggleUi,
  endPanel,
}: {
  pages: string[];
  fit: FitMode;
  initialPage: number;
  onPageChange: (page: number) => void;
  onToggleUi: () => void;
  endPanel: ReactNode;
}) {
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const scrolledRef = useRef(false);
  const { containerRef, containerProps, scale } = useWebtoonZoom({ onTap: onToggleUi });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ratios = new Map<number, number>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const idx = Number((e.target as HTMLElement).dataset.index);
          ratios.set(idx, e.intersectionRatio);
        }
        let best = -1;
        let bestRatio = -1;
        ratios.forEach((r, idx) => {
          if (r > bestRatio) {
            bestRatio = r;
            best = idx;
          }
        });
        if (best >= 0) onPageChange(best);
      },
      { root: container, threshold: [0.25, 0.5, 0.75] },
    );
    pageRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [pages.length, onPageChange]);

  useEffect(() => {
    if (scrolledRef.current || initialPage <= 0) return;
    scrolledRef.current = true;
    pageRefs.current[initialPage]?.scrollIntoView();
  }, [initialPage]);

  return (
    <div
      ref={containerRef}
      {...containerProps}
      className={`h-full overflow-auto ${scale > 1 ? 'cursor-grab active:cursor-grabbing' : ''}`}
    >
      <div style={{ width: '100%', transform: `scale(${scale})`, transformOrigin: '0 0' }}>
        <div className="mx-auto flex max-w-3xl flex-col">
          {pages.map((src, i) => (
            <div key={i} data-index={i} ref={(el) => { pageRefs.current[i] = el; }}>
              <img
                src={src}
                alt=""
                loading="lazy"
                className={`${fit === 'width' ? 'w-full' : FIT_CLASS[fit]} mx-auto select-none`}
                draggable={false}
              />
            </div>
          ))}
          {endPanel}
        </div>
      </div>
    </div>
  );
}

function EndPanel({
  next,
  onNext,
  onExit,
}: {
  next: { name: string; chapterNumber: number } | null;
  onNext: () => void;
  onExit: () => void;
}) {
  return (
    <div
      className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center"
      onClick={(e) => e.stopPropagation()}
    >
      <p className="text-sm text-zinc-500">End of chapter</p>
      {next ? (
        <button
          onClick={onNext}
          className="rounded-xl bg-gradient-to-r from-brand-500 to-magenta-500 px-6 py-3 text-sm font-semibold text-on-brand shadow-lg shadow-brand-500/25 transition hover:brightness-110"
        >
          Next: {next.name || `Chapter ${next.chapterNumber}`} →
        </button>
      ) : (
        <>
          <p className="text-zinc-300">You're all caught up.</p>
          <button
            onClick={onExit}
            className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm text-zinc-200 hover:bg-white/10"
          >
            Back to details
          </button>
        </>
      )}
    </div>
  );
}

function Toolbar({
  title,
  subtitle,
  sourceUrl,
  sourceName,
  bookmarked,
  onToggleBookmark,
  loadPct,
  prefs,
  onFit,
  onMode,
  onExit,
  open,
  onToggleSettings,
}: {
  title?: string;
  subtitle?: string;
  sourceUrl?: string;
  sourceName?: string | null;
  bookmarked: boolean;
  onToggleBookmark: () => void;
  loadPct?: number;
  prefs: { fit: FitMode; mode: ReadingMode };
  onFit: (f: FitMode) => void;
  onMode: (m: ReadingMode) => void;
  onExit: () => void;
  open: boolean;
  onToggleSettings: () => void;
}) {
  return (
    <div className="pt-safe absolute inset-x-0 top-0 z-40">
      <div className="flex h-16 items-center gap-2 border-b border-white/5 bg-black/80 px-2 backdrop-blur-xl">
        <button
          onClick={onExit}
          className="grid h-10 w-10 place-items-center rounded-full text-zinc-300 hover:bg-white/10"
          title="Back (Esc)"
        >
          <ChevronLeftIcon className="h-6 w-6 -rotate-90" />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-sm font-semibold text-zinc-100">{subtitle || title || '…'}</p>
          {subtitle && title && <p className="truncate text-[11px] text-zinc-500">{title}</p>}
        </div>
        {loadPct != null && loadPct < 100 && (
          <span className="tabular-nums text-xs text-zinc-500" title="Pages buffered">
            {loadPct}%
          </span>
        )}
        {sourceUrl && (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noreferrer noopener"
            aria-label={sourceLinkLabel(sourceName)}
            title={sourceLinkLabel(sourceName)}
            className="grid h-10 w-10 place-items-center rounded-full text-zinc-300 hover:bg-white/10"
          >
            <ExternalLinkIcon className="h-5.5 w-5.5" />
          </a>
        )}
        <button
          onClick={onToggleBookmark}
          aria-pressed={bookmarked}
          aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark this chapter'}
          title={bookmarked ? 'Remove bookmark' : 'Bookmark this chapter'}
          className={`grid h-10 w-10 place-items-center rounded-full transition-colors ${
            bookmarked ? 'text-amber-400 hover:bg-white/10' : 'text-zinc-300 hover:bg-white/10'
          }`}
        >
          <BookmarkIcon className="h-5.5 w-5.5" />
        </button>
        <button
          onClick={onToggleSettings}
          className={`grid h-10 w-10 place-items-center rounded-full ${
            open ? 'bg-white/10 text-white' : 'text-zinc-300 hover:bg-white/10'
          }`}
          title="Reader menu"
        >
          <MoreVerticalIcon className="h-5.5 w-5.5" />
        </button>
      </div>

      {open && (
        <div className="absolute right-2 top-[calc(4rem+env(safe-area-inset-top))] w-72 rounded-2xl border border-white/10 bg-surface/98 p-4 shadow-2xl shadow-black/60 backdrop-blur-xl">
          <p className="px-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Reading mode
          </p>
          <Segmented value={prefs.mode} options={MODE_OPTIONS} onChange={onMode} />
          <p className="mt-3 px-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Fit
          </p>
          <Segmented value={prefs.fit} options={FIT_OPTIONS} onChange={onFit} />
        </div>
      )}
    </div>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: [T, string][];
  onChange: (v: T) => void;
}) {
  return (
    <div className="mt-1.5 grid grid-cols-3 gap-1 rounded-xl bg-white/5 p-1">
      {options.map(([v, label]) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`rounded-lg px-1 py-1.5 text-xs font-medium transition-colors ${
            value === v
              ? 'bg-gradient-to-r from-brand-500 to-magenta-500 text-on-brand shadow'
              : 'text-zinc-300 hover:bg-white/10'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  CompassIcon,
  HomeIcon,
  LibraryIcon,
  LogOutIcon,
  SearchIcon,
  SettingsIcon,
  SparklesIcon,
} from './icons';
import { clearTokens } from '../auth';
import { Brand, BrandMark } from './Brand';
import { ServerUpdateNotice } from './ServerUpdateNotice';

const tabs = [
  { to: '/', label: 'Home', Icon: HomeIcon, end: true },
  { to: '/updates', label: 'Updates', Icon: SparklesIcon, end: false },
  { to: '/sources', label: 'Discover', Icon: CompassIcon, end: false },
  { to: '/library', label: 'Library', Icon: LibraryIcon, end: false },
  { to: '/settings', label: 'Settings', Icon: SettingsIcon, end: false },
];

export function AppShell() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden md:block md:h-auto md:min-h-dvh md:overflow-visible md:pl-56 md:pt-[4.5rem]">
      <header className="fixed inset-x-0 top-0 z-50 hidden h-[4.5rem] items-center border-b border-white/[0.07] bg-glass/90 px-7 backdrop-blur-2xl md:flex">
        <Brand link compact className="w-52 shrink-0" />
        <nav className="flex h-full items-center gap-8">
          {tabs.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `relative flex h-full items-center text-sm font-medium transition-colors ${
                  isActive ? 'text-brand-400' : 'text-zinc-300 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {label}
                  <span
                    className={`absolute inset-x-0 bottom-3 h-0.5 rounded-full bg-brand-400 transition-opacity ${
                      isActive ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <GlobalSearchBox />
          <Link to="/settings" className="relative grid h-9 w-9 place-items-center overflow-hidden rounded-full border border-brand-400/40 bg-brand-500/15">
            <BrandMark className="h-6 w-6" />
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-glass bg-brand-400" />
          </Link>
        </div>
      </header>

      <nav className="fixed bottom-0 left-0 top-[4.5rem] z-40 hidden w-56 flex-col border-r border-white/[0.07] bg-glass/80 px-3 py-5 md:flex">
        <div className="flex flex-col gap-1.5">
          {tabs.map(({ to, label, Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? 'bg-brand-500/15 text-brand-300' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-100'
                }`
              }
            >
              {() => (
                <>
                  <Icon className="h-5 w-5" />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </div>

        <button
          onClick={() => clearTokens()}
          className="mt-auto flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-100"
        >
          <LogOutIcon className="h-5 w-5" />
          Sign out
        </button>
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto md:flex-none md:overflow-visible">
        <Outlet />
      </div>

      <ServerUpdateNotice />

      <nav className="pb-safe shrink-0 border-t border-white/[0.07] bg-glass/94 backdrop-blur-2xl md:hidden">
        <div className="flex h-[4.25rem] items-stretch">
          {tabs.map(({ to, label, Icon, end }) => (
            <NavLink key={to} to={to} end={end} className="relative flex flex-1 flex-col items-center justify-center gap-0.5">
              {({ isActive }) => (
                <>
                  <span className={`grid h-7 place-items-center transition-colors ${isActive ? 'text-brand-400' : 'text-zinc-500'}`}>
                    <Icon className="h-[1.35rem] w-[1.35rem]" />
                  </span>
                  <span
                    className={`text-[10px] font-medium transition-colors ${
                      isActive ? 'text-brand-400' : 'text-zinc-500'
                    }`}
                  >
                    {label}
                  </span>
                  <span className={`absolute bottom-1 h-1 w-1 rounded-full bg-brand-400 ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

function GlobalSearchBox() {
  const navigate = useNavigate();
  const location = useLocation();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const params = new URLSearchParams(location.search);
  const routeValue = location.pathname === '/sources' ? params.get('q') ?? '' : '';
  const [value, setValue] = useState(routeValue);

  useEffect(() => {
    if (location.pathname === '/sources') setValue(routeValue);
  }, [location.pathname, routeValue]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  function update(next: string) {
    setValue(next);
    const search = next.trim() ? `?q=${encodeURIComponent(next)}` : '';
    navigate(`/sources${search}`, { replace: location.pathname === '/sources' });
    window.dispatchEvent(new CustomEvent('suwayomi-global-search', { detail: next }));
  }

  return (
    <label className="flex h-10 w-[min(24vw,19rem)] items-center gap-2 rounded-xl border border-white/10 bg-black/25 px-3 text-sm transition-colors focus-within:border-brand-500/50">
      <SearchIcon className="h-4 w-4 shrink-0 text-zinc-500" />
      <input
        ref={inputRef}
        value={value}
        onChange={(event) => update(event.target.value)}
        placeholder="Search all sources…"
        className="min-w-0 flex-1 bg-transparent text-zinc-200 outline-none placeholder:text-zinc-500"
      />
      <kbd className="hidden rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] text-zinc-500 lg:block">⌘ K</kbd>
    </label>
  );
}

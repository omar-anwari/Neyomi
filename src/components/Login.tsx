import { useState } from 'react';
import { useMutation } from 'urql';
import { LoginMutation } from '../operations';
import { setTokens } from '../auth';
import { Brand } from './Brand';
import { Spinner } from './ui';
import {
  BookmarkIcon,
  BookOpenIcon,
  ClockIcon,
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  MailIcon,
} from './icons';

const FEATURES = [
  { Icon: BookOpenIcon, title: 'Cloud Sync', desc: 'Your library, progress, and settings across all devices.' },
  { Icon: BookmarkIcon, title: 'Bookmarks', desc: 'Save your favorite chapters and never lose track.' },
  { Icon: ClockIcon, title: 'Continue Reading', desc: 'Jump back into the story right where you left off.' },
];

function loginErrorMessage(raw: string): string {
  const msg = raw.split('\n')[0].trim();
  if (/Incorrect username or password/i.test(msg)) return 'Incorrect username or password.';
  if (/already logged-in/i.test(msg)) {
    return 'This server is authenticating the session itself - set its authMode to UI_LOGIN, then clear cookies and reload.';
  }
  return msg;
}

export function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [{ fetching }, login] = useMutation(LoginMutation);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const result = await login({ username, password });
    if (result.error) {
      setError(loginErrorMessage(result.error.graphQLErrors[0]?.message ?? result.error.message));
      return;
    }
    const payload = result.data?.login;
    if (payload) setTokens({ accessToken: payload.accessToken, refreshToken: payload.refreshToken }, remember);
  }

  return (
    <div className="relative min-h-dvh overflow-hidden bg-app lg:grid lg:grid-cols-[1.18fr_.82fr]">
      <aside className="relative hidden min-h-dvh overflow-hidden border-r border-white/[0.07] lg:block">
        <KeyArt />
        <div className="relative z-10 flex min-h-dvh flex-col justify-between p-10 xl:p-12">
          <Brand />
          <div className="max-w-sm pb-4">
            <h1 className="text-[2.75rem] font-black leading-[1.04] tracking-[-0.04em] text-white xl:text-5xl">
              Your World
              <br />
              of Manga <span className="text-brand-400">Awaits</span>
            </h1>
            <p className="mt-4 max-w-xs text-sm leading-6 text-zinc-300">
              Sign in to continue your journey and pick up where you left off.
            </p>
            <div className="mt-7 w-full max-w-xs space-y-2.5">
              {FEATURES.map((feature) => (
                <FeatureCard key={feature.title} {...feature} />
              ))}
            </div>
          </div>
          <p className="text-xs text-zinc-500">Your world of manga. Anywhere.</p>
        </div>
      </aside>

      <main className="relative flex min-h-dvh flex-col">
        <div className="relative h-[18rem] shrink-0 overflow-hidden lg:hidden">
          <KeyArt />
          <div className="relative z-10 flex h-full flex-col items-center justify-end pb-12">
            <Brand />
            <p className="mt-2 text-sm font-medium text-brand-300">Welcome back</p>
          </div>
        </div>

        <div className="relative z-10 flex flex-1 items-center justify-center px-5 pb-8 lg:px-8">
          <div className="-mt-7 w-full max-w-md rounded-[1.6rem] border border-white/[0.09] bg-glass/95 p-5 shadow-2xl shadow-black/60 backdrop-blur-xl sm:p-7 lg:mt-0 lg:max-w-[25rem] lg:bg-glass/75">
            <div className="mb-6 hidden lg:block">
              <h2 className="text-3xl font-bold tracking-[-0.03em] text-white">Welcome Back</h2>
              <p className="mt-1 text-sm text-zinc-500">Sign in to your Suwayomi server</p>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <FieldLabel label="Email">
                <MailIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  autoComplete="username"
                  placeholder="Email or Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-raised py-3.5 pl-11 pr-3 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-brand-500/70 focus:ring-2 focus:ring-brand-500/10"
                  required
                />
              </FieldLabel>

              <FieldLabel label="Password">
                <LockIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
                <input
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-raised py-3.5 pl-11 pr-11 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-brand-500/70 focus:ring-2 focus:ring-brand-500/10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw((value) => !value)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                  className="absolute right-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-zinc-500 hover:text-zinc-200"
                >
                  {showPw ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                </button>
              </FieldLabel>

              <div className="flex items-center text-xs">
                <label className="flex cursor-pointer items-center gap-2 text-zinc-400">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-4 w-4 accent-brand-500"
                  />
                  Remember me
                </label>
              </div>

              {error && (
                <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={fetching}
                className="brand-gradient flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-on-brand shadow-lg shadow-brand-600/25 transition hover:brightness-110 disabled:opacity-60"
              >
                {fetching && <Spinner className="h-4 w-4 text-white" />}
                {fetching ? 'Signing in…' : 'Sign In'}
              </button>

            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

function KeyArt() {
  return (
    <div className="absolute inset-0 bg-surface">
      <img src="/assets/wallpaper.png" alt="" className="h-full w-full object-cover object-left-bottom" />
      <div className="absolute inset-0 bg-black/55" />
      <div className="absolute inset-0 bg-gradient-to-t from-app/25 via-transparent to-app/10" />
    </div>
  );
}

function FieldLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-zinc-300">{label}</span>
      <span className="relative block">{children}</span>
    </label>
  );
}

function FeatureCard({
  Icon,
  title,
  desc,
}: {
  Icon: (props: { className?: string }) => React.ReactElement;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-surface/75 p-3 backdrop-blur-md">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-500/15 text-brand-400 ring-1 ring-brand-500/30">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="mt-0.5 text-[11px] leading-4 text-zinc-400">{desc}</p>
      </div>
    </div>
  );
}

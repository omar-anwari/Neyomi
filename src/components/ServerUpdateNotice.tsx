import { useState } from 'react';
import { loadDismissedUpdate, saveDismissedUpdate, useServerUpdate } from '../serverUpdate';
import { ExternalLinkIcon, SparklesIcon, XIcon } from './icons';

export function ServerUpdateNotice() {
  const { about, sameChannel } = useServerUpdate();
  const [dismissed, setDismissed] = useState(loadDismissedUpdate);

  if (!about || !sameChannel || dismissed === sameChannel.tag) return null;

  function dismiss() {
    if (!sameChannel) return;
    saveDismissedUpdate(sameChannel.tag);
    setDismissed(sameChannel.tag);
  }

  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-[calc(4.25rem+env(safe-area-inset-bottom)+0.75rem)] z-50 rounded-2xl border border-brand-500/30 bg-surface/95 p-4 shadow-2xl shadow-black/50 backdrop-blur-xl md:inset-x-auto md:bottom-6 md:right-6 md:w-96"
    >
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-500/15 text-brand-400 ring-1 ring-brand-500/25">
          <SparklesIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-zinc-100">Suwayomi update available</p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-400">
            Your server is running {about.version}, but {sameChannel.tag} is out. Updating your server picks up bug
            fixes and keeps extensions working.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <a
              href={sameChannel.url}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-on-brand transition hover:brightness-110"
            >
              Release notes
              <ExternalLinkIcon className="h-3.5 w-3.5" />
            </a>
            <button
              onClick={dismiss}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
            >
              Not now
            </button>
          </div>
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-zinc-500 hover:bg-white/5 hover:text-zinc-200"
        >
          <XIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

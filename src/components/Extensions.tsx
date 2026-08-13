import { useMemo, useState } from 'react';
import { useMutation, useQuery } from 'urql';
import {
  AddExtensionStoreMutation,
  ExtensionStoresQuery,
  ExtensionsQuery,
  FetchExtensionsMutation,
  RemoveExtensionStoreMutation,
  UpdateExtensionMutation,
} from '../operations';
import { Link } from 'react-router-dom';
import { RefreshIcon, SettingsIcon, XIcon } from './icons';
import { ErrorState, PageHeader, Spinner } from './ui';

const fieldClass =
  'w-full rounded-xl border border-white/[0.09] bg-app px-3 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/10';

type Tab = 'installed' | 'available' | 'stores';

type Extension = {
  pkgName: string;
  name: string;
  lang: string;
  versionName: string;
  iconUrl: string;
  isInstalled: boolean;
  hasUpdate: boolean;
  isObsolete: boolean;
  source: { nodes: { id: string; displayName: string; isConfigurable: boolean }[] };
};

export function Extensions() {
  const [tab, setTab] = useState<Tab>('installed');
  const context = useMemo(() => ({ additionalTypenames: ['ExtensionType'] }), []);
  const [{ data, fetching, error }, reexecute] = useQuery({ query: ExtensionsQuery, context });
  const [, fetchExtensions] = useMutation(FetchExtensionsMutation);
  const [, updateExtension] = useMutation(UpdateExtensionMutation);

  const [pending, setPending] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');

  const all = (data?.extensions.nodes ?? []) as Extension[];
  const term = search.trim().toLowerCase();
  const matches = (e: Extension) =>
    !term || e.name.toLowerCase().includes(term) || e.lang.toLowerCase().includes(term);

  const installed = all.filter((e) => e.isInstalled && matches(e));
  const available = all.filter((e) => !e.isInstalled && matches(e));
  const updatable = installed.filter((e) => e.hasUpdate);

  function flash(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 2800);
  }

  async function refresh() {
    setRefreshing(true);
    const res = await fetchExtensions({});
    setRefreshing(false);
    if (res.error) flash(res.error.message);
    else {
      reexecute({ requestPolicy: 'network-only' });
      flash('Extension list refreshed');
    }
  }

  async function act(
    extension: Extension,
    patch: { install?: boolean; uninstall?: boolean; update?: boolean },
    label: string,
    skipPrefetch = false,
  ) {
    setPending(extension.pkgName);
    if (patch.update && !skipPrefetch) await fetchExtensions({});
    const res = await updateExtension({ id: extension.pkgName, patch });
    setPending(null);
    if (res.error) {
      const stale = /NullPointerException|:\s*null\b/.test(res.error.message);
      flash(
        stale
          ? `${extension.name}: the server's update info was stale. Hit refresh and try again.`
          : `${extension.name}: ${res.error.message}`,
      );
    } else flash(`${label} ${extension.name}`);
  }

  async function updateAll() {
    setRefreshing(true);
    await fetchExtensions({});
    setRefreshing(false);
    for (const extension of updatable) {
      await act(extension, { update: true }, 'Updated', true);
    }
  }

  return (
    <div className="min-h-dvh">
      <PageHeader
        title="Extensions"
        subtitle="Install and update sources"
        backTo="/settings"
        actions={
          <button
            onClick={refresh}
            disabled={refreshing}
            aria-label="Refresh extension list"
            className="grid h-10 w-10 place-items-center rounded-full text-zinc-300 hover:bg-white/5 disabled:opacity-40"
          >
            {refreshing ? <Spinner className="h-5 w-5" /> : <RefreshIcon className="h-5 w-5" />}
          </button>
        }
      >
        <div className="mx-4 mb-3 grid grid-cols-3 overflow-hidden rounded-xl bg-white/[0.05] p-0.5 sm:mx-6">
          <TabButton active={tab === 'installed'} onClick={() => setTab('installed')}>
            Installed {installed.length > 0 && `(${installed.length})`}
          </TabButton>
          <TabButton active={tab === 'available'} onClick={() => setTab('available')}>
            Available {available.length > 0 && `(${available.length})`}
          </TabButton>
          <TabButton active={tab === 'stores'} onClick={() => setTab('stores')}>
            Repos
          </TabButton>
        </div>
      </PageHeader>

      <main className="mx-auto max-w-3xl px-4 pb-16 pt-4 sm:px-6">
        {error && <ErrorState message={`Failed to load extensions: ${error.message}`} />}

        <div className="min-h-[1.25rem] text-xs">
          {notice && <span className="text-brand-300">{notice}</span>}
        </div>

        {tab === 'stores' ? (
          <Stores />
        ) : (
          <>
            <input
              className={`${fieldClass} mt-1`}
              value={search}
              placeholder="Filter by name or language…"
              onChange={(event) => setSearch(event.target.value)}
            />

            {tab === 'installed' && updatable.length > 0 && (
              <button
                onClick={updateAll}
                disabled={pending != null}
                className="mt-3 w-full rounded-xl bg-brand-500 px-4 py-3 text-sm font-semibold text-on-brand disabled:opacity-40"
              >
                Update all ({updatable.length})
              </button>
            )}

            <div className="mt-3 overflow-hidden rounded-2xl border border-white/[0.08] bg-surface/85">
              {fetching && all.length === 0 && (
                <p className="px-4 py-6 text-center text-sm text-zinc-500">Loading extensions…</p>
              )}
              {!fetching && (tab === 'installed' ? installed : available).length === 0 && (
                <p className="px-4 py-6 text-center text-sm text-zinc-500">
                  {tab === 'installed'
                    ? 'Nothing installed yet. Check the Available tab.'
                    : 'Nothing available. Add a repo under Repos, then refresh.'}
                </p>
              )}
              {(tab === 'installed' ? installed : available).map((extension, index) => (
                <ExtensionRow
                  key={extension.pkgName}
                  extension={extension}
                  divided={index > 0}
                  pending={pending === extension.pkgName}
                  disabled={pending != null}
                  onInstall={() => act(extension, { install: true }, 'Installed')}
                  onUninstall={() => act(extension, { uninstall: true }, 'Removed')}
                  onUpdate={() => act(extension, { update: true }, 'Updated')}
                />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function ExtensionRow({
  extension,
  divided,
  pending,
  disabled,
  onInstall,
  onUninstall,
  onUpdate,
}: {
  extension: Extension;
  divided: boolean;
  pending: boolean;
  disabled: boolean;
  onInstall: () => void;
  onUninstall: () => void;
  onUpdate: () => void;
}) {
  const configurable = extension.isInstalled
    ? (extension.source?.nodes ?? []).filter((s) => s.isConfigurable)
    : [];

  return (
    <div className={`flex items-center gap-3 px-4 py-3 ${divided ? 'border-t border-white/[0.06]' : ''}`}>
      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-zinc-800">
        {extension.iconUrl && (
          <img src={extension.iconUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-200">{extension.name}</p>
        <p className="mt-0.5 truncate text-xs text-zinc-500">
          {extension.lang.toUpperCase()} · v{extension.versionName}
          {extension.isObsolete && <span className="text-amber-300"> · obsolete</span>}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {pending && <Spinner className="h-4 w-4" />}
        {configurable.map((s) => (
          <Link
            key={s.id}
            to={`/sources/${encodeURIComponent(s.id)}/settings`}
            aria-label={`${s.displayName} settings`}
            title={
              configurable.length > 1 ? `${s.displayName} settings` : 'Source settings'
            }
            className="grid h-8 w-8 place-items-center rounded-full text-zinc-400 hover:bg-white/10 hover:text-zinc-200"
          >
            <SettingsIcon className="h-4 w-4" />
          </Link>
        ))}
        {extension.hasUpdate && extension.isInstalled && (
          <button
            onClick={onUpdate}
            disabled={disabled}
            className="rounded-full bg-brand-500 px-3 py-1.5 text-xs font-semibold text-on-brand disabled:opacity-40"
          >
            Update
          </button>
        )}
        {extension.isInstalled ? (
          <button
            onClick={onUninstall}
            disabled={disabled}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-40"
          >
            Remove
          </button>
        ) : (
          <button
            onClick={onInstall}
            disabled={disabled}
            className="rounded-full border border-brand-500/40 bg-brand-500/15 px-3 py-1.5 text-xs font-semibold text-brand-300 disabled:opacity-40"
          >
            Install
          </button>
        )}
      </div>
    </div>
  );
}

function Stores() {
  const context = useMemo(() => ({ additionalTypenames: ['ExtensionStoreType'] }), []);
  const [{ data, fetching, error }] = useQuery({ query: ExtensionStoresQuery, context });
  const [, addStore] = useMutation(AddExtensionStoreMutation);
  const [, removeStore] = useMutation(RemoveExtensionStoreMutation);

  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const stores = data?.extensionStores.nodes ?? [];

  function flash(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 3000);
  }

  async function add() {
    const trimmed = url.trim();
    if (!trimmed) return;
    setBusy(true);
    const res = await addStore({ indexUrl: trimmed });
    setBusy(false);
    if (res.error) flash(res.error.message);
    else {
      setUrl('');
      flash('Repo added — refresh the extension list');
    }
  }

  async function remove(indexUrl: string) {
    setBusy(true);
    const res = await removeStore({ indexUrl });
    setBusy(false);
    if (res.error) flash(res.error.message);
    else flash('Repo removed');
  }

  return (
    <>
      {error && <ErrorState message={`Failed to load repos: ${error.message}`} />}

      <section className="mt-1 rounded-2xl border border-white/[0.08] bg-surface/85 p-4">
        <label className="block text-xs font-medium text-zinc-300">
          Add a repo
          <span className="ml-1 font-normal text-zinc-600">· index.min.json URL</span>
          <div className="mt-1.5 flex gap-2">
            <input
              className={fieldClass}
              value={url}
              inputMode="url"
              placeholder="https://…/index.min.json"
              onChange={(event) => setUrl(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void add();
              }}
            />
            <button
              onClick={add}
              disabled={!url.trim() || busy}
              className="shrink-0 rounded-xl bg-brand-500 px-4 text-sm font-semibold text-on-brand disabled:opacity-40"
            >
              Add
            </button>
          </div>
        </label>
        <div className="mt-2 flex min-h-[1rem] items-center gap-2 text-xs">
          {busy && <Spinner className="h-3.5 w-3.5" />}
          {notice && <span className="text-brand-300">{notice}</span>}
        </div>
      </section>

      <div className="mt-4 overflow-hidden rounded-2xl border border-white/[0.08] bg-surface/85">
        {fetching && stores.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-zinc-500">Loading repos…</p>
        )}
        {!fetching && stores.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-zinc-500">No repos configured.</p>
        )}
        {stores.map((store, index) => (
          <div
            key={store.indexUrl}
            className={`flex items-center gap-3 px-4 py-3 ${index > 0 ? 'border-t border-white/[0.06]' : ''}`}
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-zinc-200">
                {store.name || store.indexUrl}
                {store.isLegacy && <span className="ml-1.5 text-xs text-amber-300">legacy</span>}
              </p>
              <p className="mt-0.5 truncate text-xs text-zinc-500">{store.indexUrl}</p>
            </div>
            <button
              onClick={() => remove(store.indexUrl)}
              disabled={busy}
              aria-label="Remove repo"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-zinc-500 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-40"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <p className="mt-4 px-1 text-xs leading-relaxed text-zinc-500">
        Adding a repo here replaces setting <code className="text-zinc-400">EXTENSION_STORES</code> in your
        server's environment. After adding one, hit refresh in the header so the server pulls its index.
      </p>
    </>
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
        active ? 'brand-gradient text-on-brand shadow' : 'text-zinc-300 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

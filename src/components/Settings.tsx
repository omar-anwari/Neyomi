import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery } from 'urql';
import { clearTokens } from '../auth';
import type {
  PartialSettingsTypeInput,
  ServerSettingsQuery as ServerSettingsData,
  WebUiInterface,
} from '../gql/graphql';
import { ServerSettingsQuery, UpdateServerSettingsMutation } from '../operations';
import {
  DEFAULT_READER_PREFS,
  loadPrefs,
  resetPrefs,
  savePrefs,
  type FitMode,
  type ReaderTheme,
  type ReadingMode,
} from '../readerPrefs';
import { useServerUpdate } from '../serverUpdate';
import { BrandMark } from './Brand';
import {
  BookOpenIcon,
  ChevronLeftIcon,
  CompassIcon,
  ExternalLinkIcon,
  LibraryIcon,
  LogOutIcon,
  SettingsIcon,
  SparklesIcon,
} from './icons';
import { ErrorState, PageHeader, Spinner } from './ui';

const destinations = [
  { label: 'Appearance', description: 'Themes, custom palettes, and colors', Icon: SparklesIcon, to: '/settings/appearance' },
  { label: 'Server Settings', description: 'Updates, backups, WebUI, network, sync, and logs', Icon: SettingsIcon, to: '/settings/server' },
  { label: 'Reader Settings', description: 'Reading mode, image fit, brightness, and progress', Icon: BookOpenIcon, to: '/settings/reader' },
  { label: 'Categories', description: 'Group your library and control what updates', Icon: LibraryIcon, to: '/settings/categories' },
  { label: 'Extensions', description: 'Install, update, and manage source repos', Icon: CompassIcon, to: '/settings/extensions' },
  { label: 'Library', description: 'Manage saved titles and reading history', Icon: LibraryIcon, to: '/library' },
  { label: 'Browse Sources', description: 'Search every installed source', Icon: CompassIcon, to: '/sources' },
];

export function Settings() {
  const [reset, setReset] = useState(false);

  function resetReaderSettings() {
    resetPrefs();
    setReset(true);
    window.setTimeout(() => setReset(false), 1800);
  }

  return (
    <div className="min-h-dvh">
      <PageHeader title="Settings" />
      <main className="mx-auto max-w-3xl px-4 pb-8 pt-5 sm:px-6">
        <section className="flex items-center gap-4 rounded-2xl border border-white/[0.08] bg-surface/85 p-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-brand-500/15 ring-1 ring-brand-500/25">
            <BrandMark className="h-10 w-10" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold">Neyomi</h1>
            <p className="mt-0.5 text-sm text-zinc-500">Connected to your Suwayomi server</p>
          </div>
        </section>

        <section className="mt-6">
          <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Navigation</h2>
          <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-surface/85">
            {destinations.map(({ label, description, Icon, to }, index) => (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 px-4 py-3.5 hover:bg-white/[0.04] ${
                  index > 0 ? 'border-t border-white/[0.06]' : ''
                }`}
              >
                <Icon className={`h-5 w-5 ${index === 0 ? 'text-brand-400' : 'text-zinc-300'}`} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-zinc-200">{label}</span>
                  <span className="mt-0.5 block truncate text-xs text-zinc-500">{description}</span>
                </span>
                <ChevronLeftIcon className="h-4 w-4 rotate-180 text-zinc-600" />
              </Link>
            ))}
          </div>
        </section>

        <ServerInfo />

        <section className="mt-6">
          <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Actions</h2>
          <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-surface/85">
            <button
              onClick={resetReaderSettings}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-white/[0.04]"
            >
              <SettingsIcon className="h-5 w-5 text-zinc-300" />
              <span className="flex-1 text-sm text-zinc-200">
                {reset ? 'Reader settings reset' : 'Reset reader settings'}
              </span>
            </button>
            <button
              onClick={clearTokens}
              className="flex w-full items-center gap-3 border-t border-white/[0.06] px-4 py-3.5 text-red-300 hover:bg-red-500/5"
            >
              <LogOutIcon className="h-5 w-5" />
              <span className="text-sm">Sign out</span>
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

function ServerInfo() {
  const { about, error, checking, updatesError, sameChannel, otherChannels } = useServerUpdate();

  let status: ReactNode;
  if (!about || checking) {
    status = <span className="text-zinc-500">Checking for updates…</span>;
  } else if (updatesError) {
    status = <span className="text-zinc-500">Couldn't check for updates</span>;
  } else if (sameChannel) {
    status = <span className="text-brand-400">Update available: {sameChannel.tag}</span>;
  } else {
    status = <span className="text-zinc-500">Up to date</span>;
  }

  return (
    <section className="mt-6">
      <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Server</h2>
      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-surface/85">
        <div className="flex items-center gap-3 px-4 py-3.5">
          <SettingsIcon className="h-5 w-5 text-zinc-300" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-zinc-200">
              {about ? `${about.name} ${about.version}` : error ? 'Server version unavailable' : 'Loading…'}
            </span>
            <span className="mt-0.5 block truncate text-xs">
              {about && <span className="text-zinc-500">{about.buildType} · </span>}
              {error ? <span className="text-zinc-500">{error.message}</span> : status}
            </span>
          </span>
          {!about && !error && <Spinner className="h-4 w-4" />}
        </div>
        {[sameChannel, ...otherChannels].filter((update) => update !== undefined).map((update) => (
          <a
            key={update.channel}
            href={update.url}
            target="_blank"
            rel="noreferrer noopener"
            className="flex items-center gap-3 border-t border-white/[0.06] px-4 py-3.5 hover:bg-white/[0.04]"
          >
            <ExternalLinkIcon className="h-5 w-5 text-zinc-300" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm text-zinc-200">
                {update.channel} {update.tag}
              </span>
              <span className="mt-0.5 block truncate text-xs text-zinc-500">View release notes</span>
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}

type ServerSettingsDraft = {
  globalUpdateInterval: number;
  updateMangas: boolean;
  excludeUnreadChapters: boolean;
  excludeEntryWithUnreadChapters: boolean;
  excludeNotStarted: boolean;
  excludeCompleted: boolean;
  maxSourcesInParallel: number;
  backupPath: string;
  backupTime: string;
  backupInterval: number;
  backupTTL: number;
  autoBackupIncludeManga: boolean;
  autoBackupIncludeCategories: boolean;
  autoBackupIncludeChapters: boolean;
  autoBackupIncludeTracking: boolean;
  autoBackupIncludeHistory: boolean;
  autoBackupIncludeClientData: boolean;
  autoBackupIncludeServerSettings: boolean;
  initialOpenInBrowserEnabled: boolean;
  systemTrayEnabled: boolean;
  webUIInterface: WebUiInterface;
  webUIUpdateCheckInterval: number;
  socksProxyEnabled: boolean;
  socksProxyHost: string;
  socksProxyPort: string;
  socksProxyVersion: number;
  socksProxyUsername: string;
  socksProxyPassword: string;
  flareSolverrEnabled: boolean;
  flareSolverrUrl: string;
  flareSolverrTimeout: number;
  flareSolverrSessionName: string;
  flareSolverrSessionTtl: number;
  flareSolverrAsResponseFallback: boolean;
  syncYomiEnabled: boolean;
  syncYomiHost: string;
  syncYomiApiKey: string;
  syncInterval: string;
  syncDataManga: boolean;
  syncDataCategories: boolean;
  syncDataChapters: boolean;
  syncDataHistory: boolean;
  syncDataTracking: boolean;
  debugLogsEnabled: boolean;
};

function toDraft(settings: ServerSettingsData['settings']): ServerSettingsDraft {
  return {
    globalUpdateInterval: settings.globalUpdateInterval,
    updateMangas: settings.updateMangas,
    excludeUnreadChapters: settings.excludeUnreadChapters,
    excludeEntryWithUnreadChapters: settings.excludeEntryWithUnreadChapters,
    excludeNotStarted: settings.excludeNotStarted,
    excludeCompleted: settings.excludeCompleted,
    maxSourcesInParallel: settings.maxSourcesInParallel,
    backupPath: settings.backupPath,
    backupTime: settings.backupTime,
    backupInterval: settings.backupInterval,
    backupTTL: settings.backupTTL,
    autoBackupIncludeManga: settings.autoBackupIncludeManga,
    autoBackupIncludeCategories: settings.autoBackupIncludeCategories,
    autoBackupIncludeChapters: settings.autoBackupIncludeChapters,
    autoBackupIncludeTracking: settings.autoBackupIncludeTracking,
    autoBackupIncludeHistory: settings.autoBackupIncludeHistory,
    autoBackupIncludeClientData: settings.autoBackupIncludeClientData,
    autoBackupIncludeServerSettings: settings.autoBackupIncludeServerSettings,
    initialOpenInBrowserEnabled: settings.initialOpenInBrowserEnabled,
    systemTrayEnabled: settings.systemTrayEnabled,
    webUIInterface: settings.webUIInterface,
    webUIUpdateCheckInterval: settings.webUIUpdateCheckInterval,
    socksProxyEnabled: settings.socksProxyEnabled,
    socksProxyHost: settings.socksProxyHost,
    socksProxyPort: settings.socksProxyPort,
    socksProxyVersion: settings.socksProxyVersion,
    socksProxyUsername: settings.socksProxyUsername,
    socksProxyPassword: settings.socksProxyPassword,
    flareSolverrEnabled: settings.flareSolverrEnabled,
    flareSolverrUrl: settings.flareSolverrUrl,
    flareSolverrTimeout: settings.flareSolverrTimeout,
    flareSolverrSessionName: settings.flareSolverrSessionName,
    flareSolverrSessionTtl: settings.flareSolverrSessionTtl,
    flareSolverrAsResponseFallback: settings.flareSolverrAsResponseFallback,
    syncYomiEnabled: settings.syncYomiEnabled,
    syncYomiHost: settings.syncYomiHost,
    syncYomiApiKey: settings.syncYomiApiKey,
    syncInterval: String(settings.syncInterval),
    syncDataManga: settings.syncDataManga,
    syncDataCategories: settings.syncDataCategories,
    syncDataChapters: settings.syncDataChapters,
    syncDataHistory: settings.syncDataHistory,
    syncDataTracking: settings.syncDataTracking,
    debugLogsEnabled: settings.debugLogsEnabled,
  };
}

export function ServerSettings() {
  const [{ data, fetching, error }, reload] = useQuery({ query: ServerSettingsQuery });
  const [{ fetching: saving, error: saveError }, updateSettings] = useMutation(UpdateServerSettingsMutation);
  const [draft, setDraft] = useState<ServerSettingsDraft | null>(null);
  const [baseline, setBaseline] = useState<ServerSettingsDraft | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data?.settings && !draft) {
      const next = toDraft(data.settings);
      setDraft(next);
      setBaseline(next);
    }
  }, [data, draft]);

  function update<K extends keyof ServerSettingsDraft>(key: K, value: ServerSettingsDraft[K]) {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
    setSaved(false);
  }

  async function save() {
    if (!draft || saving) return;

    const settings: PartialSettingsTypeInput = {
      ...draft,
      globalUpdateInterval:
        draft.globalUpdateInterval <= 0 ? 0 : Math.max(6, draft.globalUpdateInterval),
      maxSourcesInParallel: Math.min(20, Math.max(1, draft.maxSourcesInParallel)),
      backupInterval: Math.max(0, draft.backupInterval),
      backupTTL: Math.max(0, draft.backupTTL),
      webUIUpdateCheckInterval: Math.max(0, draft.webUIUpdateCheckInterval),
      socksProxyVersion: draft.socksProxyVersion === 4 ? 4 : 5,
      flareSolverrTimeout: Math.max(1, draft.flareSolverrTimeout),
      flareSolverrSessionTtl: Math.max(1, draft.flareSolverrSessionTtl),
    };
    const result = await updateSettings({ settings });
    const updated = result.data?.setSettings.settings;

    if (updated) {
      const next = toDraft(updated);
      setDraft(next);
      setBaseline(next);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
    }
  }

  const dirty = Boolean(draft && baseline && JSON.stringify(draft) !== JSON.stringify(baseline));

  if (fetching && !draft) {
    return (
      <div className="min-h-dvh">
        <PageHeader title="Server Settings" backTo="/settings" />
        <div className="grid min-h-[50vh] place-items-center">
          <Spinner className="h-7 w-7" />
        </div>
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="min-h-dvh">
        <PageHeader title="Server Settings" backTo="/settings" />
        <main className="mx-auto max-w-2xl px-4 py-5 sm:px-6">
          <ErrorState message={error?.message ?? 'The server settings could not be loaded.'} />
          <button
            onClick={() => reload({ requestPolicy: 'network-only' })}
            className="mx-auto mt-4 block rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-zinc-200"
          >
            Try again
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh">
      <PageHeader
        title="Server Settings"
        subtitle={dirty ? 'Unsaved changes' : 'Synced with Suwayomi'}
        backTo="/settings"
      />
      <main className="mx-auto max-w-3xl space-y-5 px-4 pb-28 pt-5 sm:px-6">
        <SettingsSection
          eyebrow="Library"
          title="Global updates"
          description="Control how Suwayomi checks installed sources for new chapters."
        >
          <FieldGrid>
            <NumberField
              label="Update interval"
              hint="Hours; 0 disables, otherwise minimum 6"
              min={0}
              step={1}
              value={draft.globalUpdateInterval}
              onChange={(value) => update('globalUpdateInterval', value)}
            />
            <NumberField
              label="Parallel sources"
              hint="Between 1 and 20"
              min={1}
              max={20}
              value={draft.maxSourcesInParallel}
              onChange={(value) => update('maxSourcesInParallel', value)}
            />
          </FieldGrid>
          <SettingsRows>
            <ToggleRow
              title="Refresh manga details"
              subtitle="Update manga metadata during global updates"
              value={draft.updateMangas}
              onChange={(value) => update('updateMangas', value)}
              nested
            />
            <ToggleRow
              title="Skip titles with unread chapters"
              value={draft.excludeUnreadChapters}
              onChange={(value) => update('excludeUnreadChapters', value)}
              nested
            />
            <ToggleRow
              title="Skip entries with unread chapters"
              subtitle="Separate server-side filter from the one above; both must be off to update everything"
              value={draft.excludeEntryWithUnreadChapters}
              onChange={(value) => update('excludeEntryWithUnreadChapters', value)}
              nested
            />
            <ToggleRow
              title="Skip titles not started"
              value={draft.excludeNotStarted}
              onChange={(value) => update('excludeNotStarted', value)}
              nested
            />
            <ToggleRow
              title="Skip completed titles"
              value={draft.excludeCompleted}
              onChange={(value) => update('excludeCompleted', value)}
              nested
            />
          </SettingsRows>
        </SettingsSection>

        <SettingsSection
          eyebrow="Data"
          title="Automatic backups"
          description="Choose when backups run and what Suwayomi stores in them."
        >
          <FieldGrid>
            <TextField
              label="Backup folder"
              value={draft.backupPath}
              onChange={(value) => update('backupPath', value)}
              placeholder="./backups"
            />
            <TextField
              label="Backup time"
              value={draft.backupTime}
              onChange={(value) => update('backupTime', value)}
              type="time"
            />
            <NumberField
              label="Backup interval"
              hint="Days; use 0 to disable"
              min={0}
              value={draft.backupInterval}
              onChange={(value) => update('backupInterval', value)}
            />
            <NumberField
              label="Retention"
              hint="Days to keep backups"
              min={0}
              value={draft.backupTTL}
              onChange={(value) => update('backupTTL', value)}
            />
          </FieldGrid>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">Include</p>
          <SettingsRows columns>
            <ToggleRow title="Manga" value={draft.autoBackupIncludeManga} onChange={(value) => update('autoBackupIncludeManga', value)} nested />
            <ToggleRow title="Categories" value={draft.autoBackupIncludeCategories} onChange={(value) => update('autoBackupIncludeCategories', value)} nested />
            <ToggleRow title="Chapters" value={draft.autoBackupIncludeChapters} onChange={(value) => update('autoBackupIncludeChapters', value)} nested />
            <ToggleRow title="Tracking" value={draft.autoBackupIncludeTracking} onChange={(value) => update('autoBackupIncludeTracking', value)} nested />
            <ToggleRow title="History" value={draft.autoBackupIncludeHistory} onChange={(value) => update('autoBackupIncludeHistory', value)} nested />
            <ToggleRow title="Client data" value={draft.autoBackupIncludeClientData} onChange={(value) => update('autoBackupIncludeClientData', value)} nested />
            <ToggleRow title="Server settings" value={draft.autoBackupIncludeServerSettings} onChange={(value) => update('autoBackupIncludeServerSettings', value)} nested />
          </SettingsRows>
        </SettingsSection>

        <SettingsSection
          eyebrow="App"
          title="WebUI & desktop"
          description="Configure how Suwayomi opens and checks this interface."
        >
          <SelectField
            label="Interface"
            value={draft.webUIInterface}
            options={[
              ['BROWSER', 'Browser'],
              ['ELECTRON', 'Electron'],
            ]}
            onChange={(value) => update('webUIInterface', value as WebUiInterface)}
          />
          <NumberField
            label="Update check interval"
            hint="Hours; use 0 to disable"
            min={0}
            step={0.5}
            value={draft.webUIUpdateCheckInterval}
            onChange={(value) => update('webUIUpdateCheckInterval', value)}
          />
          <SettingsRows>
            <ToggleRow
              title="Open in browser on startup"
              value={draft.initialOpenInBrowserEnabled}
              onChange={(value) => update('initialOpenInBrowserEnabled', value)}
              nested
            />
            <ToggleRow
              title="Show system tray icon"
              value={draft.systemTrayEnabled}
              onChange={(value) => update('systemTrayEnabled', value)}
              nested
            />
          </SettingsRows>
        </SettingsSection>

        <SettingsSection
          eyebrow="Network"
          title="SOCKS proxy"
          description="Route source traffic through a SOCKS4 or SOCKS5 proxy."
        >
          <ToggleRow
            title="Use SOCKS proxy"
            value={draft.socksProxyEnabled}
            onChange={(value) => update('socksProxyEnabled', value)}
          />
          <div className={draft.socksProxyEnabled ? 'space-y-3' : 'pointer-events-none space-y-3 opacity-45'}>
            <FieldGrid>
              <TextField label="Host" value={draft.socksProxyHost} onChange={(value) => update('socksProxyHost', value)} placeholder="127.0.0.1" />
              <TextField label="Port" value={draft.socksProxyPort} onChange={(value) => update('socksProxyPort', value)} inputMode="numeric" placeholder="1080" />
              <SelectField
                label="Version"
                value={String(draft.socksProxyVersion)}
                options={[['5', 'SOCKS5'], ['4', 'SOCKS4']]}
                onChange={(value) => update('socksProxyVersion', Number(value))}
              />
              <TextField label="Username" value={draft.socksProxyUsername} onChange={(value) => update('socksProxyUsername', value)} autoComplete="off" />
              <TextField label="Password" value={draft.socksProxyPassword} onChange={(value) => update('socksProxyPassword', value)} type="password" autoComplete="new-password" />
            </FieldGrid>
          </div>
        </SettingsSection>

        <SettingsSection
          eyebrow="Network"
          title="FlareSolverr"
          description="Use a FlareSolverr instance for sources protected by Cloudflare."
        >
          <ToggleRow
            title="Use FlareSolverr"
            value={draft.flareSolverrEnabled}
            onChange={(value) => update('flareSolverrEnabled', value)}
          />
          <div className={draft.flareSolverrEnabled ? 'space-y-3' : 'pointer-events-none space-y-3 opacity-45'}>
            <TextField label="Server URL" value={draft.flareSolverrUrl} onChange={(value) => update('flareSolverrUrl', value)} placeholder="http://localhost:8191" />
            <FieldGrid>
              <NumberField label="Timeout" hint="Seconds" min={1} value={draft.flareSolverrTimeout} onChange={(value) => update('flareSolverrTimeout', value)} />
              <TextField label="Session name" value={draft.flareSolverrSessionName} onChange={(value) => update('flareSolverrSessionName', value)} />
              <NumberField label="Session lifetime" hint="Minutes" min={1} value={draft.flareSolverrSessionTtl} onChange={(value) => update('flareSolverrSessionTtl', value)} />
            </FieldGrid>
            <SettingsRows>
              <ToggleRow
                title="Use as fallback"
                subtitle="Try FlareSolverr after a normal request fails"
                value={draft.flareSolverrAsResponseFallback}
                onChange={(value) => update('flareSolverrAsResponseFallback', value)}
                nested
              />
            </SettingsRows>
          </div>
        </SettingsSection>

        <SettingsSection
          eyebrow="Sync"
          title="SyncYomi"
          description="Synchronize library data with a SyncYomi server."
        >
          <ToggleRow
            title="Enable SyncYomi"
            value={draft.syncYomiEnabled}
            onChange={(value) => update('syncYomiEnabled', value)}
          />
          <div className={draft.syncYomiEnabled ? 'space-y-3' : 'pointer-events-none space-y-3 opacity-45'}>
            <TextField label="Server URL" value={draft.syncYomiHost} onChange={(value) => update('syncYomiHost', value)} placeholder="https://sync.example.com" />
            <FieldGrid>
              <TextField label="API key" value={draft.syncYomiApiKey} onChange={(value) => update('syncYomiApiKey', value)} type="password" autoComplete="new-password" />
              <TextField
                label="Sync interval"
                hint="ISO 8601 duration, for example PT15M"
                value={draft.syncInterval}
                onChange={(value) => update('syncInterval', value)}
                placeholder="PT15M"
              />
            </FieldGrid>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">Sync data</p>
            <SettingsRows columns>
              <ToggleRow title="Manga" value={draft.syncDataManga} onChange={(value) => update('syncDataManga', value)} nested />
              <ToggleRow title="Categories" value={draft.syncDataCategories} onChange={(value) => update('syncDataCategories', value)} nested />
              <ToggleRow title="Chapters" value={draft.syncDataChapters} onChange={(value) => update('syncDataChapters', value)} nested />
              <ToggleRow title="History" value={draft.syncDataHistory} onChange={(value) => update('syncDataHistory', value)} nested />
              <ToggleRow title="Tracking" value={draft.syncDataTracking} onChange={(value) => update('syncDataTracking', value)} nested />
            </SettingsRows>
          </div>
        </SettingsSection>

        <SettingsSection
          eyebrow="Advanced"
          title="Diagnostics"
          description="Verbose logs help diagnose source and server issues, but create larger log files."
        >
          <ToggleRow
            title="Enable debug logs"
            value={draft.debugLogsEnabled}
            onChange={(value) => update('debugLogsEnabled', value)}
          />
        </SettingsSection>

        {saveError && <ErrorState message={saveError.message} />}
      </main>

      <div className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-40 border-t border-white/[0.07] bg-glass/92 px-4 py-3 backdrop-blur-2xl md:bottom-0 md:z-30">
        <div className="mx-auto grid max-w-3xl grid-cols-[auto_1fr] gap-2">
          <button
            onClick={() => baseline && setDraft({ ...baseline })}
            disabled={!dirty || saving}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-zinc-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Discard
          </button>
          <button
            onClick={save}
            disabled={!dirty || saving}
            className="brand-gradient flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-on-brand shadow-lg shadow-brand-600/20 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {saving && <Spinner className="h-4 w-4 text-white" />}
            {saved ? 'Settings saved' : saving ? 'Saving…' : 'Save server settings'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ReaderSettings() {
  const [prefs, setPrefs] = useState(loadPrefs);
  const [saved, setSaved] = useState(false);

  function update<K extends keyof typeof prefs>(key: K, value: (typeof prefs)[K]) {
    setPrefs((current) => ({ ...current, [key]: value }));
    setSaved(false);
  }

  function apply() {
    savePrefs(prefs);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  function restoreDefaults() {
    setPrefs(DEFAULT_READER_PREFS);
    setSaved(false);
  }

  return (
    <div className="min-h-dvh">
      <PageHeader title="Reader Settings" backTo="/settings" />
      <main className="mx-auto max-w-2xl space-y-5 px-4 py-5 sm:px-6">
        <ToggleRow
          title="Chapter subtitle"
          subtitle="Show the chapter name below the manga title"
          value={prefs.showChapterSubtitle}
          onChange={(value) => update('showChapterSubtitle', value)}
        />

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Image brightness</h2>
            <span className="text-xs tabular-nums text-zinc-400">{prefs.brightness}%</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="shrink-0 text-xl leading-none" aria-hidden="true">☼</span>
            <input
              className="manga-range min-w-0 flex-1"
              style={{ '--range-progress': `${((prefs.brightness - 40) / 100) * 100}%` } as React.CSSProperties}
              type="range"
              min={40}
              max={140}
              value={prefs.brightness}
              onChange={(event) => update('brightness', Number(event.target.value))}
            />
            <span className="shrink-0 text-xl leading-none" aria-hidden="true">☀</span>
          </div>
        </section>

        <OptionSection
          title="Theme"
          value={prefs.theme}
          options={[['system', 'System'], ['light', 'Light'], ['dark', 'Dark']]}
          onChange={(value) => update('theme', value as ReaderTheme)}
        />
        <OptionSection
          title="Reading mode"
          value={prefs.mode}
          options={[['ltr', 'Left to right'], ['rtl', 'Right to left'], ['webtoon', 'Webtoon']]}
          onChange={(value) => update('mode', value as ReadingMode)}
        />
        <OptionSection
          title="Image fit"
          value={prefs.fit}
          options={[['width', 'Width'], ['height', 'Height'], ['original', 'Original']]}
          onChange={(value) => update('fit', value as FitMode)}
        />

        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-surface/85">
          <ToggleRow
            title="Show progress bar"
            value={prefs.showProgressBar}
            onChange={(value) => update('showProgressBar', value)}
            nested
          />
          <ToggleRow
            title="Resume from last page"
            value={prefs.rememberLastChapter}
            onChange={(value) => update('rememberLastChapter', value)}
            nested
          />
          <ToggleRow
            title="Show tap zones on open"
            value={prefs.showTapZoneHint}
            onChange={(value) => update('showTapZoneHint', value)}
            nested
          />
        </div>

        <div className="grid grid-cols-[auto_1fr] gap-2">
          <button
            onClick={restoreDefaults}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-sm font-medium text-zinc-300 hover:bg-white/[0.07]"
          >
            Defaults
          </button>
          <button onClick={apply} className="brand-gradient rounded-xl py-3.5 text-sm font-semibold shadow-lg shadow-brand-600/20">
            {saved ? 'Settings saved' : 'Save settings'}
          </button>
        </div>
      </main>
    </div>
  );
}

export function SettingsSection({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/[0.08] bg-surface/85 p-4 sm:p-5">
      <div className="mb-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-400">{eyebrow}</p>
        <h2 className="mt-1 text-base font-semibold text-zinc-100">{title}</h2>
        <p className="mt-1 max-w-2xl text-xs leading-5 text-zinc-500">{description}</p>
      </div>
      <div className="space-y-3.5">{children}</div>
    </section>
  );
}

function FieldGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2">{children}</div>;
}

function SettingsRows({ children, columns = false }: { children: ReactNode; columns?: boolean }) {
  return (
    <div
      className={`overflow-hidden rounded-xl border border-white/[0.08] bg-app ${
        columns ? 'sm:grid sm:grid-cols-2' : ''
      }`}
    >
      {children}
    </div>
  );
}

const fieldClass =
  'mt-1.5 w-full rounded-xl border border-white/[0.09] bg-app px-3 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/10';

function TextField({
  label,
  hint,
  value,
  onChange,
  placeholder,
  type = 'text',
  inputMode,
  autoComplete,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'password' | 'time';
  inputMode?: 'text' | 'numeric' | 'url';
  autoComplete?: string;
}) {
  return (
    <label className="block min-w-0 text-xs font-medium text-zinc-300">
      <span>{label}</span>
      {hint && <span className="ml-1 font-normal text-zinc-600">· {hint}</span>}
      <input
        className={fieldClass}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function NumberField({
  label,
  hint,
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <label className="block min-w-0 text-xs font-medium text-zinc-300">
      <span>{label}</span>
      {hint && <span className="ml-1 font-normal text-zinc-600">· {hint}</span>}
      <input
        className={fieldClass}
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => {
          const next = event.target.valueAsNumber;
          if (Number.isFinite(next)) onChange(next);
        }}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: [string, string][];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block min-w-0 text-xs font-medium text-zinc-300">
      {label}
      <select className={fieldClass} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map(([key, optionLabel]) => (
          <option key={key} value={key}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function ToggleRow({
  title,
  subtitle,
  value,
  onChange,
  nested = false,
}: {
  title: string;
  subtitle?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  nested?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-4 ${
        nested
          ? 'border-b border-white/[0.06] px-4 py-3 last:border-0'
          : 'rounded-2xl border border-white/[0.08] bg-surface/85 p-4'
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-zinc-200">{title}</p>
        {subtitle && <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative h-7 w-12 shrink-0 overflow-hidden rounded-full border transition-colors ${
          value ? 'border-brand-400 bg-brand-500' : 'border-white/10 bg-white/10'
        }`}
        aria-pressed={value}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-5.5 w-5.5 rounded-full bg-white shadow transition-transform ${
            value ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

function OptionSection({
  title,
  value,
  options,
  onChange,
}: {
  title: string;
  value: string;
  options: [string, string][];
  onChange: (value: string) => void;
}) {
  return (
    <section>
      <h2 className="mb-2.5 text-sm font-semibold">{title}</h2>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map(([key, label]) => (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`rounded-xl border px-2 py-2.5 text-xs font-medium transition-colors ${
              value === key
                ? 'border-brand-400 bg-brand-500/25 text-white'
                : 'border-white/[0.08] bg-surface text-zinc-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </section>
  );
}

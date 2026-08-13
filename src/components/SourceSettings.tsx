import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery } from 'urql';
import { SourcePreferencesQuery, UpdateSourcePreferenceMutation } from '../operations';
import type { SourcePreferenceChangeInput } from '../gql/graphql';
import { EmptyState, ErrorState, PageHeader, Spinner } from './ui';

type Preference =
  | {
      __typename: 'CheckBoxPreference';
      key?: string | null;
      title?: string | null;
      summary?: string | null;
      enabled: boolean;
      visible: boolean;
      checkBoxCurrent?: boolean | null;
      checkBoxDefault: boolean;
    }
  | {
      __typename: 'SwitchPreference';
      key?: string | null;
      title?: string | null;
      summary?: string | null;
      enabled: boolean;
      visible: boolean;
      switchCurrent?: boolean | null;
      switchDefault: boolean;
    }
  | {
      __typename: 'EditTextPreference';
      key?: string | null;
      title?: string | null;
      summary?: string | null;
      enabled: boolean;
      visible: boolean;
      dialogTitle?: string | null;
      dialogMessage?: string | null;
      editTextCurrent?: string | null;
      editTextDefault?: string | null;
    }
  | {
      __typename: 'ListPreference';
      key?: string | null;
      title?: string | null;
      summary?: string | null;
      enabled: boolean;
      visible: boolean;
      entries: string[];
      entryValues: string[];
      listCurrent?: string | null;
      listDefault?: string | null;
    }
  | {
      __typename: 'MultiSelectListPreference';
      key?: string | null;
      title?: string | null;
      summary?: string | null;
      enabled: boolean;
      visible: boolean;
      dialogTitle?: string | null;
      dialogMessage?: string | null;
      entries: string[];
      entryValues: string[];
      multiSelectCurrent?: string[] | null;
      multiSelectDefault?: string[] | null;
    };

const fieldClass =
  'mt-1.5 w-full rounded-xl border border-white/[0.09] bg-app px-3 py-2.5 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-brand-500/60';

export function SourceSettings() {
  const { sourceId } = useParams();
  const source = sourceId ?? '';

  const [{ data, fetching, error }] = useQuery({
    query: SourcePreferencesQuery,
    variables: { id: source },
    pause: !source,
  });
  const [, updatePreference] = useMutation(UpdateSourcePreferenceMutation);

  const [pending, setPending] = useState<number | null>(null);
  const [notice, setNotice] = useState('');

  const info = data?.source;
  const preferences = ((info?.preferences ?? []) as unknown as Preference[]).map((p, position) => ({
    preference: p,
    position,
  }));
  const shown = preferences.filter(({ preference }) => preference.visible);

  async function change(position: number, patch: Omit<SourcePreferenceChangeInput, 'position'>) {
    setPending(position);
    const res = await updatePreference({ source, change: { position, ...patch } });
    setPending(null);
    setNotice(res.error ? res.error.message : 'Saved');
    window.setTimeout(() => setNotice(''), 2200);
  }

  return (
    <div className="min-h-dvh">
      <PageHeader
        title={info?.displayName ?? 'Source settings'}
        subtitle="Source preferences"
        backTo={`/sources/${encodeURIComponent(source)}`}
      />
      <main className="mx-auto max-w-3xl px-4 pb-16 pt-4 sm:px-6">
        {error && <ErrorState message={`Failed to load preferences: ${error.message}`} />}

        <div className="min-h-[1.25rem] text-xs">
          {pending != null && <Spinner className="h-3.5 w-3.5" />}
          {notice && <span className="text-brand-300">{notice}</span>}
        </div>

        {fetching && shown.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-zinc-500">Loading preferences…</p>
        )}

        {!fetching && shown.length === 0 && (
          <EmptyState
            title="Nothing to configure"
            hint="This source doesn't expose any settings."
          />
        )}

        {shown.length > 0 && (
          <div className="space-y-3">
            {shown.map(({ preference, position }) => (
              <PreferenceField
                key={preference.key ?? `${preference.__typename}-${position}`}
                preference={preference}
                busy={pending === position}
                onChange={(patch) => change(position, patch)}
              />
            ))}
          </div>
        )}

        <p className="mt-6 px-1 text-xs leading-relaxed text-zinc-500">
          These are the source's own settings, stored on the server. Changes apply immediately and affect
          every device.
        </p>
      </main>
    </div>
  );
}

function Shell({
  title,
  summary,
  busy,
  children,
}: {
  title?: string | null;
  summary?: string | null;
  busy: boolean;
  children?: React.ReactNode;
}) {
  return (
    <section className={`rounded-2xl border border-white/[0.08] bg-surface/85 p-4 ${busy ? 'opacity-60' : ''}`}>
      {title && <p className="text-sm font-medium text-zinc-200">{title}</p>}
      {summary && <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">{summary}</p>}
      {children}
    </section>
  );
}

function Toggle({ value, onChange, disabled }: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      onClick={() => onChange(!value)}
      disabled={disabled}
      aria-pressed={value}
      className={`relative h-7 w-12 shrink-0 overflow-hidden rounded-full border transition-colors disabled:opacity-40 ${
        value ? 'border-brand-400 bg-brand-500' : 'border-white/10 bg-white/10'
      }`}
    >
      <span
        className={`absolute left-0.5 top-0.5 h-5.5 w-5.5 rounded-full bg-white shadow transition-transform ${
          value ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

function PreferenceField({
  preference,
  busy,
  onChange,
}: {
  preference: Preference;
  busy: boolean;
  onChange: (patch: Omit<SourcePreferenceChangeInput, 'position'>) => void;
}) {
  switch (preference.__typename) {
    case 'CheckBoxPreference':
    case 'SwitchPreference': {
      const isSwitch = preference.__typename === 'SwitchPreference';
      const value = isSwitch
        ? (preference.switchCurrent ?? preference.switchDefault)
        : (preference.checkBoxCurrent ?? preference.checkBoxDefault);
      return (
        <section
          className={`flex items-center gap-4 rounded-2xl border border-white/[0.08] bg-surface/85 p-4 ${
            busy ? 'opacity-60' : ''
          }`}
        >
          <div className="min-w-0 flex-1">
            {preference.title && <p className="text-sm font-medium text-zinc-200">{preference.title}</p>}
            {preference.summary && (
              <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">{preference.summary}</p>
            )}
          </div>
          <Toggle
            value={value}
            disabled={!preference.enabled || busy}
            onChange={(next) => onChange(isSwitch ? { switchState: next } : { checkBoxState: next })}
          />
        </section>
      );
    }

    case 'EditTextPreference':
      return (
        <Shell title={preference.title} summary={preference.dialogMessage ?? preference.summary} busy={busy}>
          <EditText
            initial={preference.editTextCurrent ?? preference.editTextDefault ?? ''}
            disabled={!preference.enabled || busy}
            onCommit={(value) => onChange({ editTextState: value })}
          />
        </Shell>
      );

    case 'ListPreference': {
      const value = preference.listCurrent ?? preference.listDefault ?? '';
      return (
        <Shell title={preference.title} summary={preference.summary} busy={busy}>
          <select
            className={fieldClass}
            value={value}
            disabled={!preference.enabled || busy}
            onChange={(event) => onChange({ listState: event.target.value })}
          >
            {preference.entryValues.map((entryValue, index) => (
              <option key={entryValue} value={entryValue}>
                {preference.entries[index] ?? entryValue}
              </option>
            ))}
          </select>
        </Shell>
      );
    }

    case 'MultiSelectListPreference': {
      const selected = new Set(preference.multiSelectCurrent ?? preference.multiSelectDefault ?? []);
      return (
        <Shell
          title={preference.title}
          summary={preference.dialogMessage ?? preference.summary}
          busy={busy}
        >
          <div className="mt-2 space-y-2">
            {preference.entryValues.map((entryValue, index) => (
              <label
                key={entryValue}
                className="flex cursor-pointer items-center gap-2.5 text-sm text-zinc-200"
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-brand-500"
                  checked={selected.has(entryValue)}
                  disabled={!preference.enabled || busy}
                  onChange={(event) => {
                    const next = new Set(selected);
                    if (event.target.checked) next.add(entryValue);
                    else next.delete(entryValue);
                    onChange({ multiSelectState: [...next] });
                  }}
                />
                {preference.entries[index] ?? entryValue}
              </label>
            ))}
          </div>
        </Shell>
      );
    }
  }
}

function EditText({
  initial,
  disabled,
  onCommit,
}: {
  initial: string;
  disabled: boolean;
  onCommit: (value: string) => void;
}) {
  const [value, setValue] = useState(initial);
  const [dirty, setDirty] = useState(false);

  function commit() {
    if (!dirty) return;
    setDirty(false);
    onCommit(value);
  }

  return (
    <>
      <input
        className={fieldClass}
        value={value}
        disabled={disabled}
        onChange={(event) => {
          setValue(event.target.value);
          setDirty(true);
        }}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') commit();
          if (event.key === 'Escape') {
            setValue(initial);
            setDirty(false);
          }
        }}
      />
      {dirty && <p className="mt-1.5 text-xs text-zinc-500">Press Enter or tap away to save</p>}
    </>
  );
}

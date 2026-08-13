import type { FilterChangeInput, TriState } from '../gql/graphql';
import { XIcon } from './icons';

export type LeafFilter =
  | { __typename: 'CheckBoxFilter'; name: string; checkBoxDefault: boolean }
  | { __typename: 'TriStateFilter'; name: string; triStateDefault: TriState }
  | { __typename: 'TextFilter'; name: string; textDefault: string }
  | { __typename: 'SelectFilter'; name: string; values: string[]; selectDefault: number }
  | {
      __typename: 'SortFilter';
      name: string;
      values: string[];
      sortDefault?: { index: number; ascending: boolean } | null;
    }
  | { __typename: 'HeaderFilter'; name: string }
  | { __typename: 'SeparatorFilter'; name: string };

export type AnyFilter =
  | LeafFilter
  | { __typename: 'GroupFilter'; name: string; filters: LeafFilter[] };

export type FilterValue =
  | { kind: 'checkBox'; value: boolean }
  | { kind: 'triState'; value: TriState }
  | { kind: 'text'; value: string }
  | { kind: 'select'; value: number }
  | { kind: 'sort'; index: number; ascending: boolean };

export type FilterState = Record<string, FilterValue>;

function toChange(position: number, value: FilterValue): FilterChangeInput {
  switch (value.kind) {
    case 'checkBox':
      return { position, checkBoxState: value.value };
    case 'triState':
      return { position, triState: value.value };
    case 'text':
      return { position, textState: value.value };
    case 'select':
      return { position, selectState: value.value };
    case 'sort':
      return { position, sortState: { index: value.index, ascending: value.ascending } };
  }
}

export function buildFilterChanges(filters: AnyFilter[], state: FilterState): FilterChangeInput[] {
  const changes: FilterChangeInput[] = [];

  filters.forEach((filter, position) => {
    if (filter.__typename === 'GroupFilter') {
      filter.filters.forEach((_, childPosition) => {
        const value = state[`${position}.${childPosition}`];
        if (value) changes.push({ position, groupChange: toChange(childPosition, value) });
      });
      return;
    }
    const value = state[String(position)];
    if (value) changes.push(toChange(position, value));
  });

  return changes;
}

const TRI_LABEL: Record<TriState, string> = {
  IGNORE: 'Any',
  INCLUDE: 'Include',
  EXCLUDE: 'Exclude',
};

const TRI_NEXT: Record<TriState, TriState> = {
  IGNORE: 'INCLUDE',
  INCLUDE: 'EXCLUDE',
  EXCLUDE: 'IGNORE',
};

const inputClass =
  'mt-1.5 w-full rounded-xl border border-white/[0.09] bg-app px-3 py-2.5 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-brand-500/60';

export function FilterSheet({
  filters,
  state,
  onChange,
  onApply,
  onReset,
  onClose,
  busy,
}: {
  filters: AnyFilter[];
  state: FilterState;
  onChange: (next: FilterState) => void;
  onApply: () => void;
  onReset: () => void;
  onClose: () => void;
  busy?: boolean;
}) {
  function set(key: string, value: FilterValue) {
    onChange({ ...state, [key]: value });
  }

  const count = Object.keys(state).length;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm sm:items-center sm:justify-center">
      <div className="pb-safe flex max-h-[85dvh] w-full flex-col rounded-t-2xl border border-white/10 bg-surface sm:max-w-lg sm:rounded-2xl">
        <div className="flex items-center gap-3 border-b border-white/[0.08] px-4 py-3">
          <h2 className="flex-1 text-base font-semibold text-zinc-100">Filters</h2>
          {count > 0 && (
            <button onClick={onReset} className="text-xs font-medium text-zinc-400 hover:text-zinc-200">
              Reset
            </button>
          )}
          <button
            onClick={onClose}
            aria-label="Close filters"
            className="grid h-8 w-8 place-items-center rounded-full text-zinc-400 hover:bg-white/5"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {filters.length === 0 && (
            <p className="py-6 text-center text-sm text-zinc-500">This source has no filters.</p>
          )}
          {filters.map((filter, position) => (
            <FilterField
              key={`${filter.__typename}-${position}`}
              filter={filter}
              path={String(position)}
              state={state}
              set={set}
            />
          ))}
        </div>

        <div className="flex gap-2 border-t border-white/[0.08] px-4 py-3">
          <button
            onClick={onApply}
            disabled={busy}
            className="flex-1 rounded-xl bg-brand-500 px-4 py-3 text-sm font-semibold text-on-brand disabled:opacity-40"
          >
            {count > 0 ? `Apply ${count} filter${count === 1 ? '' : 's'}` : 'Apply'}
          </button>
        </div>
      </div>
    </div>
  );
}

function FilterField({
  filter,
  path,
  state,
  set,
}: {
  filter: AnyFilter;
  path: string;
  state: FilterState;
  set: (key: string, value: FilterValue) => void;
}) {
  switch (filter.__typename) {
    case 'HeaderFilter':
      return (
        <h3 className="pt-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
          {filter.name}
        </h3>
      );

    case 'SeparatorFilter':
      return <hr className="border-white/[0.08]" />;

    case 'GroupFilter':
      return (
        <fieldset className="rounded-xl border border-white/[0.08] px-3 py-2.5">
          <legend className="px-1 text-xs font-medium text-zinc-400">{filter.name}</legend>
          <div className="space-y-2.5">
            {filter.filters.map((child, index) => (
              <FilterField
                key={`${child.__typename}-${index}`}
                filter={child}
                path={`${path}.${index}`}
                state={state}
                set={set}
              />
            ))}
          </div>
        </fieldset>
      );

    case 'CheckBoxFilter': {
      const checked = (state[path] as { value: boolean } | undefined)?.value ?? filter.checkBoxDefault;
      return (
        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-zinc-200">
          <input
            type="checkbox"
            checked={checked}
            onChange={(event) => set(path, { kind: 'checkBox', value: event.target.checked })}
            className="h-4 w-4 accent-brand-500"
          />
          {filter.name}
        </label>
      );
    }

    case 'TriStateFilter': {
      const value = (state[path] as { value: TriState } | undefined)?.value ?? filter.triStateDefault;
      return (
        <button
          onClick={() => set(path, { kind: 'triState', value: TRI_NEXT[value] })}
          className="flex w-full items-center gap-2 text-left text-sm text-zinc-200"
        >
          <span
            className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold ${
              value === 'INCLUDE'
                ? 'bg-brand-500/20 text-brand-300'
                : value === 'EXCLUDE'
                  ? 'bg-red-500/15 text-red-300'
                  : 'bg-white/5 text-zinc-500'
            }`}
          >
            {TRI_LABEL[value]}
          </span>
          <span className="min-w-0 flex-1 truncate">{filter.name}</span>
        </button>
      );
    }

    case 'TextFilter': {
      const value = (state[path] as { value: string } | undefined)?.value ?? filter.textDefault;
      return (
        <label className="block text-xs font-medium text-zinc-300">
          {filter.name}
          <input
            className={inputClass}
            value={value}
            onChange={(event) => set(path, { kind: 'text', value: event.target.value })}
          />
        </label>
      );
    }

    case 'SelectFilter': {
      const value = (state[path] as { value: number } | undefined)?.value ?? filter.selectDefault;
      return (
        <label className="block text-xs font-medium text-zinc-300">
          {filter.name}
          <select
            className={inputClass}
            value={value}
            onChange={(event) => set(path, { kind: 'select', value: Number(event.target.value) })}
          >
            {filter.values.map((label, index) => (
              <option key={`${label}-${index}`} value={index}>
                {label}
              </option>
            ))}
          </select>
        </label>
      );
    }

    case 'SortFilter': {
      const current = state[path] as { index: number; ascending: boolean } | undefined;
      const index = current?.index ?? filter.sortDefault?.index ?? 0;
      const ascending = current?.ascending ?? filter.sortDefault?.ascending ?? false;
      return (
        <div className="text-xs font-medium text-zinc-300">
          {filter.name}
          <div className="mt-1.5 flex gap-2">
            <select
              className={`${inputClass} mt-0 flex-1`}
              value={index}
              onChange={(event) =>
                set(path, { kind: 'sort', index: Number(event.target.value), ascending })
              }
            >
              {filter.values.map((label, i) => (
                <option key={`${label}-${i}`} value={i}>
                  {label}
                </option>
              ))}
            </select>
            <button
              onClick={() => set(path, { kind: 'sort', index, ascending: !ascending })}
              title={ascending ? 'Ascending' : 'Descending'}
              className="shrink-0 rounded-xl border border-white/[0.09] bg-white/5 px-3 text-sm text-zinc-200 hover:bg-white/10"
            >
              {ascending ? '↑' : '↓'}
            </button>
          </div>
        </div>
      );
    }
  }
}

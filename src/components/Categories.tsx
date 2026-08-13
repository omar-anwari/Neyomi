import { useMemo, useState } from 'react';
import { useMutation, useQuery } from 'urql';
import {
  CategoriesQuery,
  CreateCategoryMutation,
  DeleteCategoryMutation,
  UpdateCategoryMutation,
  UpdateCategoryOrderMutation,
} from '../operations';
import type { IncludeOrExclude } from '../gql/graphql';
import { ChevronLeftIcon, XIcon } from './icons';
import { ErrorState, PageHeader, Spinner } from './ui';

const fieldClass =
  'w-full rounded-xl border border-white/[0.09] bg-app px-3 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/10';

export function Categories() {
  const context = useMemo(() => ({ additionalTypenames: ['CategoryType'] }), []);
  const [{ data, fetching, error }] = useQuery({ query: CategoriesQuery, context });
  const [, createCategory] = useMutation(CreateCategoryMutation);
  const [, updateCategory] = useMutation(UpdateCategoryMutation);
  const [, deleteCategory] = useMutation(DeleteCategoryMutation);
  const [, reorder] = useMutation(UpdateCategoryOrderMutation);

  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const categories = (data?.categories.nodes ?? []).filter((c) => !c.default);

  function flash(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 2600);
  }

  async function run(action: () => Promise<{ error?: unknown }>, message: string) {
    setBusy(true);
    const res = await action();
    setBusy(false);
    if (res.error) flash(String((res.error as Error).message ?? 'Failed'));
    else if (message) flash(message);
  }

  async function add() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setName('');
    await run(() => createCategory({ name: trimmed }), `Created ${trimmed}`);
  }

  async function move(id: number, position: number) {
    if (position < 0 || position >= categories.length) return;
    await run(() => reorder({ id, position }), '');
  }

  return (
    <div className="min-h-dvh">
      <PageHeader title="Categories" subtitle="Group your library" backTo="/settings" />
      <main className="mx-auto max-w-3xl px-4 pb-16 pt-5 sm:px-6">
        {error && <ErrorState message={`Failed to load categories: ${error.message}`} />}

        <section className="rounded-2xl border border-white/[0.08] bg-surface/85 p-4">
          <label className="block text-xs font-medium text-zinc-300">
            New category
            <div className="mt-1.5 flex gap-2">
              <input
                className={fieldClass}
                value={name}
                placeholder="Reading, Favourites, On hold…"
                onChange={(event) => setName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void add();
                }}
              />
              <button
                onClick={add}
                disabled={!name.trim() || busy}
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

        <section className="mt-6">
          <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Your categories
          </h2>
          <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-surface/85">
            {fetching && categories.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-zinc-500">Loading…</p>
            )}
            {!fetching && categories.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-zinc-500">
                No categories yet. Everything sits in the default list until you add one.
              </p>
            )}
            {categories.map((category, index) => (
              <CategoryRow
                key={category.id}
                category={category}
                divided={index > 0}
                first={index === 0}
                last={index === categories.length - 1}
                busy={busy}
                onRename={(next) =>
                  run(() => updateCategory({ id: category.id, patch: { name: next } }), `Renamed to ${next}`)
                }
                onToggleUpdate={(value) =>
                  run(
                    () => updateCategory({ id: category.id, patch: { includeInUpdate: value } }),
                    '',
                  )
                }
                onDelete={() =>
                  run(() => deleteCategory({ categoryId: category.id }), `Deleted ${category.name}`)
                }
                onMoveUp={() => move(category.id, index - 1)}
                onMoveDown={() => move(category.id, index + 1)}
              />
            ))}
          </div>
        </section>

        <p className="mt-4 px-1 text-xs leading-relaxed text-zinc-500">
          Deleting a category doesn't delete anything in it — those titles just fall back to the default list.
          Categories set to skip updates are left out when the library refreshes.
        </p>
      </main>
    </div>
  );
}

function CategoryRow({
  category,
  divided,
  first,
  last,
  busy,
  onRename,
  onToggleUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  category: {
    id: number;
    name: string;
    includeInUpdate: IncludeOrExclude;
    mangas: { totalCount: number };
  };
  divided: boolean;
  first: boolean;
  last: boolean;
  busy: boolean;
  onRename: (name: string) => void;
  onToggleUpdate: (value: IncludeOrExclude) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(category.name);
  const [confirming, setConfirming] = useState(false);

  const skipped = category.includeInUpdate === 'EXCLUDE';

  function commit() {
    const trimmed = draft.trim();
    setEditing(false);
    if (trimmed && trimmed !== category.name) onRename(trimmed);
    else setDraft(category.name);
  }

  return (
    <div className={`px-4 py-3 ${divided ? 'border-t border-white/[0.06]' : ''}`}>
      <div className="flex items-center gap-3">
        <div className="flex shrink-0 flex-col">
          <button
            onClick={onMoveUp}
            disabled={first || busy}
            aria-label="Move up"
            className="grid h-5 w-5 place-items-center text-zinc-500 hover:text-zinc-200 disabled:opacity-25"
          >
            <ChevronLeftIcon className="h-4 w-4 rotate-90" />
          </button>
          <button
            onClick={onMoveDown}
            disabled={last || busy}
            aria-label="Move down"
            className="grid h-5 w-5 place-items-center text-zinc-500 hover:text-zinc-200 disabled:opacity-25"
          >
            <ChevronLeftIcon className="h-4 w-4 -rotate-90" />
          </button>
        </div>

        <div className="min-w-0 flex-1">
          {editing ? (
            <input
              autoFocus
              className={fieldClass}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onBlur={commit}
              onKeyDown={(event) => {
                if (event.key === 'Enter') commit();
                if (event.key === 'Escape') {
                  setDraft(category.name);
                  setEditing(false);
                }
              }}
            />
          ) : (
            <button onClick={() => setEditing(true)} className="block w-full text-left">
              <span className="block truncate text-sm font-medium text-zinc-200">{category.name}</span>
              <span className="mt-0.5 block text-xs text-zinc-500">
                {category.mangas.totalCount} title{category.mangas.totalCount === 1 ? '' : 's'}
                {skipped && ' · skipped on update'}
              </span>
            </button>
          )}
        </div>

        {!editing && (
          <div className="flex shrink-0 items-center gap-1">
            <button
              onClick={() => onToggleUpdate(skipped ? 'INCLUDE' : 'EXCLUDE')}
              disabled={busy}
              title={skipped ? 'Include when the library updates' : 'Skip when the library updates'}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                skipped
                  ? 'border-white/10 bg-white/5 text-zinc-400'
                  : 'border-brand-500/40 bg-brand-500/15 text-brand-300'
              }`}
            >
              {skipped ? 'Skipped' : 'Updates'}
            </button>
            <button
              onClick={() => setConfirming((v) => !v)}
              aria-label={`Delete ${category.name}`}
              className="grid h-8 w-8 place-items-center rounded-full text-zinc-500 hover:bg-red-500/10 hover:text-red-300"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {confirming && (
        <div className="mt-2 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2">
          <p className="min-w-0 flex-1 text-xs text-red-200">Delete “{category.name}”?</p>
          <button
            onClick={() => {
              setConfirming(false);
              onDelete();
            }}
            className="shrink-0 rounded-full bg-red-500/80 px-3 py-1 text-xs font-semibold text-white"
          >
            Delete
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="shrink-0 rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-300"
          >
            Keep
          </button>
        </div>
      )}
    </div>
  );
}

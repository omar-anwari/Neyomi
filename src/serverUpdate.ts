import { useQuery } from 'urql';
import { AboutServerQuery, ServerUpdatesQuery } from './operations';

const DISMISSED_KEY = 'neyomi.dismissedServerUpdate';

export function isNewerVersion(candidate: string, current: string) {
  const parse = (value: string) => value.replace(/^v/i, '').split('.').map((part) => Number.parseInt(part, 10) || 0);
  const a = parse(candidate);
  const b = parse(current);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff > 0;
  }
  return false;
}

export function useServerUpdate() {
  const [{ data, error }] = useQuery({ query: AboutServerQuery });
  const [{ data: updatesData, fetching: checking, error: updatesError }] = useQuery({ query: ServerUpdatesQuery });
  const about = data?.aboutServer;
  const updates = updatesData?.checkForServerUpdates ?? [];
  const newer = about ? updates.filter((update) => isNewerVersion(update.tag, about.version)) : [];
  const sameChannel = about
    ? newer.find((update) => update.channel.toLowerCase() === about.buildType.toLowerCase())
    : undefined;
  const otherChannels = newer.filter((update) => update !== sameChannel);
  return { about, error, checking, updatesError, sameChannel, otherChannels };
}

export function loadDismissedUpdate() {
  try {
    return localStorage.getItem(DISMISSED_KEY);
  } catch {
    return null;
  }
}

export function saveDismissedUpdate(tag: string) {
  try {
    localStorage.setItem(DISMISSED_KEY, tag);
  } catch {
    return;
  }
}

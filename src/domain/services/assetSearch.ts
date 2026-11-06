import type { Asset } from '../entities/Asset';

export interface AssetQuery {
  /** Words that must all appear in the name, credit, caption or a tag (any case). */
  text?: string;
  /** Show only photos carrying this tag. */
  tag?: string;
}

const lower = (s: string) => s.normalize('NFC').toLowerCase();

const haystack = (a: Asset): string =>
  lower([a.name ?? '', a.credit ?? '', a.caption ?? '', ...(a.tags ?? [])].join(' '));

export const searchAssets = (assets: readonly Asset[], query: AssetQuery): Asset[] => {
  const words = lower(query.text ?? '').split(/\s+/).filter(Boolean);
  const tag = query.tag ? lower(query.tag) : undefined;
  return assets.filter((a) => {
    if (tag && !(a.tags ?? []).some((t) => lower(t) === tag)) return false;
    const text = haystack(a);
    return words.every((w) => text.includes(w));
  });
};

/** Every tag in use with how many photos carry it, commonest first. */
export const tagCounts = (assets: readonly Asset[]): { tag: string; count: number }[] => {
  const counts = new Map<string, number>();
  for (const a of assets) for (const t of a.tags ?? []) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
};

/** Trims, drops blanks and repeats (ignoring case), and keeps the first spelling. */
export const normalizeTags = (tags: readonly string[]): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    const tag = raw.normalize('NFC').trim();
    if (tag === '' || seen.has(tag.toLowerCase())) continue;
    seen.add(tag.toLowerCase());
    out.push(tag);
  }
  return out;
};

import type { PreflightIssue } from '@domain/services/preflight';

/** The families the newspaper is typeset in: Latin faces and the Telugu faces behind them. */
const FAMILIES: readonly { family: string; sample: string }[] = [
  { family: 'Source Serif 4', sample: 'News' },
  { family: 'Playfair Display', sample: 'News' },
  { family: 'Inter', sample: 'News' },
  { family: 'Noto Serif Telugu', sample: 'తెలుగు' },
  { family: 'Noto Sans Telugu', sample: 'తెలుగు' },
];

/**
 * Tries to load every typeface the pages use, so a font that failed to download is reported
 * before print instead of silently replaced by a fallback that shapes Telugu differently.
 */
export async function checkFonts(): Promise<PreflightIssue[]> {
  if (!('fonts' in document)) return [];
  const results = await Promise.all(
    FAMILIES.map(async ({ family, sample }) => {
      try {
        const faces = await document.fonts.load(`16px "${family}"`, sample);
        return faces.length > 0 ? undefined : family;
      } catch {
        return family;
      }
    }),
  );
  return results
    .filter((family): family is string => family !== undefined)
    .map((family) => ({ code: 'fontMissing', severity: 'error', page: 0, params: { family } }));
}

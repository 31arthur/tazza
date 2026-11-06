import type { Language } from '../value-objects/Language';

const TELUGU = /[ఀ-౿]/gu;
const LATIN = /[A-Za-z]/g;

/**
 * Picks the language of a piece of text from its script, so writers never have to choose.
 * Telugu wins when it makes up at least a third of the letters (Telugu needs taller lines).
 */
export const detectLanguage = (text: string): Language => {
  const telugu = (text.match(TELUGU) ?? []).length;
  const latin = (text.match(LATIN) ?? []).length;
  return telugu > 0 && telugu * 2 >= latin ? 'te' : 'en';
};

import { detectLanguage } from './detectLanguage';

describe('detectLanguage', () => {
  it('detects English', () => {
    expect(detectLanguage('The government announced a new scheme')).toBe('en');
  });

  it('detects Telugu', () => {
    expect(detectLanguage('ప్రభుత్వం ఈరోజు కొత్త పథకాన్ని ప్రకటించింది')).toBe('te');
  });

  it('treats text that is mostly English with a Telugu word as English', () => {
    expect(detectLanguage('Chief Minister visited the Hyderabad office today and met staff జై')).toBe(
      'en',
    );
  });

  it('treats mostly-Telugu text with English words as Telugu', () => {
    expect(detectLanguage('ముఖ్యమంత్రి Hyderabad లో కొత్త పథకాన్ని ప్రారంభించారు')).toBe('te');
  });

  it('falls back to English for digits and punctuation', () => {
    expect(detectLanguage('2026 - 11 - 06')).toBe('en');
  });
});

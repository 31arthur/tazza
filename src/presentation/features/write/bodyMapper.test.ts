import type { ArticleBody } from '@domain/entities/Article';
import { bodyToTiptap, tiptapToBody } from './bodyMapper';

describe('bodyMapper', () => {
  it('round-trips mixed Telugu and English content with marks, lists and images', () => {
    const body: ArticleBody = [
      {
        type: 'paragraph',
        children: [
          { text: 'ముఖ్యమంత్రి ', marks: ['bold'] },
          { text: 'visited Hyderabad today' },
        ],
      },
      { type: 'subhead', children: [{ text: 'నేపథ్యం' }] },
      { type: 'pullquote', children: [{ text: 'A quote', marks: ['italic'] }] },
      { type: 'list', ordered: false, items: [[{ text: 'ఒకటి' }], [{ text: 'two' }]] },
      { type: 'image', assetId: 'asset-1', caption: 'ఫోటో' },
    ];
    expect(tiptapToBody(bodyToTiptap(body))).toEqual(body);
  });

  it('normalises Telugu to NFC when reading from the editor', () => {
    const decomposed = 'ఔ'.normalize('NFD');
    const body = tiptapToBody({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: decomposed }] }],
    });
    expect(body[0]).toEqual({
      type: 'paragraph',
      children: [{ text: decomposed.normalize('NFC') }],
    });
  });
});

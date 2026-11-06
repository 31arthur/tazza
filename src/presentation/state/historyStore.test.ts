import type { Edition } from '@domain/entities/Edition';
import { makeLeaf } from '@domain/layout/tree';
import { useHistoryStore } from './historyStore';

const edition = (id: string, tag: string): Edition => ({
  id,
  pages: [{ number: 1, layout: makeLeaf(tag) }],
});

const tagOf = (e: Edition | undefined) => (e?.pages[0]?.layout.id ?? 'none');

describe('history store', () => {
  beforeEach(() => useHistoryStore.setState({ past: {}, future: {} }));

  it('undoes and redoes in order', () => {
    const h = useHistoryStore.getState();
    h.record('e', edition('e', 'v1'));
    h.record('e', edition('e', 'v2'));

    const back = useHistoryStore.getState().undo('e', edition('e', 'v3'));
    expect(tagOf(back)).toBe('v2');
    const back2 = useHistoryStore.getState().undo('e', edition('e', 'v2'));
    expect(tagOf(back2)).toBe('v1');
    expect(useHistoryStore.getState().undo('e', edition('e', 'v1'))).toBeUndefined();

    // Redo returns the state we most recently stepped back from, then the one before it.
    const forward = useHistoryStore.getState().redo('e', edition('e', 'v1'));
    expect(tagOf(forward)).toBe('v2');
    const forward2 = useHistoryStore.getState().redo('e', edition('e', 'v2'));
    expect(tagOf(forward2)).toBe('v3');
    expect(useHistoryStore.getState().redo('e', edition('e', 'v3'))).toBeUndefined();
  });

  it('drops redo history when a new change is recorded', () => {
    const h = useHistoryStore.getState();
    h.record('e', edition('e', 'v1'));
    useHistoryStore.getState().undo('e', edition('e', 'v2'));
    expect(useHistoryStore.getState().future['e']).toHaveLength(1);

    useHistoryStore.getState().record('e', edition('e', 'v3'));
    expect(useHistoryStore.getState().future['e']).toHaveLength(0);
  });

  it('keeps editions separate and caps the stack', () => {
    for (let i = 0; i < 60; i++) useHistoryStore.getState().record('a', edition('a', `v${i}`));
    useHistoryStore.getState().record('b', edition('b', 'only'));
    expect(useHistoryStore.getState().past['a']).toHaveLength(50);
    expect(useHistoryStore.getState().past['b']).toHaveLength(1);
  });
});

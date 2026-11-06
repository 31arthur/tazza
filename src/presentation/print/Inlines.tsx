import { Fragment, type ReactNode } from 'react';
import type { Inline } from '@domain/entities/Article';

export function Inlines({ runs }: { runs: readonly Inline[] }) {
  return (
    <>
      {runs.map((run, index) => {
        let node: ReactNode = run.text;
        if (run.marks?.includes('bold')) node = <strong>{node}</strong>;
        if (run.marks?.includes('italic')) node = <em>{node}</em>;
        if (run.marks?.includes('underline')) node = <u>{node}</u>;
        return <Fragment key={index}>{node}</Fragment>;
      })}
    </>
  );
}

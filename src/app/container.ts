import { SystemClock } from '@data/services/SystemClock';
import { UuidGenerator } from '@data/services/UuidGenerator';
import type { Clock } from '@domain/ports/services/Clock';
import type { IdGenerator } from '@domain/ports/services/IdGenerator';

export interface Container {
  clock: Clock;
  ids: IdGenerator;
}

/** Composition root: the only place adapters are constructed. */
export const createContainer = (): Container => ({
  clock: new SystemClock(),
  ids: new UuidGenerator(),
});

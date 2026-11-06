import type { Clock } from '@domain/ports/services/Clock';

export class SystemClock implements Clock {
  now(): number {
    return Date.now();
  }
}

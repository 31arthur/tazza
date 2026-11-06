import type { IdGenerator } from '@domain/ports/services/IdGenerator';

export class UuidGenerator implements IdGenerator {
  next(): string {
    return crypto.randomUUID();
  }
}

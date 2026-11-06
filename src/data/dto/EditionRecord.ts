import type { Edition } from '@domain/entities/Edition';

export interface EditionRecord extends Edition {
  schema: 1;
}

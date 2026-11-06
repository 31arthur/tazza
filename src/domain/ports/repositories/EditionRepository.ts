import type { Edition } from '../../entities/Edition';

export interface EditionRepository {
  find(id: string): Promise<Edition | undefined>;
  list(): Promise<Edition[]>;
  save(edition: Edition): Promise<void>;
}

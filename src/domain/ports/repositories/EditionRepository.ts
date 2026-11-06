import type { Edition } from '../../entities/Edition';

export interface EditionRepository {
  find(id: string): Promise<Edition | undefined>;
  save(edition: Edition): Promise<void>;
}

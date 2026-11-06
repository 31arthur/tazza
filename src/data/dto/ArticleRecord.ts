import type { Article } from '@domain/entities/Article';

/** Persisted shape of an article. `schema` lets future migrations upgrade old rows. */
export interface ArticleRecord extends Article {
  schema: 1;
}

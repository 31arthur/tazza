import type { Article } from '@domain/entities/Article';
import type { Edition } from '@domain/entities/Edition';
import type { ArticleRecord } from '../dto/ArticleRecord';
import type { EditionRecord } from '../dto/EditionRecord';

export const articleToRecord = (a: Article): ArticleRecord => ({ ...a, schema: 1 });

export const articleFromRecord = ({ schema: _schema, ...article }: ArticleRecord): Article =>
  article;

export const editionToRecord = (e: Edition): EditionRecord => ({ ...e, schema: 1 });

export const editionFromRecord = ({ schema: _schema, ...edition }: EditionRecord): Edition =>
  edition;

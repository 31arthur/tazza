import { Check, Layers2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Master } from '@domain/entities/Master';
import { Button } from '../../components/ui/button';

interface Props {
  masters: readonly Master[];
  /** The master the current page uses. */
  assignedId: string | undefined;
  /** The master being edited right now, if any. */
  editingId: string | undefined;
  onAssign: (masterId: string | undefined) => void;
  onCreateFromPage: () => void;
  onEdit: (masterId: string) => void;
  onDone: () => void;
  onRename: (masterId: string) => void;
  onDelete: (masterId: string) => void;
}

/**
 * Masters repeat objects (a header rule, a running label, a watermark) on every page that uses
 * them. Pick one for this page, make one from this page's objects, or edit one for all pages.
 */
export function MasterBar({
  masters,
  assignedId,
  editingId,
  onAssign,
  onCreateFromPage,
  onEdit,
  onDone,
  onRename,
  onDelete,
}: Props) {
  const { t } = useTranslation();
  const editing = masters.find((m) => m.id === editingId);

  if (editing) {
    return (
      <div className="flex items-center gap-2 rounded-md bg-amber-100 px-2 py-1 text-sm text-amber-900">
        <Layers2 className="size-4" />
        <span>{t('masters.editing', { name: editing.name })}</span>
        <Button size="sm" variant="ghost" onClick={() => onRename(editing.id)}>
          <Pencil /> {t('masters.rename')}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onDelete(editing.id)}>
          <Trash2 /> {t('masters.delete')}
        </Button>
        <Button size="sm" onClick={onDone}>
          <Check /> {t('masters.done')}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Layers2 className="size-4 text-muted-foreground" />
      <select
        aria-label={t('masters.master')}
        title={t('masters.hint')}
        className="h-8 rounded-md border bg-transparent px-2 text-sm"
        value={assignedId ?? ''}
        onChange={(e) => onAssign(e.target.value || undefined)}
      >
        <option value="">{t('masters.none')}</option>
        {masters.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
      {assignedId && (
        <Button size="sm" variant="ghost" onClick={() => onEdit(assignedId)}>
          <Pencil /> {t('masters.edit')}
        </Button>
      )}
      <Button size="sm" variant="ghost" onClick={onCreateFromPage} title={t('masters.createHint')}>
        <Plus /> {t('masters.create')}
      </Button>
    </div>
  );
}

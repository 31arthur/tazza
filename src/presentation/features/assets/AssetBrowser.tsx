import { useRef, useState, type DragEvent } from 'react';
import { ImagePlus, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Asset } from '@domain/entities/Asset';
import { searchAssets, tagCounts } from '@domain/services/assetSearch';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useAssetUrl } from '../../hooks/useAssetUrl';
import { cn } from '../../lib/utils';
import { useAssetActions, useAssets } from '../queries';

function Thumb({ asset, usage, selected, onClick }: {
  asset: Asset;
  usage: number;
  selected: boolean;
  onClick: () => void;
}) {
  const url = useAssetUrl(asset.id);
  return (
    <button
      type="button"
      onClick={onClick}
      title={asset.name ?? ''}
      aria-pressed={selected}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-md border bg-background text-left',
        selected && 'ring-2 ring-blue-500',
      )}
    >
      <div className="aspect-[4/3] w-full bg-muted">
        {url && <img src={url} alt="" draggable={false} className="size-full object-cover" />}
      </div>
      <div className="flex items-center gap-1 p-1.5">
        <span className="min-w-0 flex-1 truncate text-xs">{asset.name ?? '—'}</span>
        {usage > 0 && <Badge variant="secondary">{usage}</Badge>}
      </div>
    </button>
  );
}

interface Props {
  /** Called when a photo is clicked in picking mode. */
  onPick?: (asset: Asset) => void;
  selectedId?: string | undefined;
  onSelect?: (asset: Asset) => void;
}

/** Search, tag filter, upload (button or drop) and a grid of every photo in the library. */
export function AssetBrowser({ onPick, selectedId, onSelect }: Props) {
  const { t } = useTranslation();
  const { data: items = [] } = useAssets();
  const { upload } = useAssetActions();
  const fileInput = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');
  const [tag, setTag] = useState<string | undefined>();

  const assets = items.map((i) => i.asset);
  const usage = new Map(items.map((i) => [i.asset.id, i.usage]));
  const shown = searchAssets(assets, { text, ...(tag && { tag }) });
  const tags = tagCounts(assets);

  const addFiles = async (files: FileList | null) => {
    if (!files) return;
    const saved = await upload([...files]);
    const only = saved.length === 1 ? saved[0] : undefined;
    if (only) (onPick ?? onSelect)?.(only);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    void addFiles(e.dataTransfer.files);
  };

  return (
    <div
      className="flex flex-col gap-3"
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 size-4 text-muted-foreground" />
          <Input
            className="pl-8"
            value={text}
            placeholder={t('photos.search')}
            aria-label={t('photos.search')}
            onChange={(e) => setText(e.target.value)}
          />
        </div>
        <Button onClick={() => fileInput.current?.click()}>
          <ImagePlus /> {t('photos.upload')}
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          aria-hidden
          tabIndex={-1}
          onChange={(e) => {
            void addFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <Button size="sm" variant={tag ? 'outline' : 'secondary'} onClick={() => setTag(undefined)}>
            {t('photos.allTags')}
          </Button>
          {tags.map(({ tag: name, count }) => (
            <Button
              key={name}
              size="sm"
              variant={tag === name ? 'secondary' : 'outline'}
              onClick={() => setTag(tag === name ? undefined : name)}
            >
              {name} · {count}
            </Button>
          ))}
        </div>
      )}

      {items.length === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          {t('photos.empty')}
        </p>
      ) : shown.length === 0 ? (
        <p className="p-4 text-center text-sm text-muted-foreground">{t('photos.noMatch')}</p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-3">
          {shown.map((asset) => (
            <Thumb
              key={asset.id}
              asset={asset}
              usage={usage.get(asset.id) ?? 0}
              selected={asset.id === selectedId}
              onClick={() => (onPick ?? onSelect)?.(asset)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

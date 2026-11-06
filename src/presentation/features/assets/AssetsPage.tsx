import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { normalizeTags } from '@domain/services/assetSearch';
import type { Asset } from '@domain/entities/Asset';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useAssetUrl } from '../../hooks/useAssetUrl';
import { useAssetActions, useAssets } from '../queries';
import { AssetBrowser } from './AssetBrowser';

function Details({ asset, usage }: { asset: Asset; usage: number }) {
  const { t } = useTranslation();
  const url = useAssetUrl(asset.id);
  const { updateMeta, remove } = useAssetActions();

  const text = (label: string, value: string, commit: (v: string) => void) => (
    <label className="flex flex-col gap-1 text-xs text-muted-foreground" key={`${asset.id}-${label}`}>
      {label}
      <Input
        defaultValue={value}
        onBlur={(e) => e.target.value !== value && commit(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      />
    </label>
  );

  return (
    <aside className="flex w-80 shrink-0 flex-col gap-3 overflow-y-auto border-l bg-card p-4">
      {url && <img src={url} alt="" className="max-h-56 w-full rounded border object-contain" />}
      <p className="text-xs text-muted-foreground">
        {asset.widthPx} × {asset.heightPx} px · {Math.round(asset.byteSize / 1024)} KB ·{' '}
        {t('photos.usedIn', { count: usage })}
      </p>
      {text(t('photos.name'), asset.name ?? '', (name) => void updateMeta(asset.id, { name }))}
      {text(t('photos.credit'), asset.credit ?? '', (credit) => void updateMeta(asset.id, { credit }))}
      {text(t('photos.caption'), asset.caption ?? '', (caption) => void updateMeta(asset.id, { caption }))}
      {text(t('photos.tags'), (asset.tags ?? []).join(', '), (value) =>
        void updateMeta(asset.id, { tags: normalizeTags(value.split(',')) }),
      )}
      <Button
        variant="outline"
        disabled={usage > 0}
        title={usage > 0 ? t('photos.inUse') : undefined}
        onClick={() => window.confirm(t('photos.confirmDelete')) && void remove(asset.id)}
      >
        <Trash2 /> {t('photos.delete')}
      </Button>
    </aside>
  );
}

/** The photo library: find, describe and reuse photos across stories and editions. */
export function AssetsPage() {
  const { t } = useTranslation();
  const { data: items = [] } = useAssets();
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const selected = items.find((i) => i.asset.id === selectedId);

  return (
    <div className="flex h-full">
      <div className="min-w-0 flex-1 overflow-y-auto p-6">
        <h1 className="mb-4 text-lg font-semibold">{t('photos.title')}</h1>
        <AssetBrowser selectedId={selectedId} onSelect={(a) => setSelectedId(a.id)} />
      </div>
      {selected && <Details asset={selected.asset} usage={selected.usage} />}
    </div>
  );
}

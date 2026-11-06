import { useRef } from 'react';
import { ImagePlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { Element } from '@domain/layout/element';
import { detectLanguage } from '@domain/services/detectLanguage';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { useUseCases } from '../../hooks/AppContext';
import { isImageFile, prepareImage } from '../../lib/image';

interface Props {
  /** Changes when a different tile is selected, so fields reset to its content. */
  tileId: string;
  element: Element;
  onChange: (element: Element) => void;
}

/** Edits the content of an element tile: photo and caption, heading and text, label or note. */
export function ElementPanel({ tileId, element, onChange }: Props) {
  const { t } = useTranslation();
  const { saveAsset } = useUseCases();
  const fileInput = useRef<HTMLInputElement>(null);

  const field = (label: string, value: string, commit: (v: string) => void, area = false) => (
    <label className="flex flex-col gap-1 text-xs text-muted-foreground" key={`${tileId}-${label}`}>
      {label}
      {area ? (
        <Textarea
          rows={5}
          defaultValue={value}
          lang={detectLanguage(value)}
          onBlur={(e) => e.target.value !== value && commit(e.target.value)}
        />
      ) : (
        <Input
          defaultValue={value}
          lang={detectLanguage(value)}
          onBlur={(e) => e.target.value !== value && commit(e.target.value)}
        />
      )}
    </label>
  );

  const pickPhoto = async (file: File) => {
    try {
      const asset = await saveAsset.execute(await prepareImage(file));
      if (element.type === 'photo') onChange({ ...element, assetId: asset.id });
    } catch {
      toast.error(t('write.imageFailed'));
    }
  };

  return (
    <div className="flex flex-col gap-3 border-t pt-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t(`elements.kinds.${element.type === 'text' ? 'text' : element.type}`)}
      </h3>
      {element.type === 'photo' && (
        <>
          <Button variant="outline" onClick={() => fileInput.current?.click()}>
            <ImagePlus /> {t('elements.choosePhoto')}
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="hidden"
            aria-hidden
            tabIndex={-1}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file && isImageFile(file)) void pickPhoto(file);
            }}
          />
          {field(t('elements.caption'), element.caption, (caption) =>
            onChange({ ...element, caption }),
          )}
        </>
      )}
      {element.type === 'text' && (
        <>
          {field(t('elements.heading'), element.heading, (heading) =>
            onChange({ ...element, heading }),
          )}
          {field(
            t('elements.body'),
            element.body,
            (body) => onChange({ ...element, body }),
            true,
          )}
        </>
      )}
      {element.type === 'label' &&
        field(t('elements.labelText'), element.text, (text) => onChange({ ...element, text }))}
      {element.type === 'ad' &&
        field(t('elements.adNote'), element.note, (note) => onChange({ ...element, note }))}
    </div>
  );
}

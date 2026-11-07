import { useRef, useState } from 'react';
import { FileImage, FileText, FolderOpen, Loader2, Printer, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { downloadBlob } from '../../lib/download';
import { useEditionFiles } from '../queries';

/**
 * Ways to get the edition out: a PDF and page images from the Chromium companion, the browser
 * print dialog, and a backup file of the whole edition with a way to restore one.
 */
export function ExportMenu({
  marks,
  pageCount,
  onPrint,
  canPrint,
}: {
  marks: boolean;
  pageCount: number;
  onPrint: () => void;
  canPrint: boolean;
}) {
  const { t } = useTranslation();
  const { editionId, bundle, render, restore } = useEditionFiles();
  const [busy, setBusy] = useState<'pdf' | 'png' | undefined>();
  const restoreInput = useRef<HTMLInputElement>(null);

  const exportPdf = async () => {
    setBusy('pdf');
    const file = await render({ format: 'pdf', marks }, t('export.noCompanion'));
    setBusy(undefined);
    if (file) downloadBlob(file, `tazza-${editionId}.pdf`);
  };

  const exportPng = async () => {
    setBusy('png');
    for (let page = 1; page <= pageCount; page += 1) {
      const file = await render({ format: 'png', marks: false, page }, t('export.noCompanion'));
      if (!file) break;
      downloadBlob(file, `tazza-${editionId}-page-${page}.png`);
    }
    setBusy(undefined);
  };

  const spin = (kind: 'pdf' | 'png', icon: React.ReactNode) =>
    busy === kind ? <Loader2 className="animate-spin" /> : icon;

  return (
    <div className="flex flex-col gap-2">
      <Button size="lg" disabled={busy !== undefined || !canPrint} onClick={() => void exportPdf()}>
        {spin('pdf', <FileText />)} {t('export.pdf')}
      </Button>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" disabled={busy !== undefined || !canPrint} onClick={() => void exportPng()}>
          {spin('png', <FileImage />)} {t('export.png')}
        </Button>
        <Button variant="outline" disabled={!canPrint} onClick={onPrint}>
          <Printer /> {t('export.printDialog')}
        </Button>
      </div>
      <div className="mt-2 flex items-center gap-2 border-t pt-3 text-xs text-muted-foreground">
        <span className="flex-1">{t('export.backupLabel')}</span>
        <Button
          variant="ghost"
          size="icon"
          title={t('export.backup')}
          aria-label={t('export.backup')}
          onClick={async () => {
            try {
              const { blob, fileName } = await bundle();
              downloadBlob(blob, fileName);
            } catch {
              toast.error(t('export.backupFailed'));
            }
          }}
        >
          <Save />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          title={t('export.restore')}
          aria-label={t('export.restore')}
          onClick={() => restoreInput.current?.click()}
        >
          <FolderOpen />
        </Button>
        <input
          ref={restoreInput}
          type="file"
          accept=".json,application/json"
          className="hidden"
          aria-hidden
          tabIndex={-1}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file && (await restore(file))) toast.success(t('export.restored'));
          }}
        />
      </div>
    </div>
  );
}

import { useRef, useState } from 'react';
import { FileImage, FileText, FolderOpen, Loader2, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { downloadBlob } from '../../lib/download';
import { useEditionFiles } from '../queries';

/**
 * One-click PDF and page images (rendered by the Chromium companion that runs with the dev
 * server), plus a backup file of the whole edition and a way to restore one.
 */
export function ExportMenu({ marks, pageCount }: { marks: boolean; pageCount: number }) {
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
    <div className="flex items-center gap-1">
      <Button variant="outline" disabled={busy !== undefined} onClick={() => void exportPdf()}>
        {spin('pdf', <FileText />)} {t('export.pdf')}
      </Button>
      <Button variant="outline" disabled={busy !== undefined} onClick={() => void exportPng()}>
        {spin('png', <FileImage />)} {t('export.png')}
      </Button>
      <Button
        variant="outline"
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
        variant="outline"
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
  );
}

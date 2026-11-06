import { useTranslation } from 'react-i18next';
import type { Asset } from '@domain/entities/Asset';
import { Modal } from '../../components/Modal';
import { AssetBrowser } from './AssetBrowser';

/** Choose a photo from the library (or upload a new one) without leaving the editor. */
export function AssetPicker({
  onPick,
  onClose,
}: {
  onPick: (asset: Asset) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Modal title={t('photos.pickTitle')} onClose={onClose}>
      <AssetBrowser
        onPick={(asset) => {
          onPick(asset);
          onClose();
        }}
      />
    </Modal>
  );
}

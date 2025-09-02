import { NFDeleteManager } from './NFDeleteManager';
import { FluxoNFs } from '@/components/NfLists/FluxoNFs';

export function FluxoNFsComExclusao() {
  return (
    <NFDeleteManager>
      {({ canDelete, onDelete }) => (
        <FluxoNFs 
          canDelete={canDelete}
          onDelete={onDelete}
        />
      )}
    </NFDeleteManager>
  );
}
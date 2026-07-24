import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

interface YAMLEditorNewDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  t: (key: string) => string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function YAMLEditorNewDocumentDialog({
  open,
  onOpenChange,
  t,
  onCancel,
  onConfirm,
}: YAMLEditorNewDocumentDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('yamlEditor.newDocumentTitle')}</DialogTitle>
          <DialogDescription>{t('yamlEditor.confirmNewDocument')}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            className="border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300"
          >
            {t('yamlEditor.cancel')}
          </Button>
          <Button
            size="sm"
            onClick={onConfirm}
            className="bg-yellow-400 hover:bg-yellow-300 text-black font-bold"
          >
            {t('yamlEditor.newDocumentConfirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

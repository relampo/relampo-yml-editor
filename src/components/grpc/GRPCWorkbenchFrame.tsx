import type { ReactNode } from 'react';
import { Network } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';

export function GRPCWorkbenchFrame({
  page,
  open,
  onOpenChange,
  children,
}: {
  page: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  if (page) return <main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#0a0a0a]">{children}</main>;
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="flex h-[90vh] w-[min(1200px,95vw)] max-w-none! flex-col gap-0 overflow-hidden bg-[#0a0a0a] p-0">
        {children}
      </DialogContent>
    </Dialog>
  );
}
export function GRPCWorkbenchHeader({ page }: { page: boolean }) {
  const title = (
    <>
      <Network className="h-5 w-5 text-cyan-400" />
      {page ? 'gRPC Recorder' : 'gRPC testing'}
    </>
  );
  const description =
    'Connect or import a contract, select operations, provide test data and add them to your scenario.';
  const headerClass = 'shrink-0 border-b border-white/5 bg-[#111111] px-6 py-4';
  if (page)
    return (
      <header className={headerClass + ' space-y-2'}>
        <h1 className="flex items-center gap-2 text-lg font-bold text-white">{title}</h1>
        <p className="text-sm text-zinc-400">{description}</p>
      </header>
    );
  return (
    <DialogHeader className={headerClass}>
      <DialogTitle className="flex items-center gap-2">{title}</DialogTitle>
      <DialogDescription>{description}</DialogDescription>
    </DialogHeader>
  );
}

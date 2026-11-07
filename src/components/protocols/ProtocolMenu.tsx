import { Cable, ChevronDown, Globe, Layers, Network } from 'lucide-react';
import type { StudioProtocol } from '../../utils/protocolProject';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
export function ProtocolMenu({
  language,
  grpcEnabled,
  onSelect,
}: {
  language: string;
  grpcEnabled: boolean;
  onSelect: (protocol: StudioProtocol) => void;
}) {
  const spanish = language === 'es';
  const protocols = [
    {
      id: 'grpc',
      label: 'gRPC',
      Icon: Network,
      color: 'text-cyan-300',
      description: spanish ? 'Descubrir, importar y grabar' : 'Discover, import and record',
    },
    {
      id: 'websocket',
      label: 'WebSocket',
      Icon: Cable,
      color: 'text-violet-300',
      description: spanish ? 'Crear una sesión de mensajes' : 'Create a messaging session',
    },
    {
      id: 'https',
      label: 'HTTPS',
      Icon: Globe,
      color: 'text-emerald-300',
      description: spanish ? 'Crear una petición HTTP' : 'Create an HTTP request',
    },
  ] as const;
  return (
    // A selected item opens a modal dialog. Keep the menu non-modal so its
    // closing animation cannot restore a stale pointer lock over that dialog.
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger className="inline-flex h-8 items-center justify-center gap-2 rounded-md border border-white/15 bg-white/5 px-3 text-sm font-semibold text-zinc-200 shadow-sm transition-colors hover:border-white/25 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-yellow-400/40">
        <Layers className="h-4 w-4" />
        Other Protocols
        <ChevronDown className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-65 border border-white/10 bg-[#111111] p-1.5 text-zinc-200"
      >
        <DropdownMenuLabel className="text-xs uppercase tracking-wide text-zinc-400">
          {spanish ? 'Seleccionar protocolo' : 'Select protocol'}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/10" />
        {protocols.map(({ id, label, Icon, color, description }) => (
          <DropdownMenuItem
            key={id}
            aria-label={label}
            disabled={id === 'grpc' && !grpcEnabled}
            onSelect={() => onSelect(id)}
            className="cursor-pointer gap-3 rounded-md px-3 py-2.5 focus:bg-yellow-400/10 focus:text-white data-highlighted:bg-yellow-400/10 data-highlighted:text-white"
          >
            <Icon className={'h-4 w-4 ' + color} />
            <div className="flex flex-col">
              <span className="font-medium">{label}</span>
              <span className="text-xs text-zinc-500">
                {id === 'grpc' && !grpcEnabled
                  ? spanish
                    ? 'Requiere Studio compatible'
                    : 'Requires compatible Studio'
                  : description}
              </span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

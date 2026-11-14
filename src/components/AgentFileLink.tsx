import type { ComponentProps } from 'react';
import { agentFileUrl } from '../utils/agentTransport';

// A link to a file that the Relampo backend serves: a report or a download.
// ponytail: it renders a plain <a href>, which needs a transport with a direct
// URL. A transport without one (the relay) must fetch the file with
// agentRequest here and hand the browser a blob URL.
export function AgentFileLink({ path, ...anchor }: Omit<ComponentProps<'a'>, 'href'> & { path: string }) {
  return (
    <a
      href={agentFileUrl(path) ?? undefined}
      {...anchor}
    />
  );
}

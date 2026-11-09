export interface CorrelateDocument {
  yaml: string;
  fileName: string;
  revision: number;
}
type Channel = Pick<BroadcastChannel, 'postMessage' | 'onmessage' | 'close'>;
export function createCorrelateSource(
  current: () => CorrelateDocument,
  update: (yaml: string, fileName: string) => Promise<void> | void,
  factory: (name: string) => Channel = name => new BroadcastChannel(name),
  onClose: () => void = () => {},
) {
  let channel: Channel | null = null;
  let baseline: CorrelateDocument;
  let committed = '';
  let committing = false;
  const close = () => {
    channel?.close();
    channel = null;
    onClose();
  };
  return {
    connect: (session: string) => {
      baseline = { ...current() };
      channel = factory('relampo-correlate-v1-' + session);
      channel.onmessage = async event => {
        const message = event.data;
        if (message?.kind === 'ready') {
          channel?.postMessage({ kind: 'source', document: baseline });
          return;
        }
        if (message?.kind === 'bye') {
          close();
          return;
        }
        if (
          message?.kind !== 'commit' ||
          typeof message.requestId !== 'string' ||
          typeof message.yaml !== 'string' ||
          typeof message.fileName !== 'string' ||
          message.yaml.length > 16 * 1024 * 1024
        )
          return;
        if (committed === message.requestId) {
          channel?.postMessage({ kind: 'committed', requestId: message.requestId });
          return;
        }
        const now = current();
        if (
          committing ||
          now.yaml !== baseline.yaml ||
          now.fileName !== baseline.fileName ||
          now.revision !== baseline.revision
        ) {
          channel?.postMessage({ kind: 'conflict', requestId: message.requestId });
          return;
        }
        committing = true;
        try {
          await update(message.yaml, message.fileName);
          committed = message.requestId;
          channel?.postMessage({ kind: 'committed', requestId: message.requestId });
        } catch {
          channel?.postMessage({ kind: 'failed', requestId: message.requestId });
        } finally {
          committing = false;
        }
      };
    },
    close,
  };
}

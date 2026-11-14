import { useAgentState } from '../hooks/useAgentState';
import { agentUnavailableText, retryRelay } from '../utils/agentHost';

/**
 * Says why the machine is not available. After a connection that the relay
 * refused, "Retry" lets Studio ask for one new ticket.
 */
export function AgentUnavailableNotice({ language }: { language: string }) {
  const state = useAgentState();
  if (state?.connected !== false) return null;
  return (
    <div
      role="status"
      className="flex shrink-0 items-center gap-3 bg-amber-500/10 px-4 py-2 text-xs text-amber-300"
    >
      <span>{agentUnavailableText(language)}</span>
      {state.reason === 'refused' && (
        <button
          type="button"
          className="rounded border border-amber-300/40 px-2 py-0.5 hover:bg-amber-300/10"
          onClick={retryRelay}
        >
          {language === 'es' ? 'Reintentar' : 'Retry'}
        </button>
      )}
    </div>
  );
}

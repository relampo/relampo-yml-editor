import { useSyncExternalStore } from 'react';
import { getAgentState, subscribeAgentState, type AgentState } from '../utils/agentHost';

/** The state of the customer's machine, from the web app. Null outside the web app or before its first message. */
export function useAgentState(): AgentState | null {
  return useSyncExternalStore(subscribeAgentState, getAgentState);
}

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getOwnerPortfolioAgentDetail } from '@renderer/features/portfolio/portfolio-client.js';

export type AgentDetailReadScope = 'owner';

export function ownerAgentDetailQueryKey(agentId: string): readonly unknown[] {
  return ['realm-agent-studio', 'owner-portfolio-agent-detail', agentId] as const;
}

export function ownerPortfolioListQueryKey(): readonly unknown[] {
  return ['realm-agent-studio', 'owner-portfolio'] as const;
}

export function agentDetailQueryKey(agentId: string, _scope: AgentDetailReadScope): readonly unknown[] {
  return ownerAgentDetailQueryKey(agentId);
}

export function useAgentDetailQuery(agentId: string, scope: AgentDetailReadScope = 'owner') {
  return useQuery({
    queryKey: agentDetailQueryKey(agentId, scope),
    queryFn: () => getOwnerPortfolioAgentDetail(agentId),
    enabled: agentId.length > 0,
  });
}

export function useOwnerAgentDetailQuery(agentId: string) {
  return useAgentDetailQuery(agentId, 'owner');
}

export function useRefreshAgentReads(agentId: string, scope: AgentDetailReadScope = 'owner') {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: agentDetailQueryKey(agentId, scope) }),
      queryClient.invalidateQueries({ queryKey: ownerPortfolioListQueryKey() }),
    ]);
  };
}

export function useRefreshOwnerAgentReads(agentId: string) {
  return useRefreshAgentReads(agentId, 'owner');
}

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getOwnerPortfolioAgentDetail } from '@renderer/features/portfolio/portfolio-client.js';

export function ownerAgentDetailQueryKey(agentId: string): readonly unknown[] {
  return ['realm-agent-studio', 'owner-portfolio-agent-detail', agentId] as const;
}

export function ownerPortfolioListQueryKey(): readonly unknown[] {
  return ['realm-agent-studio', 'owner-portfolio'] as const;
}

export function useOwnerAgentDetailQuery(agentId: string) {
  return useQuery({
    queryKey: ownerAgentDetailQueryKey(agentId),
    queryFn: () => getOwnerPortfolioAgentDetail(agentId),
    enabled: agentId.length > 0,
  });
}

export function useRefreshOwnerAgentReads(agentId: string) {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ownerAgentDetailQueryKey(agentId) }),
      queryClient.invalidateQueries({ queryKey: ownerPortfolioListQueryKey() }),
    ]);
  };
}

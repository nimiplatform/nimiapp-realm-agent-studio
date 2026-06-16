import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getForgeImportedSystemPortfolioAgentDetail,
  getOwnerPortfolioAgentDetail,
} from '@renderer/features/portfolio/portfolio-client.js';

export type AgentDetailReadScope = 'owner' | 'forge-imported-system';

export function ownerAgentDetailQueryKey(agentId: string): readonly unknown[] {
  return ['realm-agent-studio', 'owner-portfolio-agent-detail', agentId] as const;
}

export function ownerPortfolioListQueryKey(): readonly unknown[] {
  return ['realm-agent-studio', 'owner-portfolio'] as const;
}

export function curationAgentDetailQueryKey(agentId: string): readonly unknown[] {
  return ['realm-agent-studio', 'forge-imported-system-agent-detail', agentId] as const;
}

export function curationPortfolioListQueryKey(): readonly unknown[] {
  return ['realm-agent-studio', 'forge-imported-system-portfolio'] as const;
}

export function agentDetailQueryKey(agentId: string, scope: AgentDetailReadScope): readonly unknown[] {
  return scope === 'forge-imported-system'
    ? curationAgentDetailQueryKey(agentId)
    : ownerAgentDetailQueryKey(agentId);
}

export function useAgentDetailQuery(agentId: string, scope: AgentDetailReadScope = 'owner') {
  return useQuery({
    queryKey: agentDetailQueryKey(agentId, scope),
    queryFn: () => scope === 'forge-imported-system'
      ? getForgeImportedSystemPortfolioAgentDetail(agentId)
      : getOwnerPortfolioAgentDetail(agentId),
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
      queryClient.invalidateQueries({
        queryKey: scope === 'forge-imported-system'
          ? curationPortfolioListQueryKey()
          : ownerPortfolioListQueryKey(),
      }),
    ]);
  };
}

export function useRefreshOwnerAgentReads(agentId: string) {
  return useRefreshAgentReads(agentId, 'owner');
}

export function useRefreshCurationAgentReads(agentId: string) {
  return useRefreshAgentReads(agentId, 'forge-imported-system');
}

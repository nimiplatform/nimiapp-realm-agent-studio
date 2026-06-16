import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const detailQuerySource = () =>
  readFileSync(join(process.cwd(), 'src/shell/renderer/features/agent-detail/use-agent-detail-query.ts'), 'utf8');

describe('agent detail query boundaries', () => {
  it('uses distinct owner and Forge-imported system detail queries', () => {
    const source = detailQuerySource();

    expect(source).toContain('getOwnerPortfolioAgentDetail');
    expect(source).toContain('getForgeImportedSystemPortfolioAgentDetail');
    expect(source).toContain('ownerAgentDetailQueryKey');
    expect(source).toContain('curationAgentDetailQueryKey');
    expect(source).toContain('curationPortfolioListQueryKey');
    expect(source).not.toContain('getRealmAgentStudioPortfolioAgentDetail');
  });
});

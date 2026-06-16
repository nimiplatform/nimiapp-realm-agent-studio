import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const agentListSource = () =>
  readFileSync(join(process.cwd(), 'src/shell/renderer/features/agent-list/agent-list-page.tsx'), 'utf8');

describe('agent list read boundaries', () => {
  it('keeps owner portfolio list reads separate from system curation reads', () => {
    const source = agentListSource();

    expect(source).toContain('listOwnerPortfolioAgents');
    expect(source).toContain('listForgeImportedSystemPortfolioAgents');
    expect(source).toContain('queryFn: () => listOwnerPortfolioAgents()');
    expect(source).toContain('queryFn: () => listForgeImportedSystemPortfolioAgents()');
    expect(source).toContain('HTTP_');
    expect(source).toContain('System curation unavailable for this Runtime account.');
    expect(source).not.toContain('listRealmAgentStudioPortfolioAgents');
    expect(source).not.toContain('Owner-created agents and admitted Forge-imported system agents');
    expect(source).not.toContain('Realm returned no owner-created agents or admitted Forge-imported system agents');
  });
});

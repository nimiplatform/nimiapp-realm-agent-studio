import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const agentListSource = () =>
  readFileSync(join(process.cwd(), 'src/shell/renderer/features/agent-list/agent-list-page.tsx'), 'utf8');

describe('agent list read boundaries', () => {
  it('keeps owner portfolio list reads owner-only', () => {
    const source = agentListSource();

    expect(source).toContain('listOwnerPortfolioAgents');
    expect(source).toContain('queryFn: () => listOwnerPortfolioAgents()');
    expect(source).not.toContain('listForgeImportedSystemPortfolioAgents');
    expect(source).not.toContain('queryFn: () => listForgeImportedSystemPortfolioAgents()');
    expect(source).not.toContain('System curation unavailable for this Runtime account.');
    expect(source).not.toContain('CurationAgentListPage');
  });
});

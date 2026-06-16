import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const routesSource = () =>
  readFileSync(join(process.cwd(), 'src/shell/renderer/app-shell/routes.tsx'), 'utf8');

describe('Studio route boundaries', () => {
  it('keeps Realm Agent Studio routes owner-only', () => {
    const source = routesSource();

    expect(source).toContain('path="/portfolio"');
    expect(source).toContain('path="/portfolio/:agentId/posts"');
    expect(source).toContain('path="/portfolio/:agentId/posts/schedule"');
    expect(source).not.toContain('path="/worlds"');
    expect(source).not.toContain('path="/creator-agents/:agentId"');
    expect(source).not.toContain('path="/curation/forge-imported-system"');
    expect(source).not.toContain('path="/curation/forge-imported-system/:agentId/posts"');
    expect(source).not.toContain('path="/curation/forge-imported-system/:agentId/posts/schedule"');
    expect(source).not.toContain('path="/curation/forge-imported-system/:agentId/settings/review"');
  });
});

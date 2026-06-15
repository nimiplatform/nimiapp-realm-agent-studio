import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('studio platform runtime auth boundary', () => {
  it('uses developer-registered Runtime auth without raw Realm token transport', () => {
    const studioPlatformSource = readFileSync(
      join(process.cwd(), 'src/shell/renderer/app-shell/studio-platform.ts'),
      'utf8',
    );
    const bootstrapSource = readFileSync(
      join(process.cwd(), 'src/shell/renderer/infra/studio-bootstrap.ts'),
      'utf8',
    );
    const viteConfigSource = readFileSync(
      join(process.cwd(), 'vite.config.ts'),
      'utf8',
    );
    const stylesSource = readFileSync(
      join(process.cwd(), 'src/shell/renderer/styles.css'),
      'utf8',
    );
    const combined = `${studioPlatformSource}\n${bootstrapSource}`;

    expect(studioPlatformSource).toContain('createNimiDeveloperRegisteredRuntimeAccountCaller');
    expect(studioPlatformSource).toContain('createNimiRuntimeAppSessionMetadataProvider');
    expect(studioPlatformSource).toContain('createNimiRuntimeFullAppRegistration');
    expect(studioPlatformSource).toContain("realm: false");
    expect(studioPlatformSource).toContain("'nimi.realm-agent-studio'");
    expect(studioPlatformSource).toContain('.local-developer');
    expect(studioPlatformSource).not.toContain('createNimiLocalFirstPartyRuntimeAccountCaller');
    expect(studioPlatformSource).not.toContain('getAccessToken');
    expect(studioPlatformSource).not.toContain('createRealmFetchTransport');
    expect(studioPlatformSource).not.toContain('authorization: `Bearer');
    expect(studioPlatformSource).not.toContain('local-first-party');
    expect(combined).not.toContain('DEFAULT_REALM_BASE_URL');
    expect(combined).not.toContain('localhost:3002');
    expect(combined).not.toContain('VITE_NIMI_REALM_BASE_URL');
    expect(combined).not.toContain('VITE_REALM_BASE_URL');
    expect(combined).not.toContain('NIMI_REALM_URL');
    expect(combined).not.toContain('resolveStudioRealmBaseUrl');
    expect(viteConfigSource).toContain("find: /^@nimiplatform\\/sdk\\/runtime$/");
    expect(viteConfigSource).toContain("replacement: path.resolve(nimiSdkSourceRoot, 'runtime/index.ts')");
    expect(viteConfigSource).toContain("find: /^@nimiplatform\\/kit\\/shell\\/renderer\\/bootstrap$/");
    expect(viteConfigSource).toContain("replacement: path.resolve(nimiKitSourceRoot, 'shell/renderer/src/bootstrap/index.ts')");
    expect(viteConfigSource).toContain('exclude: [');
    expect(viteConfigSource).toContain("'@nimiplatform/sdk/runtime'");
    expect(viteConfigSource).toContain("'@nimiplatform/kit/shell/renderer/bootstrap'");
    expect(viteConfigSource).not.toMatch(/include:\s*\[[^\]]*'@nimiplatform\/sdk\/runtime'/);
    expect(viteConfigSource).not.toMatch(/include:\s*\[[^\]]*'@nimiplatform\/kit\/shell\/renderer\/bootstrap'/);
    expect(stylesSource).toContain('@source "../../../../../nimi-realm/nimi/kit/**/*.{ts,tsx}";');
    expect(stylesSource).not.toContain('@nimiplatform/kit/dist');
  });
});

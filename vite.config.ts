import { defineConfig } from 'vite';
import path from 'node:path';
import { createRequire } from 'node:module';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const require = createRequire(import.meta.url);

function isNodePackage(normalizedId: string, packageName: string): boolean {
  return (
    normalizedId.includes(`/node_modules/.pnpm/${packageName}@`)
    || normalizedId.includes(`/node_modules/${packageName}/`)
  );
}

export default defineConfig(() => {
  return {
    root: path.resolve(__dirname, 'src/shell/renderer'),
    envDir: __dirname,
    envPrefix: ['VITE_', 'NIMI_'],
    define: {
      'globalThis.__NIMI_IMPORT_META_ENV__': 'import.meta.env',
      'import.meta.env.VITE_NIMI_SHELL_MODE': JSON.stringify('realm-agent-studio'),
    },
    publicDir: false as const,
    resolve: {
      dedupe: [
        'react',
        'react-dom',
        'react-i18next',
        'react-router-dom',
        'scheduler',
        'zustand',
        '@nimiplatform/sdk',
      ],
      alias: [
        { find: 'react/jsx-dev-runtime', replacement: path.resolve(__dirname, 'node_modules/react/jsx-dev-runtime.js') },
        { find: 'react/jsx-runtime', replacement: path.resolve(__dirname, 'node_modules/react/jsx-runtime.js') },
        { find: 'react-dom/client', replacement: path.resolve(__dirname, 'node_modules/react-dom/client.js') },
        { find: 'react-dom', replacement: path.resolve(__dirname, 'node_modules/react-dom/index.js') },
        { find: 'react', replacement: path.resolve(__dirname, 'node_modules/react/index.js') },
        { find: 'scheduler', replacement: require.resolve('scheduler') },
        { find: '@tauri-apps/api/core', replacement: path.resolve(__dirname, 'node_modules/@tauri-apps/api/core.js') },
        { find: '@renderer', replacement: path.resolve(__dirname, 'src/shell/renderer') },
      ],
    },
    plugins: [react(), tailwindcss()],
    optimizeDeps: {
      // Force pre-bundling of the heavy kit + sdk surfaces on first cold
      // start. Without this, vite waits until a runtime import touches one
      // of these packages, then re-bundles and triggers a full page reload
      // — which the Tauri webview experiences as a multi-second white
      // screen. Listing the entry points here lets vite warm the dep cache
      // (`node_modules/.vite/deps`) up-front in a single pass.
      include: [
        '@nimiplatform/kit/ui',
        '@nimiplatform/kit/auth',
        '@nimiplatform/kit/shell/renderer/bridge',
        '@nimiplatform/sdk',
        '@nimiplatform/sdk/realm',
        '@nimiplatform/sdk/runtime',
        '@tanstack/react-query',
        'react-router-dom',
        'zustand',
        'lucide-react',
      ],
    },
    server: {
      host: '127.0.0.1',
      port: 1450,
      strictPort: true,
      fs: {
        allow: [path.resolve(__dirname)],
      },
    },
    build: {
      outDir: path.resolve(__dirname, 'dist'),
      emptyOutDir: true,
      sourcemap: true,
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'src/shell/renderer/index.html'),
        },
        output: {
          manualChunks(id) {
            const normalizedId = id.split(path.sep).join('/');

            if (normalizedId.includes('/@nimiplatform/sdk/')) {
              if (normalizedId.includes('/runtime/generated/')) return 'sdk-runtime-generated';
              if (normalizedId.includes('/realm/generated/')) return 'sdk-realm-generated';
              return 'sdk-client';
            }
            if (normalizedId.includes('/@nimiplatform/kit/')) {
              return 'vendor-platform';
            }
            if (!normalizedId.includes('node_modules')) {
              return undefined;
            }
            if (
              isNodePackage(normalizedId, 'react')
              || isNodePackage(normalizedId, 'react-dom')
              || isNodePackage(normalizedId, 'scheduler')
              || isNodePackage(normalizedId, 'use-sync-external-store')
            ) {
              return 'vendor-react';
            }
            if (
              isNodePackage(normalizedId, 'react-router-dom')
              || isNodePackage(normalizedId, 'react-router')
              || isNodePackage(normalizedId, '@remix-run/router')
            ) {
              return 'vendor-router';
            }
            if (
              isNodePackage(normalizedId, '@tanstack/react-query')
              || isNodePackage(normalizedId, '@tanstack/query-core')
            ) {
              return 'vendor-query';
            }
            if (isNodePackage(normalizedId, 'zustand')) {
              return 'vendor-state';
            }
            if (
              isNodePackage(normalizedId, 'i18next')
              || isNodePackage(normalizedId, 'react-i18next')
            ) {
              return 'vendor-i18n';
            }
            if (isNodePackage(normalizedId, '@tauri-apps/api')) {
              return 'vendor-tauri';
            }
            if (isNodePackage(normalizedId, 'lucide-react')) {
              return 'vendor-icons';
            }
            return 'vendor-misc';
          },
        },
      },
    },
  };
});

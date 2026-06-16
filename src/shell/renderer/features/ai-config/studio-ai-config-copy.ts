import { translateStudioExternalCopy } from '@renderer/i18n/studio-i18n.js';

export function translateStudioModelConfigCopy(
  key: string,
  vars?: Readonly<Record<string, string | number | undefined>>,
): string {
  const defaultValue = typeof vars?.defaultValue === 'string' ? vars.defaultValue : undefined;
  return translateStudioExternalCopy(key, {
    defaultValue,
    ...vars,
  });
}

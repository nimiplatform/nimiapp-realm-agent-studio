import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  currentStudioLocale,
  normalizeStudioLocale,
  studioI18n,
  translateStudioCopy,
  type StudioLocale,
  type StudioTranslateOptions,
} from './studio-i18n.js';
import type { StudioCopyKey } from './studio-copy.js';

export function useStudioI18n() {
  const { i18n } = useTranslation();
  const locale = normalizeStudioLocale(i18n.language) ?? currentStudioLocale();
  const t = useCallback(
    (key: StudioCopyKey, options?: StudioTranslateOptions) => translateStudioCopy(key, options),
    [locale],
  );
  const setLocale = useCallback(async (nextLocale: StudioLocale) => {
    await studioI18n.changeLanguage(nextLocale);
  }, []);

  return {
    locale,
    setLocale,
    t,
  };
}

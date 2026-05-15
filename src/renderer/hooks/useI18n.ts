import { useCallback } from 'react';
import { zhCN } from '../locales/zh-CN';
import { enUS } from '../locales/en-US';

type Locale = 'zh_CN' | 'en_US';

type TranslationKey = string;

const locales: Record<Locale, Record<string, string>> = {
  zh_CN: zhCN,
  en_US: enUS,
};

export function useI18n(locale: Locale = 'zh_CN') {
  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>): string => {
      const translations = locales[locale] || locales.zh_CN;
      let text = translations[key] || key;

      if (params) {
        Object.entries(params).forEach(([paramKey, value]) => {
          text = text.replace(`{${paramKey}}`, String(value));
        });
      }

      return text;
    },
    [locale]
  );

  return { t, locale };
}

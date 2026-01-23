import i18next from 'i18next';
import type { i18n, TOptions } from 'i18next';
import { app } from 'electron';
import { resources } from '../../locales/index.js';

function resolveLanguageFromLocale(locale: string): string {
  const normalized = locale?.toLowerCase() ?? '';
  return normalized.startsWith('zh') ? 'zh-CN' : 'en';
}

/**
 * Initialize i18next instance for Electron main process
 * Detects system language and configures i18next accordingly
 */
export function initI18n(): i18n {
  // Get system locale from Electron
  const locale = app.getLocale();

  // Map locale to our supported languages
  // Electron returns different formats on different platforms:
  // - macOS: 'zh-CN', 'en-US'
  // - Windows: 'zh-CN', 'en-US'
  // - Linux: 'zh_CN', 'en_US'
  const language = resolveLanguageFromLocale(locale);

  // Create and configure i18next instance
  const instance = i18next.createInstance();
  instance.init({
    lng: language,
    fallbackLng: 'en',
    resources,
    ns: ['ui', 'main', 'common'],
    defaultNS: 'main',
    interpolation: {
      escapeValue: false // Not needed for React
    },
    saveMissing: false // Set to true in development to log missing keys
  });

  return instance;
}

// Singleton instance
let i18nInstance: i18n | null = null;

/**
 * Get or create the i18n singleton instance
 */
export function getI18n(): i18n {
  if (!i18nInstance) {
    i18nInstance = initI18n();
  }
  return i18nInstance;
}

/**
 * Get the current language code
 */
export function getLanguage(): string {
  const lang = getI18n().language ?? resolveLanguageFromLocale(app.getLocale());
  return lang;
}

/**
 * Translate a key using i18next (convenience function)
 */
export function t(key: string, options?: TOptions): string {
  return getI18n().t(key, options) as string;
}

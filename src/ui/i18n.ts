import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { resources } from '../../locales/index';

/**
 * Initialize i18next for React UI layer
 * Gets language from main process via IPC
 */
export async function initI18n(): Promise<typeof i18n> {
  // Get language from main process with fallback
  let language = 'en'; // Default fallback
  try {
    language = await window.electron.getLanguage();
  } catch (error) {
    console.warn('Failed to get language from main process, using default (en):', error);
  }

  // Initialize i18next with react-i18next plugin
  await i18n
    .use(initReactI18next)
    .init({
      lng: language,
      fallbackLng: 'en',
      resources,
      ns: ['ui', 'main', 'common'],
      defaultNS: 'ui',
      interpolation: {
        escapeValue: false // React already escapes values
      },
      react: {
        useSuspense: false // Disable suspense for simplicity
      }
    });

  return i18n;
}

export default i18n;
